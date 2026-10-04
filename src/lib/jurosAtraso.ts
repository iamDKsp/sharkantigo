/**
 * Juros de atraso (puro: usado no servidor e nos componentes client).
 *
 * Regra: o juros é cobrado POR DIA de atraso, de forma simples (sem juros sobre juros):
 *  - "fixo_dia":       valor (R$) × dias de atraso          ex.: R$ 50/dia × 4 dias = R$ 200
 *  - "percentual_dia": valor da parcela × (% / 100) × dias  ex.: 1% de R$ 1.000 × 4 dias = R$ 40
 * Sem limite de acúmulo. Empréstimos antigos ficam em "nenhum" (nada é cobrado).
 */
export type TipoAtraso = "nenhum" | "percentual_dia" | "fixo_dia";

export interface RegraAtraso {
  tipo: string | null | undefined;
  valor: number | null | undefined;
}

const MS_DIA = 86_400_000;

function meiaNoiteUTC(d: Date | string): number {
  const x = new Date(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

/** Dias corridos de atraso (0 se ainda não venceu). `hoje` = hojeEmBrasilia(). */
export function diasDeAtraso(vencimento: Date | string, hoje: Date): number {
  const dias = Math.floor((hoje.getTime() - meiaNoiteUTC(vencimento)) / MS_DIA);
  return Math.max(0, dias);
}

export function regraAtiva(regra: RegraAtraso): boolean {
  return (regra.tipo === "fixo_dia" || regra.tipo === "percentual_dia") && Number(regra.valor) > 0;
}

export interface CalculoAtraso {
  dias: number;
  juros: number;
}

export function calcularJurosAtraso(
  regra: RegraAtraso,
  valorParcela: number,
  vencimento: Date | string,
  hoje: Date
): CalculoAtraso {
  const dias = diasDeAtraso(vencimento, hoje);
  if (dias === 0 || !regraAtiva(regra)) return { dias, juros: 0 };
  const valor = Number(regra.valor);
  const bruto = regra.tipo === "fixo_dia" ? valor * dias : valorParcela * (valor / 100) * dias;
  return { dias, juros: Math.round(bruto * 100) / 100 };
}

/** Texto curto da regra, para telas. Ex.: "R$ 50,00 por dia" / "1% ao dia". */
export function descreverRegraAtraso(regra: RegraAtraso): string {
  if (!regraAtiva(regra)) return "Não cobra";
  const valor = Number(regra.valor);
  if (regra.tipo === "fixo_dia") {
    return `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)} por dia`;
  }
  return `${valor}% ao dia`;
}

/**
 * Lê e saneia a regra enviada pelos formulários (campos `atrasoTipo` e `atrasoValor`).
 * `taxaMulta` é mantido por compatibilidade com as colunas antigas (taxa_multa/juros_atraso,
 * Decimal(5,2)): só é preenchido quando a regra é percentual.
 */
export function lerRegraAtraso(formData: FormData): { tipo: TipoAtraso; valor: number; taxaMulta: number } {
  const tipoBruto = String(formData.get("atrasoTipo") ?? "nenhum");
  const valorBruto = Number(String(formData.get("atrasoValor") ?? "0").replace(",", "."));
  const tipo: TipoAtraso = tipoBruto === "fixo_dia" || tipoBruto === "percentual_dia" ? tipoBruto : "nenhum";
  const valor = Number.isFinite(valorBruto) && valorBruto > 0 ? Math.round(valorBruto * 100) / 100 : 0;
  if (tipo === "nenhum" || valor === 0) return { tipo: "nenhum", valor: 0, taxaMulta: 0 };
  return { tipo, valor, taxaMulta: tipo === "percentual_dia" ? Math.min(valor, 999.99) : 0 };
}
