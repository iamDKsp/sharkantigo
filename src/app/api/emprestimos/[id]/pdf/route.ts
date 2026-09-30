import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { gerarCronogramaPdf } from "@/lib/cronogramaPdf";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const emprestimo = await prisma.emprestimo.findUnique({
      where: { id },
      include: {
        cliente: true,
        parcelas: {
          orderBy: { numero: "asc" },
        },
      },
    });

    if (!emprestimo) {
      return NextResponse.json({ error: "Empréstimo não encontrado" }, { status: 404 });
    }

    const doc = gerarCronogramaPdf({
      clienteNome: emprestimo.cliente.nome,
      clienteDocumento: emprestimo.cliente.documento,
      tipoPagamento: emprestimo.tipo_pagamento,
      valorEmprestado: Number(emprestimo.valor_emprestado),
      taxaJuros: Number(emprestimo.taxa_juros),
      taxaMulta: Number(emprestimo.taxa_multa),
      dataGeracao: new Date(),
      parcelas: emprestimo.parcelas.map((p) => ({
        numero: p.numero,
        data_vencimento: p.data_vencimento,
        valor: Number(p.valor),
        status: p.status,
        data_pagamento: p.data_pagamento,
      })),
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const clienteSlug = emprestimo.cliente.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cronograma-${clienteSlug}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Erro ao gerar PDF via rota API:", err);
    return NextResponse.json({ error: "Erro interno ao gerar PDF" }, { status: 500 });
  }
}
