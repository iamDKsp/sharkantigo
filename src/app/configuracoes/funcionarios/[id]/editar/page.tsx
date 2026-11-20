import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { normalizarModoBaixa } from "@/lib/funcionarioSession";
import FormFuncionario from "../../FormFuncionario";

export const dynamic = "force-dynamic";

export default async function EditarFuncionarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const func = await prisma.funcionario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      slug: true,
      telefone: true,
      foto_url: true,
      modo_baixa: true,
      ocultar_telefone: true,
      pode_ver_documentos: true,
    },
  });

  if (!func) notFound();

  return (
    <FormFuncionario
      inicial={{
        ...func,
        modo_baixa: normalizarModoBaixa(func.modo_baixa),
      }}
    />
  );
}
