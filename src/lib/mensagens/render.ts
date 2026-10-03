/**
 * Renderizador de mensagens (puro: funciona no servidor e no navegador).
 * Sintaxe das variáveis: {nome}, {valor}, {data}… (compatível com os modelos antigos).
 */
import { VARIAVEIS, type VariavelId, type ContextoMensagem } from "./catalogo";

const REGEX_VARIAVEL = /\{(\w+)\}/g;

export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

/** Datas do banco são @db.Date (meia-noite UTC), por isso timeZone UTC. */
export function formatarDataUTC(data: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(data));
}

export function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || "").trim().split(/\s+/)[0] || "";
}

/** Lista as variáveis `{xxx}` usadas no texto (sem repetir). */
export function extrairVariaveis(texto: string): string[] {
  const achadas = new Set<string>();
  for (const m of texto.matchAll(REGEX_VARIAVEL)) achadas.add(m[1]);
  return [...achadas];
}

export interface ValidacaoTexto {
  /** Variáveis que não existem no sistema (provável erro de digitação). */
  desconhecidas: string[];
  /** Existem, mas não fazem sentido nesta mensagem (ficariam vazias). */
  foraDoContexto: string[];
  ok: boolean;
}

export function validarTexto(texto: string, permitidas: readonly VariavelId[]): ValidacaoTexto {
  const usadas = extrairVariaveis(texto);
  const desconhecidas = usadas.filter((v) => !(v in VARIAVEIS));
  const foraDoContexto = usadas.filter((v) => v in VARIAVEIS && !permitidas.includes(v as VariavelId));
  return { desconhecidas, foraDoContexto, ok: desconhecidas.length === 0 && foraDoContexto.length === 0 };
}

export interface ResultadoRender {
  texto: string;
  /** Variáveis que ficaram vazias (desconhecidas ou sem valor no contexto). */
  vazias: string[];
}

/**
 * Substitui as variáveis. Variável desconhecida ou sem valor vira vazio
 * (nunca vaza `{xyz}` cru para o cliente) e é reportada em `vazias`.
 */
export function renderizar(texto: string, contexto: ContextoMensagem): ResultadoRender {
  const vazias = new Set<string>();
  const resultado = texto.replace(REGEX_VARIAVEL, (_m, nome: string) => {
    const valor = (contexto as Record<string, string | undefined>)[nome];
    if (valor === undefined || valor === "") {
      vazias.add(nome);
      return "";
    }
    return valor;
  });
  // Limpa espaços duplicados que sobram de variáveis vazias, sem mexer em quebras de linha.
  const limpo = resultado.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  return { texto: limpo, vazias: [...vazias] };
}

/**
 * Normaliza o telefone para o formato do serviço de WhatsApp (somente dígitos
 * com DDI 55). Usado também nos links wa.me, que exigem o DDI.
 */
export function normalizarTelefone(telefone: string): string {
  let digitos = (telefone || "").replace(/\D/g, "");
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) return digitos;
  if (digitos.length === 10 || digitos.length === 11) digitos = "55" + digitos;
  return digitos;
}

export function linkWhatsapp(telefone: string, texto?: string): string {
  const base = `https://wa.me/${normalizarTelefone(telefone)}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
