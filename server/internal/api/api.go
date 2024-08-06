package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"sync"

	"github.com/ErickMachado/ask-me-anything/internal/store/pgstore"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

type APIHandler struct {
	q           *pgstore.Queries
	r           *chi.Mux
	upgrader    websocket.Upgrader
	subscribers map[uuid.UUID]map[*websocket.Conn]context.CancelFunc
	mutex       *sync.Mutex
}

func (h APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.r.ServeHTTP(w, r)
}

func NewHandler(q *pgstore.Queries) http.Handler {
	h := APIHandler{
		q: q,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		subscribers: map[uuid.UUID]map[*websocket.Conn]context.CancelFunc{},
		mutex:       &sync.Mutex{},
	}
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.Recoverer, middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/subscribers/{room_id}", h.subscribe)
	r.Route("/api", func(r chi.Router) {
		r.Route("/rooms", func(r chi.Router) {
			r.Post("/", h.createRoom)
			r.Get("/", h.getRooms)

			r.Route("/{room_id}/messages", func(r chi.Router) {
				r.Get("/", h.getRoomMessages)
				r.Post("/", h.createRoomMessage)

				r.Route("/{message_id}", func(r chi.Router) {
					r.Get("/", h.getRoomMessage)
					r.Patch("/reactions", h.reactToMessage)
					r.Delete("/reactions", h.removeReactionFromMessage)
					r.Patch("/answers", h.markMessageAsAswered)
				})
			})
		})
	})

	h.r = r

	return r
}

type MessageKind string

const (
	MessageKindCreated MessageKind = "message_created"
)

type MessageCreatedContent struct {
	ID      string `json:"id"`
	Message string `json:"message"`
}

type Message struct {
	Kind   MessageKind `json:"kind"`
	Value  any         `json:"value"`
	RoomID uuid.UUID   `json:"-"`
}

func (h *APIHandler) notifyClients(msg Message) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	subscribers, ok := h.subscribers[msg.RoomID]
	if !ok || len(subscribers) == 0 {
		return
	}

	for conn, cancel := range subscribers {
		if err := conn.WriteJSON(msg); err != nil {
			slog.Warn("failed to send message to client", "error", err)
			cancel()
		}
	}
}

func (h *APIHandler) subscribe(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(chi.URLParam(r, "room_id"))
	if err != nil {
		http.Error(w, "invalid room ID", http.StatusBadRequest)
		return
	}

	_, err = h.q.GetRoom(r.Context(), roomID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "room not found", http.StatusBadRequest)
		} else {
			http.Error(w, "something went wrong", http.StatusInternalServerError)
		}

		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Warn("failed to upgrade connection", "error", err)
		http.Error(w, "failed to upgrade to ws connection", http.StatusBadRequest)
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(r.Context())

	h.mutex.Lock()
	if _, ok := h.subscribers[roomID]; !ok {
		h.subscribers[roomID] = make(map[*websocket.Conn]context.CancelFunc)
	}
	slog.Info("new client connected", "room_id", roomID, "client_ip", r.RemoteAddr)
	h.subscribers[roomID][conn] = cancel
	h.mutex.Unlock()

	<-ctx.Done()

	h.mutex.Lock()
	delete(h.subscribers[roomID], conn)
	h.mutex.Unlock()
}

type createRoomBody struct {
	Theme string `json:"theme"`
}

type createRoomResponse struct {
	ID string `json:"id"`
}

func (h *APIHandler) createRoom(w http.ResponseWriter, r *http.Request) {
	var body createRoomBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	roomID, err := h.q.InsertRoom(r.Context(), body.Theme)
	if err != nil {
		slog.Error("failed to insert room", "error", err)
		http.Error(w, "something went wrong", http.StatusInternalServerError)
		return
	}

	data, _ := json.Marshal(createRoomResponse{
		ID: roomID.String(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(data)
}

func (h *APIHandler) getRooms(w http.ResponseWriter, r *http.Request) {}

func (h *APIHandler) getRoomMessages(w http.ResponseWriter, r *http.Request) {}

func (h *APIHandler) getRoomMessage(w http.ResponseWriter, r *http.Request) {}

type createMessageBody struct {
	Message string `json:"message"`
}

type createMessageResponse struct {
	ID string `json:"id"`
}

func (h *APIHandler) createRoomMessage(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(chi.URLParam(r, "room_id"))
	if err != nil {
		http.Error(w, "invalid room ID", http.StatusBadRequest)
		return
	}

	var body createMessageBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	messageID, err := h.q.InsertMessage(r.Context(), pgstore.InsertMessageParams{
		RoomID:  roomID,
		Message: body.Message,
	})
	if err != nil {
		slog.Error("failed to insert message", "error", err)
		http.Error(w, "something went wrong", http.StatusInternalServerError)
		return
	}

	data, _ := json.Marshal(createMessageResponse{
		ID: messageID.String(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(data)

	go h.notifyClients(Message{
		Kind: MessageKindCreated,
		Value: MessageCreatedContent{
			ID:      messageID.String(),
			Message: body.Message,
		},
		RoomID: roomID,
	})
}

func (h *APIHandler) reactToMessage(w http.ResponseWriter, r *http.Request) {}

func (h *APIHandler) removeReactionFromMessage(w http.ResponseWriter, r *http.Request) {}

func (h *APIHandler) markMessageAsAswered(w http.ResponseWriter, r *http.Request) {}
