/**
 * Utilitários de data que respeitam o fuso horário de Brasília (America/Sao_Paulo, UTC-3 / UTC-2 no verão).
 *
 * Problema: tanto em Server Components quanto em ambientes com `getUTC*`, o
 * JavaScript trata o instante atual como UTC.  Às 22:00 BRT já é 01:00 UTC do
 * dia seguinte, fazendo o sistema mostrar "amanhã" como "hoje".
 *
 * Solução: usar Intl.DateTimeFormat com timeZone: "America/Sao_Paulo" para
 * extrair ano/mês/dia no fuso correto e montar um Date.UTC puro (para que a
 * comparação com datas de vencimento armazenadas como UTC meia-noite funcione).
 */

const TZ = "America/Sao_Paulo";

/**
 * Retorna um Date representando meia-noite UTC do "hoje" em Brasília.
 * Funciona corretamente tanto em Server Components (UTC puro) quanto em
 * Client Components (fuso do browser) e durante o horário de verão.
 */
export function hojeEmBrasilia(): Date {
  const agora = new Date();
  // Extrai as partes da data no fuso de Brasília
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);

  const year  = Number(parts.find(p => p.type === "year")!.value);
  const month = Number(parts.find(p => p.type === "month")!.value) - 1; // 0-indexed
  const day   = Number(parts.find(p => p.type === "day")!.value);

  return new Date(Date.UTC(year, month, day));
}
