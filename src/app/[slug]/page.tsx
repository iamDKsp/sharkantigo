import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { slugValido } from "@/lib/funcionarioSession";

export const dynamic = "force-dynamic";

export default async function FuncionarioSlugRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slugValido(slug)) notFound();

  const funcionario = await prisma.funcionario.findUnique({
    where: { slug },
    select: { id: true, ativo: true },
  });

  if (!funcionario || !funcionario.ativo) notFound();

  redirect(`/${slug}/cliente`);
}
