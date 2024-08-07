import { useParams } from "react-router-dom";
import amaLogo from "../assets/ama-logo.svg";
import { ArrowRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Message } from "../components/message";

export function Room() {
  const params = useParams();

  function copyRoomId() {
    const url = window.location.href.toString();

    if (navigator.share !== undefined && navigator.canShare()) {
      navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      toast("O link da sala foi copiado para sua área de transferência");
    }
  }

  return (
    <div className="mx-auto max-w-[640px] flex flex-col gap-6 py-10 px-4">
      <div className="flex items-center gap-3 px-3">
        <img src={amaLogo} alt="AMA logo" className="h-5" />
        <span className="text-sm text-zinc-500 truncate">
          Código da sala: <span className="text-zinc-300">{params.roomId}</span>
        </span>
        <button
          onClick={copyRoomId}
          className="ml-auto bg-zinc-800 text-zinc-300 px-3 py-1.5 gap-1.5 flex items-center rounded-lg font-medium text-sm hover:bg-zinc-700 transition-colors"
        >
          Compartilhar
          <Share2 className="size-4" />
        </button>
      </div>
      <div className="h-px w-full bg-zinc-900" />
      <form className="flex items-center gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800 focus-within:ring-1 ring-orange-400 ring-offset-4 ring-offset-zinc-950">
        <input
          className="flex-1 text-small bg-transparent mx-2 outline-none placeholder:text-zinc-500 text-zinc-100"
          autoComplete="off"
          type="text"
          name="theme"
          placeholder="Qual a sua pergunta?"
        />
        <button className="bg-orange-400 text-orange-950 px-3 py-1.5 gap-1.5 flex items-center rounded-lg font-medium text-sm hover:bg-orange-500 transition-colors">
          Criar pergunta
          <ArrowRight className="size-4" />
        </button>
      </form>
      <ol className="list-decimal list-outside px-3 space-y-8">
        <Message text="Pergunta teste" amoutOfReactions={0} />
        <Message text="Pergunta teste" amoutOfReactions={0} answered />
        <Message text="Pergunta teste" amoutOfReactions={0} />
        <Message text="Pergunta teste" amoutOfReactions={0} />
      </ol>
    </div>
  );
}
