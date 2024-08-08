import { useParams } from "react-router-dom";
import { Message } from "./message";
import { getRoomMessages } from "../http/get-room-messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMessagesWebsocket } from "../hooks/use-messages-ws";

export function MessageList() {
  const { roomId } = useParams();

  if (!roomId) {
    throw new Error("MessageList component must be used within room page");
  }

  const { data } = useSuspenseQuery({
    queryKey: ["messages", roomId],
    queryFn: () => getRoomMessages({ roomId }),
  });

  useMessagesWebsocket({ roomId });

  const sortedMessages = data.messages.sort(
    (a, b) => b.amountOfReactions - a.amountOfReactions
  );

  return (
    <ol className="list-decimal list-outside px-3 space-y-8">
      {sortedMessages.map(({ id, text, amountOfReactions, answered }) => (
        <Message
          key={id}
          id={id}
          text={text}
          amoutOfReactions={amountOfReactions}
          answered={answered}
        />
      ))}
    </ol>
  );
}
