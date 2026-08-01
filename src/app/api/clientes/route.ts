import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Remove acentos e normaliza para comparação
const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 15;
  const offset = (page - 1) * limit;

  try {
    if (!query.trim()) {
      // Sem busca: retorna paginado normalmente
      const [clientes, totalCount] = await Promise.all([
        prisma.cliente.findMany({
          orderBy: { nome: "asc" },
          skip: offset,
          take: limit,
        }),
        prisma.cliente.count(),
      ]);
      return NextResponse.json({
        clientes,
        totalCount,
        hasMore: offset + clientes.length < totalCount,
      });
    }

    // Com busca: primeiro tenta unaccent no Postgres
    // Se não disponível, faz fallback com filtragem JS no servidor
    try {
      const term = `%${query.trim()}%`;
      const [clientesRaw, countRaw] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT * FROM clientes
          WHERE unaccent(nome)      ILIKE unaccent(${term})
             OR unaccent(telefone)  ILIKE unaccent(${term})
             OR unaccent(cidade)    ILIKE unaccent(${term})
             OR unaccent(documento) ILIKE unaccent(${term})
          ORDER BY nome ASC
          LIMIT ${limit} OFFSET ${offset}
        `,
        prisma.$queryRaw<[{ total: bigint }]>`
          SELECT COUNT(*) as total FROM clientes
          WHERE unaccent(nome)      ILIKE unaccent(${term})
             OR unaccent(telefone)  ILIKE unaccent(${term})
             OR unaccent(cidade)    ILIKE unaccent(${term})
             OR unaccent(documento) ILIKE unaccent(${term})
        `,
      ]);
      const totalCount = Number(countRaw[0].total);
      return NextResponse.json({
        clientes: clientesRaw,
        totalCount,
        hasMore: offset + clientesRaw.length < totalCount,
      });
    } catch {
      // Fallback: busca todos e filtra com norm() no servidor
      // Busca por telefone (exato, sem acento) OU pelo nome/cidade/doc normalizados
      const q = norm(query);

      // Busca ampla: pega candidatos por telefone (ILIKE) + fallback completo
      const todos = await prisma.cliente.findMany({
        orderBy: { nome: "asc" },
      });

      const filtrados = todos.filter(
        (c) =>
          norm(c.nome).includes(q) ||
          (c.telefone || "").includes(query.trim()) ||
          norm(c.cidade).includes(q) ||
          norm(c.documento).includes(q)
      );

      const totalCount = filtrados.length;
      const paginados = filtrados.slice(offset, offset + limit);

      return NextResponse.json({
        clientes: paginados,
        totalCount,
        hasMore: offset + paginados.length < totalCount,
      });
    }
  } catch (error) {
    console.error("Erro na busca de clientes:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
