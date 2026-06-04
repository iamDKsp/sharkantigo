import { prisma } from "./src/lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Iniciando processo de migração de dados...");

  try {
    // Lendo arquivos
    const clientesPath = path.resolve(process.cwd(), "clientes.json");
    const emprestimosPath = path.resolve(process.cwd(), "emprestimos.json");

    if (!fs.existsSync(clientesPath)) {
      throw new Error("Arquivo clientes.json não encontrado!");
    }
    if (!fs.existsSync(emprestimosPath)) {
      throw new Error("Arquivo emprestimos.json não encontrado!");
    }

    const clientes = JSON.parse(fs.readFileSync(clientesPath, "utf-8"));
    const emprestimos = JSON.parse(fs.readFileSync(emprestimosPath, "utf-8"));

    console.log(`Encontrados ${clientes.length} clientes e ${emprestimos.length} empréstimos no JSON.`);

    // Limpeza de tabelas envolvidas (exceto perfil)
    console.log("Limpando dados antigos do banco para evitar conflitos...");
    await prisma.parcela.deleteMany();
    await prisma.emprestimo.deleteMany();
    await prisma.cheque.deleteMany();
    await prisma.cliente.deleteMany();

    // 1. Importar Clientes
    console.log("Importando clientes...");
    let clientesCount = 0;
    for (const c of clientes) {
      await prisma.cliente.create({
        data: {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone || "",
          cidade: c.cidade || "",
          documento: c.documento || "",
          foto_url: c.foto_url || null,
        }
      });
      clientesCount++;
    }
    console.log(`✅ ${clientesCount} clientes importados.`);

    // 2. Importar Empréstimos e Gerar Parcelas
    console.log("Importando empréstimos e gerando parcelas dinamicamente...");
    let emprestimosCount = 0;
    let parcelasCount = 0;

    for (const emp of emprestimos) {
      // Regras de negócio da conversão
      const numParcelas = Number(emp.num_parcelas) || 1;
      const valor = Number(emp.valor_emprestado);
      const taxaJuros = Number(emp.taxa_juros);
      const tipoPagamento = numParcelas > 1 ? "parcelado" : "a_vista_juros";
      
      const empDataInicio = new Date(emp.data_inicio);
      const empDataVencimento = new Date(emp.data_vencimento);
      const statusEmp = emp.status || "ativo";

      const novoEmprestimo = await prisma.emprestimo.create({
        data: {
          id: emp.id,
          cliente_id: emp.cliente_id,
          valor_emprestado: valor,
          taxa_juros: taxaJuros,
          taxa_multa: Number(emp.taxa_multa) || 0,
          data_vencimento: empDataVencimento,
          status: statusEmp,
          tipo_pagamento: tipoPagamento,
          frequencia: "mensal",
          data_inicio: empDataInicio,
          juros_atraso: Number(emp.taxa_multa) || 0,
          categoria: "Sem categoria",
          observacoes: emp.observacoes || null,
        }
      });
      emprestimosCount++;

      // Geração de Parcelas
      const parcelasParaInserir = [];
      const valorComJuros = valor * (1 + taxaJuros / 100);

      if (numParcelas === 1) {
        // Se já foi pago no sistema legado (status = quitado)
        const parcelaStatus = statusEmp === "quitado" ? "pago" : "aberto";
        const dataPagamento = statusEmp === "quitado" ? empDataVencimento : null;
        
        parcelasParaInserir.push({
          emprestimo_id: novoEmprestimo.id,
          numero: 1,
          valor: valorComJuros,
          data_vencimento: empDataVencimento,
          status: parcelaStatus,
          data_pagamento: dataPagamento,
          valor_pago: parcelaStatus === "pago" ? valorComJuros : null,
        });
      } else {
        // Lógica para parcelado (gerando meses espaçados)
        const valorPorParcela = Number((valorComJuros / numParcelas).toFixed(2));
        
        for (let i = 0; i < numParcelas; i++) {
          const dtVencimento = new Date(empDataInicio);
          dtVencimento.setMonth(dtVencimento.getMonth() + i + 1);

          parcelasParaInserir.push({
            emprestimo_id: novoEmprestimo.id,
            numero: i + 1,
            valor: valorPorParcela,
            data_vencimento: dtVencimento,
            status: "aberto",
          });
        }
      }

      await prisma.parcela.createMany({
        data: parcelasParaInserir
      });
      parcelasCount += parcelasParaInserir.length;
    }

    console.log(`✅ ${emprestimosCount} empréstimos migrados com sucesso.`);
    console.log(`✅ ${parcelasCount} parcelas matematicamente geradas.`);

  } catch (error) {
    console.error("ERRO DURANTE A MIGRAÇÃO:", error);
  } finally {
    console.log("Processo finalizado.");
    process.exit(0);
  }
}

main();
