import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import FormEditarEmprestimo from "@/components/FormEditarEmprestimo";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarEmprestimoPage({ params }: PageProps) {
  const { id } = await params;

  const emprestimo = await prisma.emprestimo.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: true,
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  if (!emprestimo) notFound();

  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true, telefone: true },
    orderBy: { nome: "asc" },
  });

  const parceiros = await prisma.parceiro.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const serialized = {
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

  return (
    <div className="space-y-6">
      <FormEditarEmprestimo
        emprestimo={serialized as any}
        clientes={clientes}
        parceiros={parceiros}
      />
    </div>
  );
}