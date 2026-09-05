import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Rota somente leitura usada pelo botão de exportação quando o usuário clica em "Exportar".
// Cheques foram removidos do carregamento inicial de /emprestimos para evitar
// transferir ~500 KB de dados (incluindo imagens em Base64) para todos os usuários
// que apenas visitam a listagem sem intenção de exportar.
export const dynamic = "force-dynamic";

export async function GET() {
  const cheques = await prisma.cheque.findMany({
    select: {
      id: true,
      titular: true,
      banco: true,
      valor: true,
      taxa_desconto: true,
      valor_liquido: true,
      data_compensacao: true,
      status: true,
      cliente: {
        select: {
          id: true,
          nome: true,
        },
      },
      parceiro: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
    orderBy: {
      data_compensacao: "asc",
    },
  });

  const serialized = cheques.map((c) => ({
    ...c,
    valor: Number(c.valor),
    taxa_desconto: c.taxa_desconto ? Number(c.taxa_desconto) : null,
    valor_liquido: c.valor_liquido ? Number(c.valor_liquido) : null,
  }));

  return NextResponse.json(serialized);
}
