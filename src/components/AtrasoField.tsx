"use client";

import { useState } from "react";

interface Props {
  tipoInicial?: string | null;
  valorInicial?: number | null;
}

/**
 * Bloco "Cobrar juros por atraso": liga/desliga e escolhe entre valor fixo por dia (R$)
 * ou porcentagem por dia. Envia `atrasoTipo` e `atrasoValor` no <form>.
 */
export default function AtrasoField({ tipoInicial, valorInicial }: Props) {
  const tipoValido = tipoInicial === "fixo_dia" || tipoInicial === "percentual_dia";
  const [ativo, setAtivo] = useState(tipoValido && Number(valorInicial) > 0);
  const [tipo, setTipo] = useState<"fixo_dia" | "percentual_dia">(
    tipoInicial === "percentual_dia" ? "percentual_dia" : "fixo_dia"
  );
  const [valor, setValor] = useState<string>(
    tipoValido && Number(valorInicial) > 0 ? String(valorInicial) : ""
  );

  const fixo = tipo === "fixo_dia";
  const exemplo = fixo
    ? `Ex.: ${valor || "50"} reais × 4 dias de atraso = R$ ${((Number(valor) || 50) * 4).toFixed(2).replace(".", ",")}`
    : `Ex.: ${valor || "1"}% ao dia sobre uma parcela de R$ 1.000 × 4 dias = R$ ${(1000 * ((Number(valor) || 1) / 100) * 4).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="mb-4 sm:mb-0">
          <span className="block text-sm font-bold text-slate-800">Cobrar juros automáticos por atraso</span>
          <span className="text-sm text-slate-500 mt-1 block">
            Cobrado por dia de atraso: um valor fixo (R$) ou uma porcentagem da parcela.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {ativo ? (
        <div className="space-y-3 pl-1 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <button
              type="button"
              onClick={() => setTipo("fixo_dia")}
              className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                fixo ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              R$ por dia
            </button>
            <button
              type="button"
              onClick={() => setTipo("percentual_dia")}
              className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                !fixo ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              % por dia
            </button>
          </div>

          <div className="space-y-2 max-w-xs">
            <label htmlFor="atrasoValor" className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              {fixo ? "Valor por dia de atraso" : "Porcentagem por dia de atraso"} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              {fixo && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600">R$</span>
              )}
              <input
                type="number"
                id="atrasoValor"
                required
                min="0.01"
                step="any"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={fixo ? "50,00" : "1"}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold hover:border-emerald-400 transition-colors ${
                  fixo ? "pl-10 pr-4" : "pl-4 pr-10"
                }`}
              />
              {!fixo && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{exemplo}. Sem limite de acúmulo.</p>
          </div>
        </div>
      ) : null}

      <input type="hidden" name="atrasoTipo" value={ativo ? tipo : "nenhum"} />
      <input type="hidden" name="atrasoValor" value={ativo ? valor || "0" : "0"} />
    </div>
  );
}
