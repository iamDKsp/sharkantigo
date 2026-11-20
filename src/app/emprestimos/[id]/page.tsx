import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EmprestimoDetalhesView from "@/components/EmprestimoDetalhesView";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import { obterConfiguracoesSistema } from "@/app/configuracoes/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function EmprestimoDetalhesPage({ params }: PageProps) {
  const { id } = await params;

  // Buscar empréstimo com cliente, parcelas, relatos e baixas pendentes
  const emprestimo = await prisma.emprestimo.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: true,
      parcelas: {
        orderBy: {
          numero: "asc",
        },
      },
      relatos: {
        include: { funcionario: { select: { id: true, nome: true } } },
        orderBy: { criado_em: "desc" },
        take: 25,
      },
      baixas: {
        where: { status: "pendente" },
        include: { funcionario: { select: { id: true, nome: true } } },
        orderBy: { criado_em: "desc" },
      },
    },
  });

  if (!emprestimo) {
    notFound();
  }

  // Auto-correção para parcelas que ficaram com data_pagamento no futuro (virada de dia UTC após as 21h)
  const hojeBrasilia = hojeEmBrasilia();
  for (const p of emprestimo.parcelas) {
    if (p.data_pagamento && new Date(p.data_pagamento) > hojeBrasilia) {
      try {
        await prisma.parcela.update({
          where: { id: p.id },
          data: { data_pagamento: hojeBrasilia },
        });
        p.data_pagamento = hojeBrasilia;
      } catch (err) {
        console.error("Erro ao auto-corrigir data_pagamento:", err);
      }
    }
  }

  // Converter tipos compatíveis antes de passar para o Client Component
  const serializedEmprestimo = {
    ...emprestimo,
    valor_emprestado: Number(emprestimo.valor_emprestado),
    taxa_juros: Number(emprestimo.taxa_juros),
    taxa_multa: Number(emprestimo.taxa_multa),
    juros_atraso: Number(emprestimo.juros_atraso),
    parcelas: emprestimo.parcelas.map((p) => ({
      ...p,
      valor: Number(p.valor),
      valor_pago: p.valor_pago ? Number(p.valor_pago) : null,
    })),
    relatos: emprestimo.relatos.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      texto: r.texto,
      data_prometida: r.data_prometida ? r.data_prometida.toISOString().split("T")[0] : null,
      criado_em: r.criado_em.toISOString(),
      funcionarioNome: r.funcionario?.nome || "ADM",
    })),
    baixasPendentes: emprestimo.baixas.map((b) => ({
      id: b.id,
      tipo: b.tipo,
      valor: Number(b.valor),
      forma_pagamento: b.forma_pagamento,
      observacao: b.observacao,
      criado_em: b.criado_em.toISOString(),
      funcionarioId: b.funcionario_id,
      funcionarioNome: b.funcionario.nome,
    })),
    data_prevista_pagamento: emprestimo.data_prevista_pagamento
      ? emprestimo.data_prevista_pagamento.toISOString().split("T")[0]
      : null,
  };

  const config = await obterConfiguracoesSistema();
  const perguntarWhatsappRenovacao = config.perguntar_whatsapp_renovacao;
  const modoCarencia = config.regra_carencia_30_dias;
  const modoCarencia10 = config.regra_carencia_10_dias;

  return (
    <EmprestimoDetalhesView 
      emprestimo={serializedEmprestimo as any} 
      perguntarWhatsappRenovacao={perguntarWhatsappRenovacao}
      modoCarencia={modoCarencia}
      modoCarencia10={modoCarencia10}
    />
  );
}
