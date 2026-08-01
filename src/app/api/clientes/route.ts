import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 15;
  const offset = (page - 1) * limit;

  try {
    let clientes: any[] = [];
    let totalCount = 0;

    if (query.trim()) {
      // Usa unaccent() do Postgres para busca insensível a acentos nos dois lados
      // Ex: "arielstal" encontra "ÁRIELSTAL", "jose" encontra "José"
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

      clientes = clientesRaw;
      totalCount = Number(countRaw[0].total);
    } else {
      // Sem query: busca paginada normal
      [clientes, totalCount] = await Promise.all([
        prisma.cliente.findMany({
          orderBy: { nome: "asc" },
          skip: offset,
          take: limit,
        }),
        prisma.cliente.count(),
      ]);
    }

    const hasMore = offset + clientes.length < totalCount;

    return NextResponse.json({ clientes, totalCount, hasMore });
  } catch (error: any) {
    // Fallback: se unaccent não estiver instalado, usa busca normalizada no JS
    if (error?.message?.includes("unaccent") || error?.code === "42883") {
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = norm(query);
      const whereClause = q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { telefone: { contains: q, mode: "insensitive" as const } },
              { cidade: { contains: q, mode: "insensitive" as const } },
              { documento: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined;
      const [clientes, totalCount] = await Promise.all([
        prisma.cliente.findMany({ where: whereClause, orderBy: { nome: "asc" }, skip: offset, take: limit }),
        prisma.cliente.count({ where: whereClause }),
      ]);
      return NextResponse.json({ clientes, totalCount, hasMore: offset + clientes.length < totalCount });
    }
    console.error("Erro na busca de clientes:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
