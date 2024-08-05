package api

import (
	"net/http"

	"github.com/ErickMachado/ask-me-anything/internal/store/pgstore"
	"github.com/go-chi/chi"
)

type APIHandler struct {
	q *pgstore.Queries
	r *chi.Mux
}

func (h APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.r.ServeHTTP(w, r)
}

func NewHandler(q *pgstore.Queries) http.Handler {
	a := APIHandler{q: q}
	r := chi.NewRouter()

	a.r = r

	return r
}
