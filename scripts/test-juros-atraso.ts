// Teste do cálculo de juros de atraso (puro).
// Rodar: npx tsx scripts/test-juros-atraso.ts
import assert from "node:assert/strict";
import { calcularJurosAtraso, descreverRegraAtraso, diasDeAtraso, lerRegraAtraso } from "../src/lib/jurosAtraso";

let ok = 0;
const t = (nome: string, fn: () => void) => { fn(); ok++; console.log("OK", nome); };

const hoje = new Date(Date.UTC(2026, 9, 4)); // 04/10/2026
const venc = (d: number) => new Date(Date.UTC(2026, 9, d)); // dia d de outubro

t("sem atraso (vence hoje ou no futuro) = 0", () => {
  assert.deepEqual(calcularJurosAtraso({ tipo: "fixo_dia", valor: 50 }, 1000, venc(4), hoje), { dias: 0, juros: 0 });
  assert.deepEqual(calcularJurosAtraso({ tipo: "fixo_dia", valor: 50 }, 1000, venc(10), hoje), { dias: 0, juros: 0 });
});

t("fixo por dia: R$ 50 × 4 dias = R$ 200", () => {
  assert.deepEqual(calcularJurosAtraso({ tipo: "fixo_dia", valor: 50 }, 1000, venc(0 + 1) /* 01/10 = 3 dias */, hoje), { dias: 3, juros: 150 });
  assert.deepEqual(calcularJurosAtraso({ tipo: "fixo_dia", valor: 50 }, 1000, new Date(Date.UTC(2026, 8, 30)), hoje), { dias: 4, juros: 200 });
});

t("percentual por dia sobre a parcela (simples)", () => {
  assert.deepEqual(calcularJurosAtraso({ tipo: "percentual_dia", valor: 1 }, 1000, new Date(Date.UTC(2026, 8, 30)), hoje), { dias: 4, juros: 40 });
  assert.equal(calcularJurosAtraso({ tipo: "percentual_dia", valor: 0.5 }, 203.3, new Date(Date.UTC(2026, 8, 30)), hoje).juros, 4.07);
});

t("empréstimo antigo / regra desligada não cobra", () => {
  assert.equal(calcularJurosAtraso({ tipo: "nenhum", valor: 50 }, 1000, venc(1), hoje).juros, 0);
  assert.equal(calcularJurosAtraso({ tipo: null, valor: null }, 1000, venc(1), hoje).juros, 0);
  assert.equal(calcularJurosAtraso({ tipo: "fixo_dia", valor: 0 }, 1000, venc(1), hoje).juros, 0);
});

t("diasDeAtraso ignora hora do vencimento", () => {
  assert.equal(diasDeAtraso(new Date(Date.UTC(2026, 9, 3, 23, 59)), hoje), 1);
});

t("descreverRegraAtraso", () => {
  assert.match(descreverRegraAtraso({ tipo: "fixo_dia", valor: 50 }), /50,00 por dia/);
  assert.equal(descreverRegraAtraso({ tipo: "percentual_dia", valor: 1.5 }), "1.5% ao dia");
  assert.equal(descreverRegraAtraso({ tipo: "nenhum", valor: 0 }), "Não cobra");
});

t("lerRegraAtraso sanea o formulário", () => {
  const f = (o: Record<string, string>) => { const fd = new FormData(); for (const k in o) fd.set(k, o[k]); return fd; };
  assert.deepEqual(lerRegraAtraso(f({ atrasoTipo: "fixo_dia", atrasoValor: "50" })), { tipo: "fixo_dia", valor: 50, taxaMulta: 0 });
  assert.deepEqual(lerRegraAtraso(f({ atrasoTipo: "percentual_dia", atrasoValor: "2,5" })), { tipo: "percentual_dia", valor: 2.5, taxaMulta: 2.5 });
  assert.deepEqual(lerRegraAtraso(f({ atrasoTipo: "fixo_dia", atrasoValor: "0" })), { tipo: "nenhum", valor: 0, taxaMulta: 0 });
  assert.deepEqual(lerRegraAtraso(f({ atrasoTipo: "xyz", atrasoValor: "10" })), { tipo: "nenhum", valor: 0, taxaMulta: 0 });
  assert.deepEqual(lerRegraAtraso(f({})), { tipo: "nenhum", valor: 0, taxaMulta: 0 });
});

console.log(`\n${ok} testes OK`);
