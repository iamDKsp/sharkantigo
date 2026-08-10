import { prisma } from "@/lib/db";
import ClientCobrancasView from "./ClientCobrancasView";

export const revalidate = 0;

export default async function CobrancasPage({ searchParams }: { searchParams: Promise<{ filtro?: string; tab?: string }> }) {
  const params = await searchParams;
  // ?tab= tem prioridade sobre o legado ?filtro=
  const initialFiltro = params?.tab ?? params?.filtro ?? "atrasados";
  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const ontemUTC = new Date(hojeUTC);
  ontemUTC.setUTCDate(hojeUTC.getUTCDate() - 1);

  // Buscar todos os empréstimos ativos com suas parcelas abertas
  const emprestimos = await prisma.emprestimo.findMany({
    where: {
      status: "ativo",
    },
    include: {
      cliente: true,
      parcelas: {
        orderBy: { numero: "asc" },
      },
    },
  });

  const atrasadosOntem: any[] = [];
  const atrasadosAnteriores: any[] = [];
  const hojeLista: any[] = [];
  const aVencer: any[] = [];

  const limite3DiasUTC = new Date(hojeUTC);
  limite3DiasUTC.setUTCDate(hojeUTC.getUTCDate() + 3);

  for (const emp of emprestimos) {
    const valorEmprestadoNum = Number(emp.valor_emprestado);
    const taxaJurosNum = Number(emp.taxa_juros);
    const totalParcelas = emp.parcelas.length;
    const parcelasAbertas = emp.parcelas.filter((p: any) => p.status === "aberto");

    for (const p of parcelasAbertas) {
      const vencObj = new Date(p.data_vencimento);
      const vencimentoUTC = new Date(Date.UTC(vencObj.getUTCFullYear(), vencObj.getUTCMonth(), vencObj.getUTCDate()));

      const serializedParcela = {
        id: p.id,
        numero: p.numero,
        valor: Number(p.valor),
        data_vencimento: p.data_vencimento.toISOString(),
        status: p.status,
        emprestimo: {
          id: emp.id,
          valor_emprestado: valorEmprestadoNum,
          taxa_juros: taxaJurosNum,
          tipo_pagamento: emp.tipo_pagamento,
          totalParcelas: totalParcelas,
          data_prevista_pagamento: emp.data_prevista_pagamento
            ? emp.data_prevista_pagamento.toISOString().split("T")[0]
            : null,
          cliente: {
            id: emp.cliente.id,
            nome: emp.cliente.nome,
            telefone: emp.cliente.telefone,
          },
        },
      };

      if (vencimentoUTC < hojeUTC) {
        if (vencimentoUTC.getTime() === ontemUTC.getTime()) {
          atrasadosOntem.push(serializedParcela);
        } else {
          atrasadosAnteriores.push(serializedParcela);
        }
      } else if (vencimentoUTC.getTime() === hojeUTC.getTime()) {
        hojeLista.push(serializedParcela);
      } else if (vencimentoUTC > hojeUTC && vencimentoUTC <= limite3DiasUTC) {
        aVencer.push(serializedParcela);
      }
    }
  }

  const sortByDate = (a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  atrasadosOntem.sort(sortByDate);
  atrasadosAnteriores.sort(sortByDate);
  hojeLista.sort(sortByDate);
  aVencer.sort(sortByDate);

  return (
    <ClientCobrancasView 
      atrasadosOntem={atrasadosOntem}
      atrasadosAnteriores={atrasadosAnteriores}
      hojeLista={hojeLista}
      aVencer={aVencer}
      initialFiltro={initialFiltro}
    />
  );
}
