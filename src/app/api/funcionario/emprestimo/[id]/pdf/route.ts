import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { gerarCronogramaPdf } from "@/lib/cronogramaPdf";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ error: auth.erro }, { status: auth.status });

  const { id } = await params;

  const emprestimo = await prisma.emprestimo.findUnique({
    where: { id },
    include: {
      cliente: true,
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  if (!emprestimo || emprestimo.funcionario_id !== auth.funcionario.id) {
    return NextResponse.json({ error: "Empréstimo não encontrado" }, { status: 404 });
  }

  const doc = gerarCronogramaPdf({
    clienteNome: emprestimo.cliente.nome,
    clienteDocumento: auth.funcionario.pode_ver_documentos ? emprestimo.cliente.documento : null,
    tipoPagamento: emprestimo.tipo_pagamento,
    valorEmprestado: Number(emprestimo.valor_emprestado),
    taxaJuros: Number(emprestimo.taxa_juros),
    taxaMulta: Number(emprestimo.taxa_multa),
    atrasoTipo: emprestimo.atraso_tipo,
    atrasoValor: emprestimo.atraso_valor,
    observacoes: emprestimo.observacoes,
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
      "Content-Disposition": `attachment; filename="cronograma-${clienteSlug}.pdf"`,
    },
  });
}
