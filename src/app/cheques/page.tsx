import { prisma } from "@/lib/db";
import { createCheque, updateChequeStatus } from "./actions";
import { Plus, Wallet, FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";

export const revalidate = 0;

export default async function ChequesPage() {
  // Buscar cheques do banco de dados
  const cheques = await prisma.cheque.findMany({
    orderBy: {
      data_compensacao: "asc",
    },
  });

  // Utilitário de formatação BRL
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Formatar data
  const formatData = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Cheques</h1>
        <p className="text-slate-500 dark:text-emerald-400/80">Controle de cheques recebidos de terceiros em garantia.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lista de Cheques */}
        <div className="lg:col-span-2 space-y-4">
          <div className="premium-card bg-white dark:bg-[#13221b] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-emerald-950">
              <h2 className="font-bold text-slate-900 dark:text-white">Garantias em mãos ({cheques.length})</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-emerald-950">
              {cheques.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-emerald-400/60">
                  Nenhum cheque cadastrado no momento.
                </div>
              ) : (
                cheques.map((c) => {
                  return (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">{c.titular}</span>
                          {c.status === "compensado" ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              <span>Compensado</span>
                            </span>
                          ) : c.status === "devolvido" ? (
                            <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Devolvido</span>
                            </span>
                          ) : (
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Em mãos</span>
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-emerald-400/80 flex space-x-4">
                          <span>Banco: {c.banco}</span>
                          <span>Compensação: {formatData(c.data_compensacao)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-950 dark:text-white">
                            {formatBRL(Number(c.valor))}
                          </div>
                        </div>

                        {c.status === "em_maos" && (
                          <div className="flex space-x-1.5">
                            <form action={async () => {
                              "use server";
                              await updateChequeStatus(c.id, "compensado");
                            }}>
                              <button
                                type="submit"
                                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-sm font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                Compensar
                              </button>
                            </form>
                            <form action={async () => {
                              "use server";
                              await updateChequeStatus(c.id, "devolvido");
                            }}>
                              <button
                                type="submit"
                                className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 text-sm font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                Devolver
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Formulário de Cadastro */}
        <div className="premium-card p-6 space-y-4 bg-white dark:bg-[#13221b]">
          <h2 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-emerald-950 pb-2">
            Adicionar cheque
          </h2>

          <form action={createCheque} className="space-y-4">
            {/* Titular */}
            <div className="space-y-1.5">
              <label htmlFor="titular" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Titular *
              </label>
              <input
                type="text"
                id="titular"
                name="titular"
                required
                placeholder="Nome do titular do cheque"
                className="w-full bg-slate-55 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-950 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Banco */}
            <div className="space-y-1.5">
              <label htmlFor="banco" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Banco *
              </label>
              <input
                type="text"
                id="banco"
                name="banco"
                required
                placeholder="Ex: Itaú, Bradesco"
                className="w-full bg-slate-55 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-950 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <label htmlFor="valor" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Valor (R$) *
              </label>
              <input
                type="number"
                id="valor"
                name="valor"
                required
                min="1"
                step="any"
                placeholder="Ex: 500"
                className="w-full bg-slate-55 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-950 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Data de compensação */}
            <div className="space-y-1.5">
              <label htmlFor="dataCompensacao" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Data de compensação *
              </label>
              <input
                type="date"
                id="dataCompensacao"
                name="dataCompensacao"
                required
                className="w-full bg-slate-55 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-950 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Botão Salvar */}
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-1.5 bg-[#064e3b] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-850 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar cheque</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
