import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { createMessageReaction } from "../http/create-message-reaction";
import { removeMessageReaction } from "../http/remove-message-reaction";

interface MessageProps {
  id: string;
  text: string;
  amoutOfReactions: number;
  answered?: boolean;
}

export function Message({
  id,
  text,
  amoutOfReactions,
  answered = false,
}: MessageProps) {
  const [hasReacted, setHasReacted] = useState(false);
  const { roomId } = useParams();

  if (!roomId) {
    throw new Error("MessageList component must be used within room page");
  }

  async function handleReactToMessage() {
    if (!roomId) return;

    try {
      await createMessageReaction({ roomId, messageId: id });
      setHasReacted(true);
    } catch {
      toast.error("Falha ao curtir mensagem");
    }
  }

  async function handleRemoveReactionFromMessage() {
    if (!roomId) return;

    try {
      await removeMessageReaction({ roomId, messageId: id });
      setHasReacted(false);
    } catch {
      toast.error("Falha ao remover curtida da mensagem");
    }
  }

  return (
    <li
      data-answered={answered}
      className="ml-4 leading-relaxed text-zinc-100 data-[answered=true]:opacity-50 data-[answered=true]:pointer-events-none"
    >
      {text}
      {hasReacted ? (
        <button
          type="button"
          className="mt-3 flex items-center gap-2 text-orange-400 text-sm font-medium hover:text-orange-500"
          onClick={handleRemoveReactionFromMessage}
        >
          Curtir pergunta ({amoutOfReactions})
          <ArrowUp className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          className="mt-3 flex items-center gap-2 text-zinc-400 text-sm font-medium hover:text-zinc-300"
          onClick={handleReactToMessage}
        >
          Curtir pergunta ({amoutOfReactions})
          <ArrowUp className="size-4" />
        </button>
      )}
    </li>
  );
}
