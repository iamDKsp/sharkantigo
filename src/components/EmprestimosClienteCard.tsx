"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, ListChecks, Check, X, RefreshCw, CalendarClock, CheckCircle2, Trash2,
  ChevronRight, Loader2, AlertCircle,
} from "lucide-react";
import {
  alterarEmprestimosEmMassa,
  type AcaoEmMassa,
  type ResultadoEmMassa,
} from "@/app/clientes/[id]/actions";

export interface EmprestimoClienteItem {
  id: string;
  vencimento: string; // dd/mm/aaaa já formatado
  situacao: "quitado" | "atrasado" | "hoje" | "em_dia";
  principal: number;
  total: number;
  valorJuros: number;
  taxaJuros: number;
  taxaMulta: number;
}

interface Props {
  clienteId: string;
  emprestimos: EmprestimoClienteItem[];
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const badgeClasses: Record<EmprestimoClienteItem["situacao"], { cls: string; label: string }> = {
  quitado: { cls: "bg-slate-100 text-slate-600", label: "Quitado" },
  atrasado: { cls: "bg-rose-100 text-rose-700", label: "Atrasado" },
  hoje: { cls: "bg-amber-100 text-amber-700", label: "Vencendo Hoje" },
  em_dia: { cls: "bg-emerald-100 text-emerald-700", label: "Em dia" },
};

const acoes: {
  id: AcaoEmMassa; titulo: string; descricao: string; icone: React.ReactNode; cor: string; botao: string;
}[] = [
  { id: "renovar", titulo: "Renovar", descricao: "Recebe só os juros e renova +30 dias (empréstimos à vista).", icone: <RefreshCw className="w-5 h-5" />, cor: "text-amber-600 bg-amber-50", botao: "bg-amber-500 hover:bg-amber-600" },
  { id: "reprogramar", titulo: "Reprogramar", descricao: "Move todos para uma mesma data de vencimento.", icone: <CalendarClock className="w-5 h-5" />, cor: "text-blue-600 bg-blue-50", botao: "bg-blue-600 hover:bg-blue-700" },
  { id: "quitar", titulo: "Quitar", descricao: "Quita todos os selecionados de uma vez.", icone: <CheckCircle2 className="w-5 h-5" />, cor: "text-emerald-600 bg-emerald-50", botao: "bg-emerald-600 hover:bg-emerald-700" },
  { id: "excluir", titulo: "Excluir", descricao: "Apaga os empréstimos selecionados. Não dá para desfazer.", icone: <Trash2 className="w-5 h-5" />, cor: "text-rose-600 bg-rose-50", botao: "bg-rose-600 hover:bg-rose-700" },
];

export default function EmprestimosClienteCard({ clienteId, emprestimos }: Props) {
  const router = useRouter();
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Modal: null = fechado | "menu" = escolhendo a ação | AcaoEmMassa = confirmando
  const [modal, setModal] = useState<null | "menu" | AcaoEmMassa>(null);
  const [novaData, setNovaData] = useState("");
  const [cobrarJuros, setCobrarJuros] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEmMassa | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Seleção por arrastar (dedo no mobile / mouse) ──
  // O arraste só começa pela "área de seleção" à esquerda de cada linha, que tem touch-action: none;
  // assim o resto da linha continua rolando a página normalmente.
  const dragModo = useRef<"add" | "remove" | null>(null);

  useEffect(() => {
    const parar = () => { dragModo.current = null; };
    window.addEventListener("pointerup", parar);
    window.addEventListener("pointercancel", parar);
    return () => {
      window.removeEventListener("pointerup", parar);
      window.removeEventListener("pointercancel", parar);
    };
  }, []);

  const aplicar = (id: string, modo: "add" | "remove") =>
    setSelecionados((prev) => {
      if ((modo === "add") === prev.has(id)) return prev;
      const next = new Set(prev);
      if (modo === "add") next.add(id); else next.delete(id);
      return next;
    });

  const alternar = (id: string) =>
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const onZonaPointerDown = (e: React.PointerEvent, id: string) => {
    dragModo.current = selecionados.has(id) ? "remove" : "add";
    aplicar(id, dragModo.current);
  };

  const onListaPointerMove = (e: React.PointerEvent) => {
    if (!dragModo.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-emp-id]");
    const id = el?.getAttribute("data-emp-id");
    if (id) aplicar(id, dragModo.current);
  };

  const todosSelecionados = emprestimos.length > 0 && selecionados.size === emprestimos.length;
  const alternarTodos = () =>
    setSelecionados(todosSelecionados ? new Set() : new Set(emprestimos.map((e) => e.id)));

  const sair = () => {
    setModoSelecao(false);
    setSelecionados(new Set());
  };

  const itensSelecionados = useMemo(
    () => emprestimos.filter((e) => selecionados.has(e.id)),
    [emprestimos, selecionados]
  );
  const totalSelecionado = itensSelecionados.reduce((acc, e) => acc + e.total, 0);

  const fecharModal = () => {
    if (isPending) return;
    const terminou = !!resultado;
    setModal(null);
    setResultado(null);
    setErro(null);
    setNovaData("");
    setCobrarJuros(true);
    if (terminou) {
      sair();
      router.refresh();
    }
  };

  const confirmar = (acao: AcaoEmMassa) => {
    setErro(null);
    if (acao === "reprogramar" && !novaData) {
      setErro("Escolha a nova data de vencimento.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await alterarEmprestimosEmMassa(clienteId, Array.from(selecionados), acao, {
          novaData: novaData || undefined,
          cobrarJurosAtraso: cobrarJuros,
        });
        setResultado(res);
      } catch (err: unknown) {
        setErro((err instanceof Error && err.message) || "Erro ao aplicar a ação.");
      }
    });
  };

  const acaoAtual = acoes.find((a) => a.id === modal);
  const rotuloItem = (id: string) => {
    const e = emprestimos.find((x) => x.id === id);
    return e ? `Venc. ${e.vencimento} · ${formatBRL(e.total)}` : id;
  };

  return (
    <div className="premium-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
      {/* Cabeçalho */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-slate-900">
          Empréstimos
          {modoSelecao && (
            <span className="ml-2 text-xs font-semibold text-slate-400">
              {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {modoSelecao ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={alternarTodos}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {todosSelecionados ? "Limpar" : "Selecionar todos"}
            </button>
            <button
              onClick={sair}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => setModal("menu")}
              disabled={selecionados.size === 0}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Alterar{selecionados.size > 0 ? ` (${selecionados.size})` : ""}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {emprestimos.length > 0 && (
              <button
                onClick={() => setModoSelecao(true)}
                className="flex items-center space-x-1 bg-slate-100 text-slate-700 p-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ListChecks className="w-4 h-4" />
                <span>Alterar Em Massa</span>
              </button>
            )}
            <Link
              href={`/emprestimos/novo?clienteId=${clienteId}`}
              className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 p-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Empréstimo</span>
            </Link>
          </div>
        )}
      </div>

      {modoSelecao && (
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
          Toque nos empréstimos para selecionar. No celular, arraste o dedo para baixo sobre a caixa à esquerda para selecionar vários.
        </div>
      )}

      {/* Lista */}
      <div className="divide-y divide-slate-100" onPointerMove={modoSelecao ? onListaPointerMove : undefined}>
        {emprestimos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Nenhum empréstimo cadastrado para esta pessoa.
          </div>
        ) : (
          emprestimos.map((emp) => {
            const badge = badgeClasses[emp.situacao];
            const conteudo = (
              <>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-slate-900">Vencimento: {emp.vencimento}</span>
                    <span className={`${badge.cls} text-xs font-bold px-2 py-0.5 rounded-full uppercase`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Taxa de juros: {emp.taxaJuros}% ({formatBRL(emp.valorJuros)}) | Multa: {emp.taxaMulta}%
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-slate-900">
                    {formatBRL(emp.principal)} → <span className="text-emerald-600">{formatBRL(emp.total)}</span>
                  </div>
                </div>
              </>
            );

            if (!modoSelecao) {
              return (
                <Link
                  key={emp.id}
                  href={`/emprestimos/${emp.id}`}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  {conteudo}
                </Link>
              );
            }

            const marcado = selecionados.has(emp.id);
            return (
              <div
                key={emp.id}
                data-emp-id={emp.id}
                role="checkbox"
                aria-checked={marcado}
                onClick={() => alternar(emp.id)}
                className={`px-4 py-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  marcado ? "bg-emerald-50/70" : "hover:bg-slate-50/60"
                }`}
              >
                {/* Área de seleção/arraste (touch-action: none para o arraste não rolar a página) */}
                <div
                  onPointerDown={(e) => onZonaPointerDown(e, emp.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="-my-4 -ml-4 pl-4 pr-3 py-4 self-stretch flex items-center touch-none"
                >
                  <span
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      marcado ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"
                    }`}
                  >
                    {marcado && <Check className="w-4 h-4" strokeWidth={3} />}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-between gap-3 min-w-0">{conteudo}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de ações em massa */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  {resultado ? "Resultado" : modal === "menu" ? "Alterar em massa" : acaoAtual?.titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selecionados.size} empréstimo{selecionados.size !== 1 ? "s" : ""} · {formatBRL(totalSelecionado)}
                </p>
              </div>
              <button
                onClick={fecharModal}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Resultado */}
              {resultado ? (
                <>
                  {(() => {
                    const ok = resultado.itens.filter((i) => i.status === "ok").length;
                    const prob = resultado.itens.filter((i) => i.status !== "ok");
                    return (
                      <>
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl p-3">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          {ok} de {resultado.itens.length} concluído{ok !== 1 ? "s" : ""} com sucesso
                        </div>
                        {prob.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Não aplicado</p>
                            {prob.map((i) => (
                              <div key={i.id} className="text-xs bg-amber-50 text-amber-800 rounded-xl p-3">
                                <div className="font-bold">{rotuloItem(i.id)}</div>
                                <div>{i.mensagem}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <button
                    onClick={fecharModal}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Fechar
                  </button>
                </>
              ) : modal === "menu" ? (
                /* Escolha da ação */
                <div className="space-y-2">
                  {acoes.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setErro(null); setModal(a.id); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.cor}`}>
                        {a.icone}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-900">{a.titulo}</span>
                        <span className="block text-xs text-slate-500">{a.descricao}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : acaoAtual ? (
                /* Confirmação da ação */
                <>
                  <p className="text-sm text-slate-600">{acaoAtual.descricao}</p>

                  {acaoAtual.id === "reprogramar" && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Nova data de vencimento
                      </label>
                      <input
                        type="date"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Todos os selecionados passam a vencer nesta data.
                      </p>
                    </div>
                  )}

                  {acaoAtual.id === "quitar" && (
                    <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cobrarJuros}
                        onChange={(e) => setCobrarJuros(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-emerald-600"
                      />
                      <span>
                        Cobrar juros de atraso
                        <span className="block text-xs text-slate-400">
                          Conforme a regra de cada empréstimo. Desmarque para perdoar os juros.
                        </span>
                      </span>
                    </label>
                  )}

                  {acaoAtual.id === "excluir" && (
                    <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 rounded-xl p-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Os empréstimos e suas parcelas serão apagados definitivamente.</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-400">
                    Nenhuma mensagem de WhatsApp é enviada nas ações em massa.
                  </p>

                  {erro && (
                    <div className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{erro}</div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setErro(null); setModal("menu"); }}
                      disabled={isPending}
                      className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => confirmar(acaoAtual.id)}
                      disabled={isPending}
                      className={`flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer ${acaoAtual.botao}`}
                    >
                      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isPending ? "Aplicando..." : `${acaoAtual.titulo} ${selecionados.size}`}
                    </button>
                  </div>
                </>
              ) : null}

              {modal === "menu" && erro && (
                <div className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{erro}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
