"use client";

import { useState } from "react";
import { 
  Receipt, 
  HelpCircle, 
  X, 
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

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <>
      {/* Card no Resumo Financeiro — em harmonia com os outros cards da grade */}
      <div
        onClick={() => setModalAberto(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setModalAberto(true);
          }
        }}
        className="premium-card p-4 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        title="Clique para ver os detalhes da Dívida Total"
      >
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center space-x-2 text-slate-500 min-w-0">
              <Receipt className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider truncate">
                Dívida Total
              </span>
            </div>
            <span 
              className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors flex items-center justify-center shrink-0"
              title="Ver detalhes"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-lg font-bold text-slate-900 mt-2">
            {formatBRL(valorTotalDivida)}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-semibold mt-1 flex items-center gap-1 transition-colors truncate">
          <span>Ver detalhes</span>
          <ArrowRight className="w-2.5 h-2.5 shrink-0" />
        </div>
      </div>

      {/* Modal Limpo e Harmonizado com o Sistema */}
      {modalAberto && (
        <div 
          onClick={() => setModalAberto(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-slate-900 leading-tight">
                    Dívida Total Contratada
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {clienteNome} · Empréstimos Ativos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shrink-0 ml-2"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 leading-relaxed font-medium">
                Este valor representa a soma contratual (capital + juros) de todos os empréstimos ativos deste cliente.
              </div>

              {/* Lista dos Contratos Ativos */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                  Contratos Ativos ({emprestimosAtivos.length})
                </span>

                {emprestimosAtivos.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Nenhum empréstimo ativo no momento.
                  </div>
                ) : (
                  emprestimosAtivos.map((emp, idx) => (
                    <div
                      key={emp.id || idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">
                            Empréstimo #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Venc: {emp.data_vencimento}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {formatBRL(emp.principal)} com {emp.taxa_juros}% de juros
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Total
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {formatBRL(emp.totalComJuros)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Resumo Consolidado */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Capital puro emprestado:</span>
                  <span className="font-semibold text-white">{formatBRL(totalEmprestadoAtivo)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Juros totais contratados:</span>
                  <span className="font-semibold text-white">
                    {formatBRL(Math.max(0, valorTotalDivida - totalEmprestadoAtivo))}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Dívida Total:
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    {formatBRL(valorTotalDivida)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto shadow-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
