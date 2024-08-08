import { ArrowRight } from "lucide-react";
import { useParams } from "react-router-dom";
import { createMessage } from "../http/create-message";
import { toast } from "sonner";

export function CreateMessageForm() {
  const { roomId } = useParams();

  if (!roomId) {
    throw new Error("MessageList component must be used within room page");
  }

  async function handleMessageCreate(form: FormData) {
    const message = form.get("message")?.toString();

    if (!message || !roomId) return;

    try {
      await createMessage({ roomId, message });
    } catch {
      toast.error("Falha ao enviar pergunta");
    }
  }

  return (
    <form
      action={handleMessageCreate}
      className="flex items-center gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800 focus-within:ring-1 ring-orange-400 ring-offset-4 ring-offset-zinc-950"
    >
      <input
        className="flex-1 text-small bg-transparent mx-2 outline-none placeholder:text-zinc-500 text-zinc-100"
        autoComplete="off"
        type="text"
        name="message"
        placeholder="Qual a sua pergunta?"
      />
      <button className="bg-orange-400 text-orange-950 px-3 py-1.5 gap-1.5 flex items-center rounded-lg font-medium text-sm hover:bg-orange-500 transition-colors">
        Criar pergunta
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
