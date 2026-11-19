import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import FuncionarioDashboardClient from "./Dashboard";

export default async function FuncionarioPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const funcionario = await prisma.funcionario.findUnique({
    where: { slug },
    include: { emprestimos: { include: { cliente: true, parcelas: true } } },
  });

  if (!funcionario || !funcionario.ativo) notFound();

  return <FuncionarioDashboardClient funcionario={funcionario} />;
}
