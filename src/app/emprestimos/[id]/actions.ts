"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Pagar Próxima Parcela (com ou sem atraso)
export async function payNextInstallment(emprestimoId: string, withDelay: boolean) {
  const hoje = new Date();

  // Buscar a primeira parcela em aberto ordenada por número
  const proximaParcela = await prisma.parcela.findFirst({
    where: { emprestimo_id: emprestimoId, status: "aberto" },
    orderBy: { numero: "asc" },
  });

  if (!proximaParcela) {
    throw new Error("Não há parcelas em aberto para este empréstimo.");
  }

  // Atualizar a parcela para paga
  await prisma.parcela.update({
    where: { id: proximaParcela.id },
    data: {
      status: withDelay ? "pago_com_atraso" : "pago",
      data_pagamento: hoje,
      valor_pago: proximaParcela.valor,
    },
  });

  // Verificar se ainda existem parcelas em aberto
  const parcelasRestantes = await prisma.parcela.count({
    where: { emprestimo_id: emprestimoId, status: "aberto" },
  });

  if (parcelasRestantes === 0) {
    // Determinar se o empréstimo total teve pagamentos atrasados
    const temAtrasadas = await prisma.parcela.count({
      where: { emprestimo_id: emprestimoId, status: "pago_com_atraso" },
    });

    await prisma.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        status: temAtrasadas > 0 ? "quitado_com_atraso" : "quitado",
      },
    });
  }

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true };
}

// 2. Quitação Total (com ou sem atraso)
export async function payFullLoan(emprestimoId: string, withDelay: boolean) {
  const hoje = new Date();

  await prisma.$transaction(async (tx) => {
    // Atualizar todas as parcelas abertas
    const parcelasAbertas = await tx.parcela.findMany({
      where: { emprestimo_id: emprestimoId, status: "aberto" },
    });

    for (const p of parcelasAbertas) {
      await tx.parcela.update({
        where: { id: p.id },
        data: {
          status: withDelay ? "pago_com_atraso" : "pago",
          data_pagamento: hoje,
          valor_pago: p.valor,
        },
      });
    }

    // Atualizar status do empréstimo
    await tx.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        status: withDelay ? "quitado_com_atraso" : "quitado",
      },
    });
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true };
}

// 3. Renegociar Dívida (Abater valores + aplicar juros opcional sobre o saldo devedor)
export async function renegociarEmprestimo(
  emprestimoId: string,
  valorAbatido: number,
  aplicarJuros: boolean,
  taxaJuros: number
) {
  const hoje = new Date();

  if (valorAbatido <= 0) {
    throw new Error("O valor a ser abatido deve ser maior que zero.");
  }

  await prisma.$transaction(async (tx) => {
    // Buscar parcelas abertas do empréstimo
    const parcelasAbertas = await tx.parcela.findMany({
      where: { emprestimo_id: emprestimoId, status: "aberto" },
      orderBy: { numero: "asc" },
    });

    let restanteAbater = valorAbatido;

    for (const p of parcelasAbertas) {
      if (restanteAbater <= 0) break;

      const valorParcela = Number(p.valor);

      if (restanteAbater >= valorParcela) {
        // Paga a parcela inteira
        await tx.parcela.update({
          where: { id: p.id },
          data: {
            status: "pago",
            data_pagamento: hoje,
            valor_pago: p.valor,
          },
        });
        restanteAbater -= valorParcela;
      } else {
        // Paga parcialmente a parcela
        const novoValor = valorParcela - restanteAbater;
        await tx.parcela.update({
          where: { id: p.id },
          data: {
            valor: novoValor,
          },
        });
        restanteAbater = 0;
      }
    }

    // Buscar parcelas abertas atualizadas pós-abatimento
    const parcelasAbertasPosAbate = await tx.parcela.findMany({
      where: { emprestimo_id: emprestimoId, status: "aberto" },
      orderBy: { numero: "asc" },
    });

    if (parcelasAbertasPosAbate.length === 0) {
      // Quitou tudo
      await tx.emprestimo.update({
        where: { id: emprestimoId },
        data: { status: "quitado" },
      });
    } else {
      // Se tiver saldo restante, vamos renegociar: aplicar juros se escolhido e empurrar vencimento +1 mês
      const saldoDevedor = parcelasAbertasPosAbate.reduce((acc, p) => acc + Number(p.valor), 0);
      let jurosAdicional = 0;
      
      if (aplicarJuros && taxaJuros > 0) {
        jurosAdicional = saldoDevedor * (taxaJuros / 100);
      }

      // Distribuir o juros proporcionalmente nas parcelas abertas e empurrar data
      for (const p of parcelasAbertasPosAbate) {
        const proporcao = Number(p.valor) / saldoDevedor;
        const novoValor = Number(p.valor) + jurosAdicional * proporcao;

        const novoVencimento = new Date(p.data_vencimento);
        novoVencimento.setUTCMonth(novoVencimento.getUTCMonth() + 1);

        await tx.parcela.update({
          where: { id: p.id },
          data: {
            valor: Number(novoValor.toFixed(2)),
            data_vencimento: novoVencimento,
          },
        });
      }

      // Atualizar o vencimento global do empréstimo
      const lastParcela = parcelasAbertasPosAbate[parcelasAbertasPosAbate.length - 1];
      const novoVencGlobal = new Date(lastParcela.data_vencimento);
      novoVencGlobal.setUTCMonth(novoVencGlobal.getUTCMonth() + 1);
      
      await tx.emprestimo.update({
        where: { id: emprestimoId },
        data: { data_vencimento: novoVencGlobal }
      });
    }
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true };
}

// 4. Reprogramar Empréstimo (Nova data de vencimento + dinheiro extra opcional + juros opcional + nova frequência)
export async function reprogramarEmprestimo(
  emprestimoId: string,
  novaDataVencimento: string,
  principalExtra: number,
  taxaJuros: number,
  frequencia: string
) {
  if (!novaDataVencimento) {
    throw new Error("A data de vencimento é obrigatória.");
  }

  await prisma.$transaction(async (tx) => {
    // Buscar parcelas abertas
    const parcelasAbertas = await tx.parcela.findMany({
      where: { emprestimo_id: emprestimoId, status: "aberto" },
      orderBy: { numero: "asc" },
    });

    if (parcelasAbertas.length === 0) {
      throw new Error("Não existem parcelas em aberto para reprogramar.");
    }

    let saldoDevedor = parcelasAbertas.reduce((acc, p) => acc + Number(p.valor), 0);

    // 1. Somar dinheiro extra (se houver)
    if (principalExtra > 0) {
      saldoDevedor += principalExtra;
      // Atualizar o valor emprestado do registro pai
      const empAtual = await tx.emprestimo.findUnique({ where: { id: emprestimoId } });
      if (empAtual) {
        await tx.emprestimo.update({
          where: { id: emprestimoId },
          data: {
            valor_emprestado: Number(empAtual.valor_emprestado) + principalExtra,
          },
        });
      }
    }

    // 2. Aplicar taxa de juros (se houver)
    if (taxaJuros > 0) {
      saldoDevedor = saldoDevedor * (1 + taxaJuros / 100);
    }

    // 3. Redistribuir valores nas parcelas em aberto e reprogramar datas baseado na nova frequência
    const totalParcelas = parcelasAbertas.length;
    const valorCadaParcela = Number((saldoDevedor / totalParcelas).toFixed(2));

    // Parse da data inicial em UTC para evitar offset local shifts
    const [year, month, day] = novaDataVencimento.split("-").map(Number);
    const firstDueDateUTC = new Date(Date.UTC(year, month - 1, day));

    const addPeriod = (startDate: Date, index: number, freq: string) => {
      const d = new Date(startDate.getTime());
      if (freq === "diario") {
        d.setUTCDate(d.getUTCDate() + index);
      } else if (freq === "semanal") {
        d.setUTCDate(d.getUTCDate() + index * 7);
      } else if (freq === "quinzenal") {
        d.setUTCDate(d.getUTCDate() + index * 15);
      } else if (freq === "mensal") {
        d.setUTCMonth(d.getUTCMonth() + index);
      }
      return d;
    };

    let finalDueDate = firstDueDateUTC;

    for (let i = 0; i < totalParcelas; i++) {
      const p = parcelasAbertas[i];
      const pDate = addPeriod(firstDueDateUTC, i, frequencia);
      
      if (i === totalParcelas - 1) {
        finalDueDate = pDate;
      }

      await tx.parcela.update({
        where: { id: p.id },
        data: {
          valor: valorCadaParcela,
          data_vencimento: pDate,
        },
      });
    }

    // 4. Atualizar o vencimento e frequência do empréstimo pai
    await tx.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        data_vencimento: finalDueDate,
        frequencia: frequencia,
      },
    });
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true };
}

// 5. Alternar Blacklist do Cliente
export async function toggleClientBlacklist(clientId: string, currentStatus: boolean, emprestimoId: string) {
  await prisma.cliente.update({
    where: { id: clientId },
    data: { blacklist: !currentStatus },
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { success: true };
}

// 6. Excluir Empréstimo
export async function deleteLoan(id: string) {
  await prisma.emprestimo.delete({
    where: { id },
  });

  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true, redirectUrl: "/emprestimos" };
}

// 7. Receber só os juros (Renovar +30d)
export async function receberSoJurosEmprestimo(emprestimoId: string) {
  const hoje = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Encontra o empréstimo com as parcelas abertas
    const emprestimo = await tx.emprestimo.findUnique({
      where: { id: emprestimoId },
      include: { parcelas: { where: { status: "aberto" }, orderBy: { numero: "asc" } } },
    });

    if (!emprestimo || emprestimo.parcelas.length === 0) {
      throw new Error("Empréstimo não encontrado ou sem parcelas em aberto.");
    }

    // 2. Pega a primeira parcela em aberto
    const parcelaAtual = emprestimo.parcelas[0];

    // 3. Calcula juros do empréstimo (baseado no valor original emprestado)
    const valorEmprestado = Number(emprestimo.valor_emprestado);
    const taxaJuros = Number(emprestimo.taxa_juros);
    const valorJuros = valorEmprestado * (taxaJuros / 100);

    if (valorJuros <= 0) {
      throw new Error("O empréstimo não possui taxa de juros configurada para calcular o recebimento.");
    }

    // 4. Modifica a parcela atual para ser APENAS o valor dos juros, e marca como paga
    await tx.parcela.update({
      where: { id: parcelaAtual.id },
      data: {
        valor: valorJuros,
        valor_pago: valorJuros,
        status: "pago",
        data_pagamento: hoje,
      },
    });

    // 5. Cria uma NOVA parcela com o valor integral original (Principal + Juros)
    // O vencimento será +1 mês em relação à parcela atual.
    const novoVencimento = new Date(parcelaAtual.data_vencimento);
    novoVencimento.setUTCMonth(novoVencimento.getUTCMonth() + 1);

    // Identificar o número da nova parcela
    const ultimaParcela = await tx.parcela.findFirst({
      where: { emprestimo_id: emprestimoId },
      orderBy: { numero: "desc" },
    });
    const novoNumero = (ultimaParcela?.numero || parcelaAtual.numero) + 1;

    await tx.parcela.create({
      data: {
        emprestimo_id: emprestimoId,
        numero: novoNumero,
        valor: parcelaAtual.valor, // Valor cheio da parcela original que foi postergada
        data_vencimento: novoVencimento,
        status: "aberto",
      },
    });

    // 6. O vencimento global do empréstimo também deve refletir
    await tx.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        data_vencimento: novoVencimento,
      },
    });
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true };
}

// 8. Editar Empréstimo Completo
export async function updateEmprestimo(emprestimoId: string, formData: FormData) {
  const clienteId    = formData.get("clienteId") as string;
  const parceiroId   = (formData.get("parceiroId") as string) || null;
  const valorEmprestado  = Number(formData.get("valorEmprestado"));
  const tipoPagamento    = formData.get("tipoPagamento") as string;
  const frequencia       = formData.get("frequencia") as string;
  const taxaJuros        = Number(formData.get("taxaJuros")) || 0;
  const taxaMulta        = Number(formData.get("taxaMulta")) || 0;
  const dataInicioStr    = formData.get("dataInicio") as string;
  const dataVencimentoStr= formData.get("dataVencimento") as string;
  const categoria        = formData.get("categoria") as string;
  const observacoes      = formData.get("observacoes") as string;
  const parcelasJson     = formData.get("parcelasJson") as string;
  const recriarParcelas  = formData.get("recriarParcelas") === "true";

  if (!clienteId || !valorEmprestado || !dataInicioStr || !dataVencimentoStr) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Atualizar os dados principais do empréstimo
    await tx.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        cliente_id:       clienteId,
        parceiro_id:      parceiroId,
        valor_emprestado: valorEmprestado,
        taxa_juros:       taxaJuros,
        taxa_multa:       taxaMulta,
        juros_atraso:     taxaMulta,
        data_inicio:      new Date(dataInicioStr),
        data_vencimento:  new Date(dataVencimentoStr),
        tipo_pagamento:   tipoPagamento,
        frequencia:       frequencia,
        categoria:        categoria || "Sem categoria",
        observacoes:      observacoes || null,
      },
    });

    // 2. Se solicitado, recriar as parcelas abertas
    if (recriarParcelas && parcelasJson) {
      let novasParcelas: { numero: number; valor: number; data_vencimento: string }[] = [];
      try {
        novasParcelas = JSON.parse(parcelasJson);
      } catch {
        throw new Error("Erro ao processar as parcelas.");
      }

      if (novasParcelas.length > 0) {
        // Deletar apenas as parcelas em aberto (preservar pagas)
        await tx.parcela.deleteMany({
          where: { emprestimo_id: emprestimoId, status: "aberto" },
        });

        // Descobrir o maior número de parcela atual (pagas) para continuar a numeração
        const ultimaPaga = await tx.parcela.findFirst({
          where: { emprestimo_id: emprestimoId },
          orderBy: { numero: "desc" },
        });
        const offsetNumero = ultimaPaga ? ultimaPaga.numero : 0;

        // Criar novas parcelas a partir do offset
        await tx.parcela.createMany({
          data: novasParcelas.map((p, i) => ({
            emprestimo_id:   emprestimoId,
            numero:          offsetNumero + i + 1,
            valor:           p.valor,
            data_vencimento: new Date(p.data_vencimento),
            status:          "aberto",
          })),
        });
      }
    }
  });

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  return { success: true, redirectUrl: `/emprestimos/${emprestimoId}` };
}

// ── Data Prevista de Pagamento ──

/** Garante que a coluna existe no banco (idempotente). */
async function ensureColumnExists() {
  try {
    // PostgreSQL
    await prisma.$executeRaw`
      ALTER TABLE emprestimos
      ADD COLUMN IF NOT EXISTS data_prevista_pagamento DATE;
    `;
  } catch {
    try {
      // MySQL / MariaDB
      await prisma.$executeRaw`
        ALTER TABLE \`emprestimos\`
        ADD COLUMN \`data_prevista_pagamento\` DATE NULL;
      `;
    } catch (e2: any) {
      const msg = String(e2?.message ?? "");
      // 1060 = Duplicate column — coluna já existe, tudo certo
      if (!msg.includes("Duplicate column") && !msg.includes("1060") && !msg.includes("already exists")) {
        throw e2;
      }
    }
  }
}

export async function salvarDataPrevistaPagamento(
  emprestimoId: string,
  data: string | null
) {
  try {
    await prisma.emprestimo.update({
      where: { id: emprestimoId },
      data: {
        data_prevista_pagamento: data ? new Date(data) : null,
      },
    });
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    // Se o erro for "coluna não existe", aplica a migration e tenta de novo
    if (
      msg.includes("data_prevista_pagamento") ||
      msg.includes("Unknown column") ||
      msg.includes("column") ||
      msg.includes("does not exist")
    ) {
      await ensureColumnExists();
      await prisma.emprestimo.update({
        where: { id: emprestimoId },
        data: {
          data_prevista_pagamento: data ? new Date(data) : null,
        },
      });
    } else {
      throw err;
    }
  }

  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/emprestimos");
  revalidatePath("/cobrancas");
  return { success: true };
}
