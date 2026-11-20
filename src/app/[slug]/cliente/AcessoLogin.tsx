"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import Tooltip from "@/components/Tooltip";

export default function AcessoLogin({
  slug,
  nome,
  foto,
}: {
  slug: string;
  nome: string;
  foto: string | null;
}) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
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
      if (d.ok) {
        router.refresh();
      } else {
        setErro(d.erro || "Não foi possível entrar.");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#064e3b] via-[#053f30] to-slate-900 p-4 relative overflow-hidden">
      {/* Glow decorativo suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-emerald-400/15 blur-3xl"
      />

      <div className="animate-fade-in-up relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-emerald-900/10 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50/90 to-white px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-slate-100">
          <div className="animate-scale-up relative mb-4">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={foto}
                alt={nome}
                className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-3xl font-black flex items-center justify-center shadow-lg ring-4 ring-white">
                {nome.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full mb-2">
            Área do Cobrador
          </span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{nome}</h1>
          <p className="text-xs text-slate-500 mt-1">Digite sua senha para acessar suas cobranças</p>
        </div>

        <form onSubmit={entrar} className="p-6 space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={mostrar ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha de acesso"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Tooltip content={mostrar ? "Ocultar senha" : "Mostrar senha"} side="top">
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  className="btn-press text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                  tabIndex={-1}
                >
                  {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Tooltip>
            </div>
          </div>

          {erro && (
            <div className="animate-pop bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl px-3.5 py-2.5 text-center">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !senha}
            className="btn-press w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            {enviando ? "Entrando..." : "Entrar no Painel"}
          </button>
        </form>
      </div>
      <p className="text-[11px] text-emerald-200/70 font-medium mt-5">
        Soluções Financeiras · Acesso restrito à carteira delegada
      </p>
    </div>
  );
}
