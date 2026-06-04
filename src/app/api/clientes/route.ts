import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 15;

  const offset = (page - 1) * limit;

  try {
    const whereClause = query
      ? {
          OR: [
            { nome: { contains: query } },
            { telefone: { contains: query } },
            { cidade: { contains: query } },
            { documento: { contains: query } },
          ],
        }
      : undefined;

    // Buscar clientes com paginação
    const [clientes, totalCount] = await Promise.all([
      prisma.cliente.findMany({
        where: whereClause,
        orderBy: { nome: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.cliente.count({
        where: whereClause,
      }),
    ]);

    const hasMore = offset + clientes.length < totalCount;

    return NextResponse.json({
      clientes,
      totalCount,
      hasMore,
    });
  } catch (error) {
    console.error("Erro na busca de clientes:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
