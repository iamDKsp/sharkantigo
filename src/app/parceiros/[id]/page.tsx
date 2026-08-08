import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Wallet, TrendingUp, HandCoins } from "lucide-react";
import EmprestimosListWrapper from "@/components/EmprestimosListWrapper";

export const revalidate = 0;

export default async function ParceiroDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const parceiro = await prisma.parceiro.findUnique({
    where: { id: resolvedParams.id },
    include: {
      cheques: {
        include: {
          cliente: {
            select: { nome: true }
          }
        },
        orderBy: {
          data_compensacao: "asc"
        }
      }
    }
  });

  if (!parceiro) {
    notFound();
  }

  const emprestimos = await prisma.emprestimo.findMany({
    where: { parceiro_id: resolvedParams.id },
    include: {
      cliente: true,
      parcelas: true,
      parceiro: true,
    },
    orderBy: {
      data_vencimento: "asc",
    },
  });

  const serializedEmprestimos = emprestimos.map((emp) => ({
    ...emp,
    valor_emprestado: Number(emp.valor_emprestado),
    taxa_juros: Number(emp.taxa_juros),
    taxa_multa: Number(emp.taxa_multa),
    juros_atraso: Number(emp.juros_atraso),
    parcelas: emp.parcelas.map((p) => ({
      ...p,
      valor: Number(p.valor),
      valor_pago: p.valor_pago ? Number(p.valor_pago) : null,
    })),
  }));

  // Calcular estatísticas
  let totalInvestido = 0;
  let totalAtivo = 0;
  let totalQuitado = 0;

  serializedEmprestimos.forEach(emp => {
    totalInvestido += emp.valor_emprestado;
    
    let isQuitado = false;
    if (emp.parcelas && emp.parcelas.length > 0) {
      isQuitado = emp.parcelas.every((p: any) => p.status.startsWith("pago"));
    } else {
      isQuitado = emp.status === "quitado";
    }

    if (isQuitado) {
      totalQuitado += emp.valor_emprestado;
    } else {
      totalAtivo += emp.valor_emprestado;
    }
  });

  let lucroCheques = 0;
  if (parceiro.cheques) {
    parceiro.cheques.forEach(cheque => {
      const valor = Number(cheque.valor);
      const liquido = Number(cheque.valor_liquido || cheque.valor);
      lucroCheques += (valor - liquido);
    });
  }

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
      {/* Voltar e Título */}
      <div>
        <Link
          href="/parceiros"
          className="inline-flex items-center space-x-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Parceiros</span>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {parceiro.nome}
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">
              {parceiro.telefone ? `📞 ${parceiro.telefone}` : "Sem telefone cadastrado"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Emprestado</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{formatBRL(totalInvestido)}</p>
          </div>
        </div>
        
        <div className="premium-card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital Ativo</p>
            <p className="text-lg font-black text-amber-600 mt-0.5">{formatBRL(totalAtivo)}</p>
          </div>
        </div>

        <div className="premium-card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital Quitado</p>
            <p className="text-lg font-black text-slate-600 mt-0.5">{formatBRL(totalQuitado)}</p>
          </div>
        </div>

        <div className="premium-card p-5 bg-white border border-emerald-200 bg-emerald-50/40 shadow-sm rounded-2xl flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lucro (Cheques)</p>
            <p className="text-lg font-black text-emerald-700 mt-0.5">{formatBRL(lucroCheques)}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-base font-bold tracking-tight text-slate-900 mb-4 uppercase">
          Empréstimos do Parceiro
        </h2>
        {/* Usamos o mesmo wrapper de empréstimos para que a lista seja idêntica, já com as propriedades de WhatsApp e ordenação */}
        <EmprestimosListWrapper initialEmprestimos={serializedEmprestimos} />
      </div>

      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
            Cheques do Parceiro
          </h2>
          <Link
            href={`/cheques`}
            className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 p-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <span>Ir para Cheques</span>
          </Link>
        </div>

        <div className="premium-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="divide-y divide-slate-100">
            {!parceiro.cheques || parceiro.cheques.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Nenhum cheque vinculado a este parceiro.
              </div>
            ) : (
              parceiro.cheques.map((cheque) => {
                const valorBruto = Number(cheque.valor);
                const valorLiquido = Number(cheque.valor_liquido || cheque.valor);
                const taxa = Number(cheque.taxa_desconto || 0);

                const formatData = (date: Date) => {
                  return new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"
                  }).format(new Date(date));
                };

                return (
                  <div key={cheque.id} className="p-4 flex flex-col space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          Vencimento: {formatData(cheque.data_compensacao)}
                        </span>
                        {cheque.status === "compensado" ? (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                            Compensado
                          </span>
                        ) : cheque.status === "devolvido" ? (
                          <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                            Devolvido
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                            Pendente
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {cheque.cliente?.nome || cheque.titular || "Cliente desconhecido"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cheque</span>
                          <span className="text-sm font-bold text-slate-900">{formatBRL(valorBruto)}</span>
                        </div>
                        <div className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Taxa {taxa}%</span>
                          <span className="text-sm font-bold text-slate-900">{formatBRL(valorBruto - valorLiquido)}</span>
                        </div>
                      </div>
                      <div className="text-right border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">Líquido</span>
                        <span className="text-sm font-bold text-emerald-700">{formatBRL(valorLiquido)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
