import { prisma } from "@/lib/db";
import FormNovoEmprestimo from "@/components/FormNovoEmprestimo";

export const revalidate = 0;

export default async function NovoEmprestimoPage() {
  // Buscar lista de clientes ordenada para carregar no select do formulário
  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nome: true,
      telefone: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  // Buscar lista de parceiros ordenada
  const parceiros = await prisma.parceiro.findMany({
    select: {
      id: true,
      nome: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  return <FormNovoEmprestimo clientes={clientes} parceiros={parceiros} />;
}
