"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import {
  aprovarBaixaFuncionario,
  recusarBaixaFuncionario,
} from "./actions";

export interface BaixaParaDecisao {
  id: string;
  clienteNome: string;
  funcionarioNome: string;
  tipo: string;
  valor: number;
  forma_pagamento: string;
  observacao: string | null;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function labelTipo(t: string) {
  if (t === "renovacao") return "Renovação (+30d)";
  if (t === "quitacao") return "Quitação";
  return "Pagamento de Parcela";
}

export default function ModalDecisaoBaixa({
  baixa,
  modo,
  onClose,
  onDone,
}: {
  baixa: BaixaParaDecisao;
  modo: "aprovar" | "recusar";
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [enviarWa, setEnviarWa] = useState(true);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fechar = () => {
    if (isPending || closing) return;
    setClosing(true);
    setTimeout(onClose, 150);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, closing]);

  const confirmarAprovar = () => {
    setErro(null);
    startTransition(async () => {
      try {
        const res = await aprovarBaixaFuncionario(baixa.id, enviarWa);
        onDone(
          res.whatsappEnviado
            ? `Pagamento de ${baixa.clienteNome} aprovado e comprovante enviado!`
            : `Pagamento de ${baixa.clienteNome} aprovado com sucesso!`
        );
      } catch (err: any) {
        setErro(err?.message || "Erro ao aprovar pagamento.");
      }
    });
  };

  const confirmarRecusar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      try {
        await recusarBaixaFuncionario(baixa.id, motivo);
        onDone(`Solicitação de ${baixa.clienteNome} recusada.`);
      } catch (err: any) {
        setErro(err?.message || "Erro ao recusar pagamento.");
      }
    });
  };

  const isAprovar = modo === "aprovar";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && fechar()}
      className={`fixed inset-0 z-[70] p-0 sm:p-4 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm ${
        closing ? "motion-modal-backdrop-out" : "motion-modal-backdrop-in"
      }`}
    >
      <div
        className={`bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden ${
          closing
            ? "motion-drawer-out sm:motion-modal-card-out"
            : "motion-drawer-in sm:motion-modal-card-in"
        }`}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 bg-slate-50/70 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300/80" />
        </div>
        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isAprovar
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isAprovar ? <Wallet className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-slate-900 truncate">
                {isAprovar ? "Aprovar Pagamento" : "Recusar Solicitação"}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {baixa.clienteNome} · via {baixa.funcionarioNome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fechar}
            disabled={isPending}
            className="btn-press w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {erro && (
            <div className="animate-pop bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl px-3.5 py-2.5">
              {erro}
            </div>
          )}

          {/* Resumo */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Operação</span>
              <span className="font-black text-slate-800">
                {labelTipo(baixa.tipo)} ({baixa.forma_pagamento.toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 font-bold">Valor informado</span>
              <span className="text-base font-black text-emerald-700 tabular-nums">
                {brl(baixa.valor)}
              </span>
            </div>
            {baixa.observacao && (
              <div className="pt-1.5 border-t border-slate-200/80 text-slate-600 italic">
                “{baixa.observacao}”
              </div>
            )}
          </div>

          {isAprovar ? (
            <>
              <button
                type="button"
                onClick={() => setEnviarWa((v) => !v)}
                className={`btn-press w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                  enviarWa
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 transition-colors ${
                      enviarWa ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">Enviar comprovante no WhatsApp</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Dispara a confirmação para {baixa.clienteNome}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    enviarWa ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"
                  }`}
                >
                  {enviarWa && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={fechar}
                  disabled={isPending}
                  className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAprovar}
                  disabled={isPending}
                  className="btn-press flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isPending ? "Aprovando..." : "Confirmar Aprovação"}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={confirmarRecusar} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Motivo da recusa (visível para o funcionário)
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Pix ainda não caiu na conta / Valor diferente do combinado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 resize-y"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={fechar}
                  disabled={isPending}
                  className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-press flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {isPending ? "Recusando..." : "Confirmar Recusa"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
