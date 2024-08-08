import { useEffect } from "react";
import { GetRoomMessagesResponse } from "../http/get-room-messages";
import { useQueryClient } from "@tanstack/react-query";

interface UseMessagesWebsocketParams {
  roomId: string;
}

type WebsocketMessage =
  | { kind: "message_created"; value: { id: string; message: string } }
  | { kind: "message_answered"; value: { id: string } }
  | {
      kind: "message_reaction_created";
      value: { id: string; reactions: number };
    }
  | {
      kind: "message_reaction_deleted";
      value: { id: string; reactions: number };
    };

export function useMessagesWebsocket({ roomId }: UseMessagesWebsocketParams) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/subscribers/${roomId}`);

    ws.onopen = () => {
      console.log("Websocket connected");
    };

    ws.onclose = () => {
      console.log("Websocket connection closed");
    };

    ws.onmessage = (event) => {
      const data: WebsocketMessage = JSON.parse(event.data);

      console.log(data);

      switch (data.kind) {
        case "message_created":
          queryClient.setQueryData<GetRoomMessagesResponse>(
            ["messages", roomId],
            (state) => {
              return {
                messages: [
                  ...(state?.messages ?? []),
                  {
                    id: data.value.id,
                    text: data.value.message,
                    amountOfReactions: 0,
                    answered: false,
                  },
                ],
              };
            }
          );

          break;
        case "message_answered":
          queryClient.setQueryData<GetRoomMessagesResponse>(
            ["messages", roomId],
            (state) => {
              if (!state) {
                return undefined;
              }

              return {
                messages: state.messages.map((message) => {
                  if (message.id === data.value.id) {
                    return {
                      ...message,
                      answered: true,
                    };
                  }

                  return message;
                }),
              };
            }
          );

          break;
        case "message_reaction_deleted":
        case "message_reaction_created":
          queryClient.setQueryData<GetRoomMessagesResponse>(
            ["messages", roomId],
            (state) => {
              if (!state) {
                return undefined;
              }

              return {
                messages: state.messages.map((message) => {
                  if (message.id === data.value.id) {
                    return {
                      ...message,
                      amountOfReactions: data.value.reactions,
                    };
                  }

                  return message;
                }),
              };
            }
          );

          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [roomId]);
}
