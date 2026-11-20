import { prisma } from "@/lib/db";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import type {
  BaixaPendenteGlobal,
  FuncionarioResumoAdm,
} from "@/app/configuracoes/funcionarios/FuncionariosListClient";
import ClientParceirosList from "./ClientParceirosList";

export const dynamic = "force-dynamic";

export default async function ParceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const abaParam = params?.aba ?? params?.tab;
  const initialAba = abaParam === "funcionarios" ? "funcionarios" : "parceiros";

  const hoje = hojeEmBrasilia();
  const inicioMesUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const [parceiros, funcionariosDb, pendentesDb, baixasMesDb] = await Promise.all([
    prisma.parceiro.findMany({
      orderBy: {
        nome: "asc",
      },
    }),
    prisma.funcionario.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        slug: true,
        telefone: true,
        foto_url: true,
        ativo: true,
        modo_baixa: true,
        ocultar_telefone: true,
        pode_ver_documentos: true,
        emprestimos: {
          where: { status: "ativo" },
          select: { id: true },
        },
      },
    }),
    prisma.baixaFuncionario.findMany({
      where: { status: "pendente" },
      include: {
        funcionario: { select: { nome: true } },
        emprestimo: { select: { cliente: { select: { nome: true } } } },
      },
      orderBy: { criado_em: "desc" },
    }),
    prisma.baixaFuncionario.findMany({
      where: {
        status: { in: ["direta", "aprovada"] },
        criado_em: { gte: inicioMesUTC },
      },
      select: { funcionario_id: true, valor: true },
    }),
  ]);

  const pendentesPorFunc = new Map<string, number>();
  for (const p of pendentesDb) {
    pendentesPorFunc.set(p.funcionario_id, (pendentesPorFunc.get(p.funcionario_id) || 0) + 1);
  }

  const recebidoMesPorFunc = new Map<string, number>();
  for (const b of baixasMesDb) {
    recebidoMesPorFunc.set(
      b.funcionario_id,
      (recebidoMesPorFunc.get(b.funcionario_id) || 0) + Number(b.valor)
    );
  }

  const funcionarios: FuncionarioResumoAdm[] = funcionariosDb.map((f) => ({
    id: f.id,
    nome: f.nome,
    slug: f.slug,
    telefone: f.telefone,
    foto_url: f.foto_url,
    ativo: f.ativo,
    modo_baixa: f.modo_baixa,
    ocultar_telefone: f.ocultar_telefone,
    pode_ver_documentos: f.pode_ver_documentos,
    emprestimosAtivos: f.emprestimos.length,
    pendentesCount: pendentesPorFunc.get(f.id) || 0,
    recebidoMes: Number((recebidoMesPorFunc.get(f.id) || 0).toFixed(2)),
  }));

  const pendentes: BaixaPendenteGlobal[] = pendentesDb.map((b) => ({
    id: b.id,
    funcionario_id: b.funcionario_id,
    funcionarioNome: b.funcionario.nome,
    emprestimo_id: b.emprestimo_id,
    clienteNome: b.emprestimo.cliente.nome,
    tipo: b.tipo,
    valor: Number(b.valor),
    forma_pagamento: b.forma_pagamento,
    observacao: b.observacao,
    criado_em: b.criado_em.toISOString(),
  }));

  return (
    <ClientParceirosList
      parceiros={parceiros}
      funcionarios={funcionarios}
      pendentes={pendentes}
      initialAba={initialAba}
    />
  );
}
