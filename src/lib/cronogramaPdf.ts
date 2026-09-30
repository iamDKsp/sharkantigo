import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ParcelaPdfItem {
  numero: number;
  data_vencimento: string | Date;
  valor: number;
  status?: string;
  data_pagamento?: string | Date | null;
  principal?: number;
  juros?: number;
  multa?: number;
}

export interface CronogramaPdfData {
  clienteNome: string;
  clienteDocumento?: string | null;
  tipoPagamento?: string;
  valorEmprestado: number;
  taxaJuros?: number;
  taxaMulta?: number;
  dataGeracao?: string | Date;
  parcelas: ParcelaPdfItem[];
}

export function formatarDataBr(d?: string | Date | null): string {
  if (!d) return "";
  if (typeof d === "string") {
    const raw = d.split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
  }
  const dt = new Date(d);
  const dia = String(dt.getUTCDate()).padStart(2, "0");
  const mes = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const ano = dt.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

export function getTipoModalityTitle(tipo?: string): string {
  switch (tipo) {
    case "parcelado":
      return "CRONOGRAMA DE PARCELAS - FIXAS";
    case "a_vista":
      return "CRONOGRAMA DE PARCELAS - À VISTA";
    case "a_vista_juros":
      return "CRONOGRAMA DE PARCELAS - FIXAS";
    case "juros_mensais":
      return "CRONOGRAMA DE PARCELAS - JUROS MENSAIS";
    case "parcela_juros_mes":
      return "CRONOGRAMA DE PARCELAS - FIXAS";
    case "juros_compostos":
      return "CRONOGRAMA DE PARCELAS - JUROS COMPOSTOS";
    default:
      return "CRONOGRAMA DE PARCELAS - FIXAS";
  }
}

export function formatarStatusParcela(status?: string, dataVencimento?: string | Date): string {
  if (!status) return "A Vencer";
  const st = status.toLowerCase();
  if (st === "pago" || st === "pago_com_atraso" || st === "quitado") {
    return "Pago";
  }
  if (st === "atrasado") {
    return "Atrasado";
  }

  // Se estiver "aberto", checar se a data já venceu
  if (dataVencimento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVencimento);
    if (venc < hoje) {
      return "Atrasado";
    }
  }

  return "A Vencer";
}

/**
 * Calcula a decomposição de Principal, Juros e Multa para cada parcela de acordo com a modalidade
 */
export function calcularLinhasParcelas(data: CronogramaPdfData) {
  const { valorEmprestado, parcelas, tipoPagamento } = data;
  const totalParcelas = parcelas.length || 1;

  let principalRestante = valorEmprestado;

  return parcelas.map((p, index) => {
    const isLast = index === totalParcelas - 1;
    let principal = 0;
    let juros = 0;
    const multa = p.multa ?? 0;
    const total = p.valor;

    if (p.principal !== undefined && p.juros !== undefined) {
      principal = p.principal;
      juros = p.juros;
    } else if (tipoPagamento === "a_vista") {
      principal = total;
      juros = 0;
    } else if (tipoPagamento === "a_vista_juros") {
      principal = valorEmprestado;
      juros = Math.max(0, total - valorEmprestado);
    } else if (tipoPagamento === "juros_mensais") {
      if (isLast) {
        principal = valorEmprestado;
        juros = Math.max(0, total - valorEmprestado);
      } else {
        principal = 0;
        juros = total;
      }
    } else {
      // Parcelado normal ou fixas
      const parcelaPrincipalBase = Number((valorEmprestado / totalParcelas).toFixed(2));
      if (isLast) {
        principal = Number(principalRestante.toFixed(2));
      } else {
        principal = parcelaPrincipalBase;
        principalRestante -= parcelaPrincipalBase;
      }
      juros = Math.max(0, Number((total - principal).toFixed(2)));
    }

    const statusFormatado = formatarStatusParcela(p.status, p.data_vencimento);

    return {
      numero: p.numero,
      vencimento: formatarDataBr(p.data_vencimento),
      principal: formatarMoeda(principal),
      juros: formatarMoeda(juros),
      multa: formatarMoeda(multa),
      total: formatarMoeda(total),
      status: statusFormatado,
      valorTotalNum: total,
    };
  });
}

/**
 * Gera a instância do jsPDF pronta para salvar no cliente ou exportar como buffer/base64 no servidor
 */
export function gerarCronogramaPdf(data: CronogramaPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const marginX = 40;

  // 1. Título Principal
  const title = getTipoModalityTitle(data.tipoPagamento);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(title, marginX, 55);

  // 2. Cliente
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const clienteTexto = `Cliente: ${(data.clienteNome || "NÃO INFORMADO").toUpperCase()}`;
  doc.text(clienteTexto, marginX, 85);

  // 3. Data de Geração
  const dataHojeStr = data.dataGeracao ? formatarDataBr(data.dataGeracao) : formatarDataBr(new Date());
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text(`Gerado em: ${dataHojeStr}`, marginX, 102);

  // 4. Subtítulo: Detalhamento das Parcelas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // #1E293B
  doc.text("DETALHAMENTO DAS PARCELAS", marginX, 142);

  // 5. Linhas da Tabela
  const linhasCalculadas = calcularLinhasParcelas(data);
  const tableRows = linhasCalculadas.map((item) => [
    String(item.numero),
    item.vencimento,
    item.principal,
    item.juros,
    item.multa,
    item.total,
    item.status,
  ]);

  const totalGeralNum = linhasCalculadas.reduce((acc, curr) => acc + curr.valorTotalNum, 0);

  // 6. Renderizar Tabela com AutoTable
  autoTable(doc, {
    startY: 156,
    head: [["Parcela", "Vencimento", "Principal", "Juros", "Multa", "Total", "Status"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [11, 25, 44], // #0B192C Azul Marinho Escuro
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 9,
      cellPadding: 7,
      lineWidth: 0.5,
      lineColor: [11, 25, 44],
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8.5,
      cellPadding: 7,
      lineWidth: 0.5,
      lineColor: [226, 232, 240], // #E2E8F0
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 42 }, // Parcela
      1: { halign: "center", cellWidth: 76 }, // Vencimento
      2: { halign: "center", cellWidth: 80 }, // Principal
      3: { halign: "center", cellWidth: 66 }, // Juros
      4: { halign: "center", cellWidth: 64 }, // Multa
      5: { halign: "center", fontStyle: "bold", cellWidth: 88 }, // Total
      6: { halign: "center", cellWidth: 88 }, // Status
    },
    margin: { left: marginX, right: marginX },
  });

  // 7. Total Geral Centralizado abaixo da tabela
  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Geral: ${formatarMoeda(totalGeralNum)}`, pageWidth / 2, finalY + 32, {
    align: "center",
  });

  return doc;
}

/**
 * Função utilitária para download direto no navegador (Client-side)
 */
export function baixarCronogramaPdfCliente(data: CronogramaPdfData, nomeArquivoCustom?: string) {
  const doc = gerarCronogramaPdf(data);
  const clienteSlug = (data.clienteNome || "cliente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  
  const nomeArquivo = nomeArquivoCustom || `cronograma-${clienteSlug}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Função utilitária para gerar Base64 do PDF (Server-side / WhatsApp)
 */
export function obterCronogramaPdfBase64(data: CronogramaPdfData): string {
  const doc = gerarCronogramaPdf(data);
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer).toString("base64");
}
