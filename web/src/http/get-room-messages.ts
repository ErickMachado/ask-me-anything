interface GetRoomMessagesRequest {
  roomId: string;
}

interface ApiMessage {
  id: string;
  room_id: string;
  message: string;
  reaction_count: number;
  answered: boolean;
}

export interface GetRoomMessagesResponse {
  messages: {
    answered: boolean;
    id: string;
    text: string;
    amountOfReactions: number;
  }[];
}

export async function getRoomMessages({
  roomId,
}: GetRoomMessagesRequest): Promise<GetRoomMessagesResponse> {
  const response = await fetch(
    `${import.meta.env.VITE_APP_API_URL}/rooms/${roomId}/messages`
  );
  const data: { messages: ApiMessage[] | null } = await response.json();

  return {
    messages:
      data.messages?.map((message) => ({
        answered: message.answered,
        id: message.id,
        text: message.message,
        amountOfReactions: message.reaction_count,
      })) ?? [],
  };
}
