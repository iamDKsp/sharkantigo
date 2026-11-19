"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function AcessoLogin({ slug, nome, foto }: { slug: string; nome: string; foto: string | null }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/funcionario/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, senha }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) router.refresh();
      else setErro(d.erro || "Não foi possível entrar.");
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={entrar} className="w-full max-w-xs bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col items-center">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={nome} className="w-24 h-24 rounded-full object-cover shadow mb-4" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-emerald-600 text-white text-3xl font-black flex items-center justify-center shadow mb-4">
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
        <p className="text-xs font-black tracking-[0.3em] text-emerald-600">ACESSO</p>
        <h1 className="text-lg font-black text-slate-900 mb-5">{nome}</h1>

        <div className="relative w-full mb-3">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            autoFocus
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        {erro && <p className="text-xs text-rose-600 font-semibold mb-3">{erro}</p>}
        <button
          type="submit"
          disabled={enviando || !senha}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
        </button>
      </form>
    </div>
  );
}
