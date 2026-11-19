"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, MessageSquare } from "lucide-react";

export function BotaoCobrar({ emprestimoId, clienteNome }: { emprestimoId: string; clienteNome: string }) {
  const [enviando, setEnviando] = useState(false);

  async function cobrar() {
    if (!confirm(`Enviar a cobrança para ${clienteNome} pelo WhatsApp?`)) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/funcionario/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emprestimoId }),
      });
      const d = await res.json().catch(() => ({}));
      alert(d.ok ? "Cobrança enviada!" : d.erro || "Não foi possível enviar.");
    } catch {
      alert("Falha de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      onClick={cobrar}
      disabled={enviando}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
      Cobrar no WhatsApp
    </button>
  );
}

export function BotaoSair() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/funcionario/sair", { method: "POST" });
        router.refresh();
      }}
      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
    >
      <LogOut className="w-4 h-4" /> Sair
    </button>
  );
}
