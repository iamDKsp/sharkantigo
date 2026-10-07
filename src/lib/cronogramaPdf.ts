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
  atrasoTipo?: string | null;
  atrasoValor?: number | null;
  observacoes?: string | null;
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
  }).format(val || 0).replace(/\u00A0/g, " ");
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
      0: { halign: "center", cellWidth: 45 }, // Parcela
      1: { halign: "center", cellWidth: 75 }, // Vencimento
      2: { halign: "center", cellWidth: 80 }, // Principal
      3: { halign: "center", cellWidth: 70 }, // Juros
      4: { halign: "center", cellWidth: 70 }, // Multa
      5: { halign: "center", fontStyle: "bold", cellWidth: 88 }, // Total
      6: { halign: "center", cellWidth: 87.28 }, // Status
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

  // 8. Observações / Condições em Caso de Atraso
  const textoAtraso = obterTextoAtrasoPdf(data.atrasoTipo, data.atrasoValor);
  const obsLimpa = data.observacoes?.replace(/\[DIA_BASE:\s*\d+\]/gi, "").trim();

  if (textoAtraso || obsLimpa) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const boxWidth = pageWidth - marginX * 2;
    const paddingX = 14;
    const paddingY = 12;
    const maxTextWidth = boxWidth - paddingX * 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    let linhasAtraso: string[] = [];
    if (textoAtraso) {
      linhasAtraso = doc.splitTextToSize(textoAtraso, maxTextWidth);
    }

    let linhasObs: string[] = [];
    if (obsLimpa) {
      linhasObs = doc.splitTextToSize(`Observações adicionais: ${obsLimpa}`, maxTextWidth);
    }

    const espacoLinha = 11.5;
    let alturaConteudo = 14; // Altura do cabeçalho da caixa
    if (linhasAtraso.length > 0) {
      alturaConteudo += 6 + linhasAtraso.length * espacoLinha;
    }
    if (linhasObs.length > 0) {
      alturaConteudo += (linhasAtraso.length > 0 ? 8 : 4) + linhasObs.length * espacoLinha;
    }

    const boxHeight = alturaConteudo + paddingY * 2;

    let startY = finalY + 50;
    // Se não couber na página atual, move para uma nova página
    if (startY + boxHeight > pageHeight - 40) {
      doc.addPage();
      startY = 40;
    }

    // Fundo do card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(marginX, startY, boxWidth, boxHeight, 6, 6, "FD");

    // Barra lateral de destaque
    doc.setFillColor(15, 23, 42); // #0F172A
    doc.roundedRect(marginX, startY, 4, boxHeight, 2, 2, "F");

    // Cabeçalho
    let cursorY = startY + paddingY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("CONDIÇÕES EM CASO DE ATRASO NO PAGAMENTO", marginX + paddingX, cursorY);

    cursorY += 13;

    // Texto de atraso
    if (linhasAtraso.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(linhasAtraso, marginX + paddingX, cursorY);
      cursorY += linhasAtraso.length * espacoLinha + 6;
    }

    // Observações adicionais
    if (linhasObs.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(linhasObs, marginX + paddingX, cursorY);
    }
  }

  return doc;
}

/**
 * Retorna o texto formal e profissional de cobrança moratória por atraso diário
 */
export function obterTextoAtrasoPdf(tipo?: string | null, valor?: number | null): string | null {
  const val = Number(valor);
  if (!tipo || !val || val <= 0) return null;

  if (tipo === "fixo_dia") {
    const valorFmt = formatarMoeda(val);
    return `Em caso de atraso ou inadimplemento no pagamento de qualquer parcela, incidirá acréscimo moratório no valor fixo de ${valorFmt} por dia de atraso, calculado a partir do primeiro dia subsequente ao vencimento até a efetiva quitação.`;
  }

  if (tipo === "percentual_dia") {
    return `Em caso de atraso ou inadimplemento no pagamento de qualquer parcela, incidirão juros moratórios à razão de ${val}% ao dia sobre o valor da parcela em aberto, calculados a partir do primeiro dia subsequente ao vencimento até a efetiva quitação.`;
  }

  return null;
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
