// Teste rápido do núcleo puro: catálogo + renderizador.
// Rodar: npx tsx scripts/test-mensagens.ts
import assert from "node:assert/strict";
import {
  MENSAGENS, CONTEXTO_EXEMPLO, VARIAVEIS, chaveCobranca, getMensagemDef,
} from "../src/lib/mensagens/catalogo";
import {
  renderizar, validarTexto, normalizarTelefone, linkWhatsapp, extrairVariaveis, formatarBRL,
} from "../src/lib/mensagens/render";

let ok = 0;
const t = (nome: string, fn: () => void) => { fn(); ok++; console.log("✓", nome); };

t("chaves únicas", () => {
  const chaves = MENSAGENS.map((m) => m.chave);
  assert.equal(new Set(chaves).size, chaves.length);
});

t("todo texto padrão só usa variáveis permitidas e existentes", () => {
  for (const m of MENSAGENS) {
    const v = validarTexto(m.textoPadrao, m.variaveis);
    assert.ok(v.ok, `${m.chave}: ${JSON.stringify(v)}`);
  }
});

t("variáveis do catálogo têm exemplo", () => {
  for (const k of Object.keys(VARIAVEIS)) assert.ok((CONTEXTO_EXEMPLO as any)[k]);
});

t("renderiza todas as mensagens padrão com dados de exemplo sem sobrar chaves", () => {
  for (const m of MENSAGENS) {
    const r = renderizar(m.textoPadrao, CONTEXTO_EXEMPLO);
    assert.ok(!/\{\w+\}/.test(r.texto), m.chave);
    assert.equal(r.vazias.length, 0, m.chave);
  }
});

t("variável sem valor vira vazio (nunca vaza {xyz})", () => {
  const r = renderizar("Oi {nome}, {inexistente} {valor}!", { nome: "Ana" });
  assert.equal(r.texto, "Oi Ana, !");
  assert.deepEqual(r.vazias.sort(), ["inexistente", "valor"]);
});

t("preserva quebras de linha e emojis", () => {
  const r = renderizar("💳 *Para pagar:*\nPix: {pix_chave}\n\nOk", { pix_chave: "123" });
  assert.equal(r.texto, "💳 *Para pagar:*\nPix: 123\n\nOk");
});

t("validação detecta desconhecida e fora de contexto", () => {
  const def = getMensagemDef("cobranca.atrasado.avista")!;
  const v = validarTexto("{nome} {num} {abc}", def.variaveis);
  assert.deepEqual(v.desconhecidas, ["abc"]);
  assert.deepEqual(v.foraDoContexto, ["num"]);
});

t("chaveCobranca", () => {
  assert.equal(chaveCobranca("atrasados", false), "cobranca.atrasado.parcelado");
  assert.equal(chaveCobranca("aVencer", true), "cobranca.avencer.avista");
  assert.equal(chaveCobranca("hoje", false), "cobranca.hoje.parcelado");
});

t("normalizarTelefone / wa.me", () => {
  assert.equal(normalizarTelefone("(14) 99118-5521"), "5514991185521");
  assert.equal(normalizarTelefone("5514991185521"), "5514991185521");
  assert.equal(normalizarTelefone("1433334444"), "551433334444");
  assert.equal(linkWhatsapp("14991185521", "Oi & tchau"), "https://wa.me/5514991185521?text=Oi%20%26%20tchau");
});

t("extrairVariaveis", () => {
  assert.deepEqual(extrairVariaveis("{a} {b} {a}"), ["a", "b"]);
});

t("formatarBRL", () => {
  assert.match(formatarBRL(1200), /R\$\s?1\.200,00/);
});

console.log(`\n${ok} testes OK`);
