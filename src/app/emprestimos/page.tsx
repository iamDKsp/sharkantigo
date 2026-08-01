import { prisma } from "@/lib/db";
import { Plus } from "lucide-react";
import Link from "next/link";
import EmprestimosListWrapper from "@/components/EmprestimosListWrapper";
import ExportarEmprestimosButton from "@/components/ExportarEmprestimosButton";

export const revalidate = 0;

export default async function EmprestimosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const params = await searchParams;
  const filtroInicial = params?.filtro === "hoje" ? "hoje" : undefined;
  // Buscar todos os empréstimos de uma só vez para possibilitar busca instantânea no client-side
  const emprestimos = await prisma.emprestimo.findMany({
    include: {
      cliente: true,
      parcelas: true,
      parceiro: true,
    },
    orderBy: {
      data_vencimento: "asc",
    },
  });

  const cheques = await prisma.cheque.findMany({
    include: {
      cliente: true,
      parceiro: true,
    },
    orderBy: {
      data_compensacao: "asc"
    }
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

  const serializedCheques = cheques.map((c) => ({
    ...c,
    valor: Number(c.valor),
    taxa_desconto: c.taxa_desconto ? Number(c.taxa_desconto) : null,
    valor_liquido: c.valor_liquido ? Number(c.valor_liquido) : null,
  }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Empréstimos</h1>
          <p className="text-slate-500 dark:text-emerald-400/80">
            {emprestimos.length} no total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportarEmprestimosButton emprestimos={serializedEmprestimos} cheques={serializedCheques} />
          <Link
            href="/emprestimos/novo"
            className="flex items-center space-x-1.5 bg-[#064e3b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-850 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo empréstimo</span>
          </Link>
        </div>
      </div>

      {/* Busca, Filtros e Lista (Componente de Cliente Instantâneo) */}
      <EmprestimosListWrapper initialEmprestimos={serializedEmprestimos} initialFiltro={filtroInicial} />
    </div>
  );
}
