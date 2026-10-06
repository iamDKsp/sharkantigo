"use client";

import { useState } from "react";
import { 
  Receipt, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Info, 
  Calculator, 
  CheckCircle2, 
  TrendingUp, 
  HandCoins,
  ArrowRight
} from "lucide-react";

export interface EmprestimoItemWizard {
  id: string;
  data_vencimento: string;
  principal: number;
  taxa_juros: number;
  totalComJuros: number;
}

interface Props {
  valorTotalDivida: number;
  totalEmprestadoAtivo: number;
  totalAReceber: number;
  emprestimosAtivos: EmprestimoItemWizard[];
  clienteNome: string;
}

export default function ValorTotalDividaCard({
  valorTotalDivida,
  totalEmprestadoAtivo,
  totalAReceber,
  emprestimosAtivos,
  clienteNome,
}: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2>(1);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <>
      {/* Card Clicável com Efeito Hover e Indicação de Wizard */}
      <div
        onClick={() => {
          setEtapa(1);
          setModalAberto(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEtapa(1);
            setModalAberto(true);
          }
        }}
        className="premium-card p-4 bg-white border border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm hover:shadow-md rounded-2xl transition-all duration-200 cursor-pointer group relative overflow-hidden"
        title="Clique para ver o mini wizard com a explicação detalhada de cada número"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Receipt className="w-4.5 h-4.5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Valor total da dívida
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full transition-colors flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Explicar
          </span>
        </div>

        <div className="text-lg font-black text-slate-900 mt-2 tracking-tight group-hover:text-indigo-900 transition-colors">
          {formatBRL(valorTotalDivida)}
        </div>

        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
          <span>{emprestimosAtivos.length} contrato{emprestimosAtivos.length !== 1 ? "s" : ""} ativo{emprestimosAtivos.length !== 1 ? "s" : ""}</span>
          <span>•</span>
          <span className="text-indigo-600 font-semibold group-hover:underline">Toque para ver a conta</span>
        </div>
      </div>

      {/* Modal Mini Wizard Explicativo */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header do Wizard */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Mini Wizard: Valor Total da Dívida
                  </h3>
                  <p className="text-xs text-indigo-100">
                    {clienteNome} · Entenda como esse valor é formado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navegação entre etapas do Wizard */}
            <div className="flex border-b border-slate-100 bg-slate-50/70 text-xs font-bold text-slate-500">
              <button
                onClick={() => setEtapa(1)}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  etapa === 1
                    ? "border-indigo-600 text-indigo-700 bg-white"
                    : "border-transparent hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-black">
                  1
                </span>
                <span>Contratos Ativos</span>
              </button>
              <button
                onClick={() => setEtapa(2)}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  etapa === 2
                    ? "border-indigo-600 text-indigo-700 bg-white"
                    : "border-transparent hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-black">
                  2
                </span>
                <span>Por Que Não Diminui?</span>
              </button>
            </div>

            {/* Conteúdo da Etapa 1: Discriminação de cada número */}
            {etapa === 1 && (
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start space-x-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    O <strong>Valor Total da Dívida</strong> é a soma exata do <strong>Capital Emprestado + Juros contratados</strong> de todos os empréstimos ativos.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Discriminação dos Contratos Ativos ({emprestimosAtivos.length})
                  </span>

                  {emprestimosAtivos.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400">
                      Nenhum empréstimo ativo no momento.
                    </div>
                  ) : (
                    emprestimosAtivos.map((emp, idx) => (
                      <div
                        key={emp.id || idx}
                        className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-800">
                              Contrato #{idx + 1}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              Venc: {emp.data_vencimento}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {formatBRL(emp.principal)} + {emp.taxa_juros}% de juros
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-semibold text-[10px] uppercase">
                            Total com Juros
                          </span>
                          <span className="text-sm font-black text-indigo-600">
                            {formatBRL(emp.totalComJuros)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totalizador Consolidado */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Soma Total da Dívida Contratada
                    </span>
                    <span className="text-xs text-slate-300">
                      Total de todos os empréstimos ativos
                    </span>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    {formatBRL(valorTotalDivida)}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da Etapa 2: Explicação didática e comparativo */}
            {etapa === 2 && (
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Por que este número permanece fixo?</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Para evitar que o cliente compare o <strong>Total Recebido</strong> (que inclui contratos antigos quitados no passado) com o valor emprestado atual e peça descontos indevidos.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Comparativo dos 3 Indicadores:
                    </span>

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <HandCoins className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">Emprestado (Ativo):</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatBRL(totalEmprestadoAtivo)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 -mt-1 pl-6">
                      Apenas o capital puro que saiu do seu bolso.
                    </p>

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 pt-1">
                      <div className="flex items-center space-x-2 text-indigo-700">
                        <Receipt className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold">Valor Total da Dívida:</span>
                      </div>
                      <span className="font-black text-indigo-700">{formatBRL(valorTotalDivida)}</span>
                    </div>
                    <p className="text-[11px] text-indigo-600 -mt-1 pl-6 font-medium">
                      O montante total contratado com juros. Não muda com pagamentos de juros ou amortizações.
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-700">A Receber (Saldo Devedor):</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatBRL(totalAReceber)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 -mt-1 pl-6">
                      O que ainda falta quitar hoje (este sim diminui conforme o cliente paga parcelas).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer do Wizard com Ações */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {etapa === 1 ? (
                <>
                  <button
                    onClick={() => setModalAberto(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setEtapa(2)}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Próximo Passo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEtapa(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setModalAberto(false)}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Entendi</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
