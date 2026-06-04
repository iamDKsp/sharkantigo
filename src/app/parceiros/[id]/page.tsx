import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Wallet, TrendingUp, HandCoins } from "lucide-react";
import EmprestimosListWrapper from "@/components/EmprestimosListWrapper";

export const revalidate = 0;

export default async function ParceiroDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const parceiro = await prisma.parceiro.findUnique({
    where: { id: resolvedParams.id }
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

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
      {/* Voltar e Título */}
      <div>
        <Link
          href="/parceiros"
          className="inline-flex items-center space-x-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 dark:text-emerald-500/70 dark:hover:text-emerald-400 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Parceiros</span>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
              {parceiro.nome}
            </h1>
            <p className="text-sm font-bold text-slate-500 dark:text-emerald-500/70 mt-1">
              {parceiro.telefone ? `📞 ${parceiro.telefone}` : "Sem telefone cadastrado"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-5 bg-white dark:bg-[#13221b] border border-slate-100 dark:border-emerald-950 flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-emerald-500/60 uppercase tracking-wider">Total Emprestado</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{formatBRL(totalInvestido)}</p>
          </div>
        </div>
        
        <div className="premium-card p-5 bg-white dark:bg-[#13221b] border border-slate-100 dark:border-emerald-950 flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-emerald-500/60 uppercase tracking-wider">Capital Ativo</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-500 mt-0.5">{formatBRL(totalAtivo)}</p>
          </div>
        </div>

        <div className="premium-card p-5 bg-white dark:bg-[#13221b] border border-slate-100 dark:border-emerald-950 flex items-center space-x-4">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-emerald-500/60 uppercase tracking-wider">Capital Quitado</p>
            <p className="text-lg font-black text-zinc-600 dark:text-zinc-400 mt-0.5">{formatBRL(totalQuitado)}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/40">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white mb-4 uppercase">
          Empréstimos do Parceiro
        </h2>
        {/* Usamos o mesmo wrapper de empréstimos para que a lista seja idêntica, já com as propriedades de WhatsApp e ordenação */}
        <EmprestimosListWrapper initialEmprestimos={serializedEmprestimos} />
      </div>
    </div>
  );
}
