import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import FormEditarCliente from "./FormEditarCliente";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function EditarClientePage({ params }: PageProps) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
  });

  if (!cliente) {
    notFound();
  }

  return <FormEditarCliente cliente={cliente} />;
}
