import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Remove acentos e normaliza para comparação (usado no fallback JS)
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

    // Com busca: divide em palavras e faz AND de ILIKE para cada uma.
    // Ex: "Viviane Costa" → nome ILIKE '%Viviane%' AND nome ILIKE '%Costa%'
    // Garante que buscas com nome + sobrenome funcionem corretamente.
    try {
      // Normaliza espaços múltiplos e divide em palavras não-vazias
      const words = query.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

      if (words.length === 0) throw new Error("empty");

      // Monta cláusula AND: cada palavra deve aparecer no nome
      // unaccent(nome) ILIKE '%palavra1%' AND unaccent(nome) ILIKE '%palavra2%' ...
      const nomeConditions = words.map(
        (w) => Prisma.sql`unaccent(nome) ILIKE unaccent(${`%${w}%`})`
      );
      const nomeWhere = nomeConditions.reduce(
        (acc, cond) => Prisma.sql`${acc} AND ${cond}`
      );

      // Para telefone/cidade/documento, busca pela frase completa normalizada
      const fullTerm = `%${query.trim().replace(/\s+/g, " ")}%`;

      const whereClause = Prisma.sql`
        (${nomeWhere})
        OR unaccent(telefone)  ILIKE unaccent(${fullTerm})
        OR unaccent(cidade)    ILIKE unaccent(${fullTerm})
        OR unaccent(documento) ILIKE unaccent(${fullTerm})
      `;

      const [clientesRaw, countRaw] = await Promise.all([
        prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM clientes
          WHERE ${whereClause}
          ORDER BY nome ASC
          LIMIT ${limit} OFFSET ${offset}
        `),
        prisma.$queryRaw<[{ total: bigint }]>(Prisma.sql`
          SELECT COUNT(*) as total FROM clientes
          WHERE ${whereClause}
        `),
      ]);

      const totalCount = Number(countRaw[0].total);
      return NextResponse.json({
        clientes: clientesRaw,
        totalCount,
        hasMore: offset + clientesRaw.length < totalCount,
      });
    } catch {
      // Fallback JS: quando unaccent não está disponível no Postgres
      // Divide a query em palavras e exige que todas apareçam no nome normalizado
      const q = norm(query);
      const words = q.replace(/\s+/g, " ").split(" ").filter(Boolean);

      const todos = await prisma.cliente.findMany({
        orderBy: { nome: "asc" },
      });

      const filtrados = todos.filter((c) => {
        const nomeNorm = norm(c.nome);
        // Verifica se TODAS as palavras aparecem no nome
        const nomeMatch = words.every((w) => nomeNorm.includes(w));
        return (
          nomeMatch ||
          (c.telefone || "").includes(query.trim()) ||
          norm(c.cidade).includes(q) ||
          norm(c.documento).includes(q)
        );
      });

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
