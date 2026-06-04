import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EmprestimoDetalhesView from "@/components/EmprestimoDetalhesView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function EmprestimoDetalhesPage({ params }: PageProps) {
  const { id } = await params;

  // Buscar empréstimo com cliente e parcelas vinculadas
  const emprestimo = await prisma.emprestimo.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: true,
      parcelas: {
        orderBy: {
          numero: "asc",
        },
      },
    },
  });

  if (!emprestimo) {
    notFound();
  }

  // Converter tipos compatíveis antes de passar para o Client Component
  const serializedEmprestimo = {
    ...emprestimo,
    valor_emprestado: Number(emprestimo.valor_emprestado),
    taxa_juros: Number(emprestimo.taxa_juros),
    taxa_multa: Number(emprestimo.taxa_multa),
    juros_atraso: Number(emprestimo.juros_atraso),
    parcelas: emprestimo.parcelas.map((p) => ({
      ...p,
      valor: Number(p.valor),
      valor_pago: p.valor_pago ? Number(p.valor_pago) : null,
    })),
  };

  return <EmprestimoDetalhesView emprestimo={serializedEmprestimo as any} />;
}
