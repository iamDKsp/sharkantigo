import { prisma } from "@/lib/db";
import ClientCobrancasView from "./ClientCobrancasView";

export const revalidate = 0;

export default async function CobrancasPage() {
  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

  // Buscar todos os empréstimos ativos com suas parcelas abertas
  const emprestimos = await prisma.emprestimo.findMany({
    where: {
      status: "ativo",
    },
    include: {
      cliente: true,
      parcelas: {
        where: {
          status: "aberto",
        },
        orderBy: {
          numero: "asc",
        },
      },
    },
  });

  const atrasados: any[] = [];
  const hojeLista: any[] = [];
  const aVencer: any[] = [];

  const limite3DiasUTC = new Date(hojeUTC);
  limite3DiasUTC.setUTCDate(hojeUTC.getUTCDate() + 3);

  for (const emp of emprestimos) {
    const valorEmprestadoNum = Number(emp.valor_emprestado);
    const taxaJurosNum = Number(emp.taxa_juros);

    for (const p of emp.parcelas) {
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
          cliente: {
            id: emp.cliente.id,
            nome: emp.cliente.nome,
            telefone: emp.cliente.telefone,
          },
        },
      };

      if (vencimentoUTC < hojeUTC) {
        atrasados.push(serializedParcela);
      } else if (vencimentoUTC.getTime() === hojeUTC.getTime()) {
        hojeLista.push(serializedParcela);
      } else if (vencimentoUTC > hojeUTC && vencimentoUTC <= limite3DiasUTC) {
        aVencer.push(serializedParcela);
      }
    }
  }

  const sortByDate = (a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  atrasados.sort(sortByDate);
  hojeLista.sort(sortByDate);
  aVencer.sort(sortByDate);

  return (
    <ClientCobrancasView 
      atrasados={atrasados}
      hojeLista={hojeLista}
      aVencer={aVencer}
    />
  );
}
