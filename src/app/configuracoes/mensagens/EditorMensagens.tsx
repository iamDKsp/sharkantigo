"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  CONTEXTO_EXEMPLO,
  GRUPOS,
  VARIAVEIS,
  VARIAVEIS_IDS,
  type ConfiguracoesBase,
  type GrupoMensagem,
  type VariavelId,
} from "@/lib/mensagens/catalogo";
import { renderizar, validarTexto } from "@/lib/mensagens/render";
import {
  enviarTeste,
  importarModelosAntigos,
  restaurarMensagem,
  salvarConfiguracoes,
  salvarMensagem,
  salvarRespostasRapidas,
} from "./actions";

export interface MensagemEditavel {
  chave: string;
  grupo: GrupoMensagem;
  titulo: string;
  descricao: string;
  textoPadrao: string;
  variaveis: VariavelId[];
  padraoAtivo: boolean;
  podeDesativar: boolean;
  texto: string;
  ativo: boolean;
  personalizado: boolean;
}

type Secao = GrupoMensagem | "respostas" | "pix";

const SECOES: { id: Secao; titulo: string }[] = [
  { id: "cobranca", titulo: GRUPOS.cobranca.titulo },
  { id: "confirmacoes", titulo: GRUPOS.confirmacoes.titulo },
  { id: "eventos", titulo: GRUPOS.eventos.titulo },
  { id: "respostas", titulo: "Respostas rápidas" },
  { id: "pix", titulo: "Pix e empresa" },
];

// Chaves antigas guardadas no navegador (antes das mensagens irem para o banco)
const LEGADO_TEMPLATES: Record<string, string> = {
  template_atrasados: "cobranca.atrasado.parcelado",
  template_hoje: "cobranca.hoje.parcelado",
  template_aVencer: "cobranca.avencer.parcelado",
  template_atrasados_avista: "cobranca.atrasado.avista",
  template_hoje_avista: "cobranca.hoje.avista",
  template_avencer_avista: "cobranca.avencer.avista",
};
const LEGADO_OUTRAS = ["template_pix_chave", "template_pix_titular", "wa_templates", "sol_wa_templates"];
const CHAVE_TELEFONE_TESTE = "sol_wa_telefone_teste";

type Status = { tipo: "ok" | "erro" | "aviso"; texto: string } | null;

function StatusLinha({ status }: { status: Status }) {
  if (!status) return null;
  const cor =
    status.tipo === "ok"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status.tipo === "aviso"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <div className={`text-xs font-semibold border rounded-lg px-3 py-2 ${cor}`} role="status">
      {status.texto}
    </div>
  );
}

/** Balão no estilo WhatsApp com a pré-visualização. */
function Balao({ texto }: { texto: string }) {
  return (
    <div className="bg-[#e7f5dc] border border-emerald-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-w-full">
      {texto || <span className="text-slate-400">(mensagem vazia)</span>}
    </div>
  );
}

function ChipsVariaveis({
  variaveis,
  onInserir,
}: {
  variaveis: readonly VariavelId[];
  onInserir: (v: VariavelId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variaveis.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInserir(v)}
          title={`${VARIAVEIS[v].descricao} — ex.: ${VARIAVEIS[v].exemplo}`}
          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 border border-slate-200 text-[11px] font-mono font-bold text-slate-600 transition-colors cursor-pointer"
        >
          {`{${v}}`}
        </button>
      ))}
    </div>
  );
}

/** Insere `{variavel}` na posição do cursor de um textarea controlado. */
function inserirNoCursor(
  el: HTMLTextAreaElement | null,
  atual: string,
  variavel: VariavelId,
  set: (v: string) => void
) {
  const token = `{${variavel}}`;
  if (!el) {
    set(atual + token);
    return;
  }
  const ini = el.selectionStart ?? atual.length;
  const fim = el.selectionEnd ?? atual.length;
  const novo = atual.slice(0, ini) + token + atual.slice(fim);
  set(novo);
  requestAnimationFrame(() => {
    el.focus();
    const pos = ini + token.length;
    el.setSelectionRange(pos, pos);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de uma mensagem
// ─────────────────────────────────────────────────────────────────────────────

function CardMensagem({ m, telefoneTeste }: { m: MensagemEditavel; telefoneTeste: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [base, setBase] = useState({ texto: m.texto, ativo: m.ativo });
  const [texto, setTexto] = useState(m.texto);
  const [ativo, setAtivo] = useState(m.ativo);
  const [status, setStatus] = useState<Status>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const validacao = useMemo(() => validarTexto(texto, m.variaveis), [texto, m.variaveis]);
  const dirty = texto !== base.texto || ativo !== base.ativo;
  const diferenteDoPadrao = texto.trim() !== m.textoPadrao.trim() || ativo !== m.padraoAtivo;
  const preview = useMemo(() => renderizar(texto, CONTEXTO_EXEMPLO).texto, [texto]);
  const ehCobranca = m.chave.startsWith("cobranca.") && m.chave !== "cobranca.rodape";

  const salvar = () => {
    setStatus(null);
    startTransition(async () => {
      const r = await salvarMensagem(m.chave, texto, ativo);
      if (r.ok) {
        setBase({ texto, ativo });
        setStatus({ tipo: "ok", texto: "Salvo! Já vale para os próximos envios." });
        router.refresh();
      } else {
        setStatus({ tipo: "erro", texto: r.erro || "Erro ao salvar." });
      }
    });
  };

  const restaurar = () => {
    if (!confirm("Voltar esta mensagem para o texto padrão do sistema?")) return;
    setStatus(null);
    startTransition(async () => {
      const r = await restaurarMensagem(m.chave);
      if (r.ok) {
        setTexto(m.textoPadrao);
        setAtivo(m.padraoAtivo);
        setBase({ texto: m.textoPadrao, ativo: m.padraoAtivo });
        setStatus({ tipo: "ok", texto: "Texto padrão restaurado." });
        router.refresh();
      } else {
        setStatus({ tipo: "erro", texto: r.erro || "Erro ao restaurar." });
      }
    });
  };

  const testar = () => {
    setStatus(null);
    if (telefoneTeste.replace(/\D/g, "").length < 10) {
      setStatus({ tipo: "aviso", texto: "Preencha “Meu número para testes” no topo da página." });
      return;
    }
    startTransition(async () => {
      const r = await enviarTeste(m.chave, texto, telefoneTeste);
      setStatus(
        r.ok
          ? { tipo: "ok", texto: "Teste enviado para o seu WhatsApp (com dados fictícios)." }
          : { tipo: "erro", texto: r.erro || "Falha ao enviar o teste." }
      );
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-extrabold text-sm text-slate-900">{m.titulo}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{m.descricao}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {m.personalizado && !dirty && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200">
              Editada
            </span>
          )}
          {m.podeDesativar && (
            <button
              type="button"
              role="switch"
              aria-checked={ativo}
              onClick={() => setAtivo(!ativo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                ativo ? "bg-emerald-600" : "bg-slate-300"
              }`}
              title={ativo ? "Ligada: será enviada" : "Desligada: não será enviada"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  ativo ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {!ativo && m.podeDesativar && (
        <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Desligada: o sistema não envia esta mensagem. Ligue o botão e salve para ativar.
        </p>
      )}

      <textarea
        ref={ref}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={m.chave === "cobranca.rodape" ? 8 : 4}
        maxLength={2000}
        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
      />

      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Clique para inserir no cursor
        </span>
        <ChipsVariaveis variaveis={m.variaveis} onInserir={(v) => inserirNoCursor(ref.current, texto, v, setTexto)} />
      </div>

      {!validacao.ok && (
        <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            {validacao.malformadas.length > 0 &&
              `Chave mal fechada: ${validacao.malformadas.map((v) => `“${v}”`).join(", ")}. Use o formato {data}. `}
            {validacao.desconhecidas.length > 0 &&
              `Variável inexistente: ${validacao.desconhecidas.map((v) => `{${v}}`).join(", ")}. `}
            {validacao.foraDoContexto.length > 0 &&
              `Não se aplica a esta mensagem: ${validacao.foraDoContexto.map((v) => `{${v}}`).join(", ")}.`}
          </span>
        </p>
      )}

      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Pré-visualização (dados fictícios)
        </span>
        <Balao texto={preview} />
        {ehCobranca && (
          <p className="text-[10px] text-slate-400">
            O rodapé de pagamento (aba “Cobranças” → “Rodapé das cobranças”) é anexado ao final.
          </p>
        )}
        <p className="text-[10px] text-slate-400">{texto.length}/2000 caracteres</p>
      </div>

      <StatusLinha status={status} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={salvar}
          disabled={!dirty || !validacao.ok || isPending}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </button>
        <button
          type="button"
          onClick={testar}
          disabled={!validacao.ok || isPending}
          className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-emerald-600" /> Enviar teste
        </button>
        {diferenteDoPadrao && (
          <button
            type="button"
            onClick={restaurar}
            disabled={isPending}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Respostas rápidas
// ─────────────────────────────────────────────────────────────────────────────

function SecaoRespostas({ inicial }: { inicial: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lista, setLista] = useState<string[]>(inicial);
  const [status, setStatus] = useState<Status>(null);
  const [focado, setFocado] = useState<number | null>(null);
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const alterar = (i: number, v: string) => setLista((l) => l.map((t, idx) => (idx === i ? v : t)));
  const mover = (i: number, dir: -1 | 1) =>
    setLista((l) => {
      const j = i + dir;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const salvar = () => {
    setStatus(null);
    startTransition(async () => {
      const r = await salvarRespostasRapidas(lista);
      if (r.ok) {
        setLista(lista.map((t) => t.trim()).filter(Boolean));
        setStatus({ tipo: "ok", texto: "Respostas rápidas salvas. Valem em Clientes, Empréstimos e detalhes." });
        router.refresh();
      } else {
        setStatus({ tipo: "erro", texto: r.erro || "Erro ao salvar." });
      }
    });
  };

  return (
    <div id="respostas" className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <p className="text-[11px] text-slate-500">
          São os atalhos do botão de WhatsApp nas telas de Clientes, Empréstimos e detalhe do empréstimo. Agora existe
          uma única lista para todo o sistema, e ela aceita variáveis como <code className="font-mono">{"{nome}"}</code>.
        </p>

        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Clique para inserir na mensagem selecionada
          </span>
          <ChipsVariaveis
            variaveis={VARIAVEIS_IDS}
            onInserir={(v) => {
              if (focado === null) {
                setStatus({ tipo: "aviso", texto: "Clique primeiro dentro de uma das mensagens." });
                return;
              }
              inserirNoCursor(refs.current[focado], lista[focado] ?? "", v, (n) => alterar(focado, n));
            }}
          />
        </div>

        <div className="space-y-3">
          {lista.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">Nenhuma resposta rápida. Adicione a primeira abaixo.</p>
          )}
          {lista.map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <textarea
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  value={t}
                  onFocus={() => setFocado(i)}
                  onChange={(e) => alterar(i, e.target.value)}
                  rows={2}
                  maxLength={2000}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
                <p className="text-[10px] text-slate-400 whitespace-pre-wrap">
                  Prévia: {renderizar(t, CONTEXTO_EXEMPLO).texto || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                  aria-label="Subir"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === lista.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                  aria-label="Descer"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLista((l) => l.filter((_, idx) => idx !== i))}
                  className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLista((l) => [...l, ""])}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Adicionar resposta
        </button>

        <StatusLinha status={status} />

        <button
          type="button"
          onClick={salvar}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar respostas rápidas
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pix e empresa
// ─────────────────────────────────────────────────────────────────────────────

function SecaoPix({ inicial }: { inicial: ConfiguracoesBase }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cfg, setCfg] = useState<ConfiguracoesBase>(inicial);
  const [status, setStatus] = useState<Status>(null);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const r = await salvarConfiguracoes(cfg);
      if (r.ok) {
        setStatus({
          tipo: r.avisos && r.avisos.length > 0 ? "aviso" : "ok",
          texto: r.avisos && r.avisos.length > 0 ? `Salvo. ${r.avisos.join(" ")}` : "Dados salvos.",
        });
        router.refresh();
      } else {
        setStatus({ tipo: "erro", texto: r.erro || "Erro ao salvar." });
      }
    });
  };

  const campo =
    "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <form
      id="pix"
      onSubmit={salvar}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <p className="text-[11px] text-slate-500">
        Estes dados alimentam as variáveis <code className="font-mono">{"{pix_chave}"}</code>,{" "}
        <code className="font-mono">{"{pix_titular}"}</code> e <code className="font-mono">{"{empresa}"}</code> em todas as
        mensagens desta base.
      </p>

      {!cfg.pix_chave.trim() && (
        <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Chave Pix não cadastrada: o rodapé de pagamento NÃO será enviado nas cobranças.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-slate-700 text-xs block mb-1">Chave Pix e banco</label>
          <input
            className={campo}
            value={cfg.pix_chave}
            onChange={(e) => setCfg({ ...cfg, pix_chave: e.target.value })}
            placeholder="Ex.: 11999998888 (Banco)"
            maxLength={200}
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 text-xs block mb-1">Nome do titular do Pix</label>
          <input
            className={campo}
            value={cfg.pix_titular}
            onChange={(e) => setCfg({ ...cfg, pix_titular: e.target.value })}
            placeholder="Ex.: João da Silva"
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="font-bold text-slate-700 text-xs block mb-1">Nome da empresa</label>
          <input
            className={campo}
            value={cfg.empresa_nome}
            onChange={(e) => setCfg({ ...cfg, empresa_nome: e.target.value })}
            placeholder="Ex.: Soluções Financeiras"
            maxLength={200}
          />
        </div>
      </div>

      <StatusLinha status={status} />

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Salvar dados
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────

function lerListaLegada(chave: string): string[] {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return [];
    const v = JSON.parse(bruto);
    return Array.isArray(v) ? v.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function EditorMensagens({
  mensagens,
  config,
  respostas,
}: {
  mensagens: MensagemEditavel[];
  config: ConfiguracoesBase;
  respostas: string[];
}) {
  const router = useRouter();
  const [secao, setSecao] = useState<Secao>("cobranca");
  const [telefoneTeste, setTelefoneTeste] = useState("");
  const [temLegado, setTemLegado] = useState(false);
  const [importando, startImport] = useTransition();
  const [statusImport, setStatusImport] = useState<Status>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "pix" || hash === "respostas") setSecao(hash);
    setTelefoneTeste(localStorage.getItem(CHAVE_TELEFONE_TESTE) || "");
    const achou = [...Object.keys(LEGADO_TEMPLATES), ...LEGADO_OUTRAS].some((k) => localStorage.getItem(k));
    setTemLegado(achou);
  }, []);

  const mudarTelefone = (v: string) => {
    setTelefoneTeste(v);
    localStorage.setItem(CHAVE_TELEFONE_TESTE, v);
  };

  const importarLegado = () => {
    setStatusImport(null);
    const templates: Record<string, string> = {};
    for (const [antiga, chave] of Object.entries(LEGADO_TEMPLATES)) {
      const v = localStorage.getItem(antiga);
      if (v && v.trim()) templates[chave] = v;
    }
    // Duas listas antigas e independentes (detalhe x lista): une sem repetir.
    const uniao = [...new Set([...lerListaLegada("sol_wa_templates"), ...lerListaLegada("wa_templates")])];

    startImport(async () => {
      const r = await importarModelosAntigos({
        templates,
        pix_chave: localStorage.getItem("template_pix_chave") || undefined,
        pix_titular: localStorage.getItem("template_pix_titular") || undefined,
        respostas: uniao.length > 0 ? uniao : undefined,
      });
      if (r.ok) {
        // Só limpa o navegador depois de confirmar que o banco recebeu tudo.
        [...Object.keys(LEGADO_TEMPLATES), ...LEGADO_OUTRAS].forEach((k) => localStorage.removeItem(k));
        setTemLegado(false);
        setStatusImport({
          tipo: r.avisos && r.avisos.length > 0 ? "aviso" : "ok",
          texto:
            `${r.importados} item(ns) importado(s) para o banco.` +
            (r.avisos && r.avisos.length > 0 ? ` Não importados: ${r.avisos.join(" | ")}` : ""),
        });
        router.refresh();
      } else {
        setStatusImport({ tipo: "erro", texto: r.erro || "Falha ao importar." });
      }
    });
  };

  const doGrupo = mensagens.filter((m) => m.grupo === secao);
  const grupoInfo = secao in GRUPOS ? GRUPOS[secao as GrupoMensagem] : null;

  return (
    <div className="space-y-4">
      {temLegado && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-xs text-sky-900">
            <p className="font-extrabold">Encontramos modelos salvos neste navegador.</p>
            <p className="mt-0.5">
              Importe para o banco para que valham em qualquer dispositivo. Os modelos antigos só serão apagados do
              navegador depois que a importação der certo.
            </p>
          </div>
          <button
            type="button"
            onClick={importarLegado}
            disabled={importando}
            className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            {importando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Importar agora
          </button>
        </div>
      )}
      {statusImport && <StatusLinha status={statusImport} />}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="font-bold text-slate-700 text-xs block mb-1">Meu número para testes</label>
        <input
          value={telefoneTeste}
          onChange={(e) => mudarTelefone(e.target.value)}
          placeholder="(14) 99999-9999"
          inputMode="tel"
          className="w-full sm:w-72 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Usado pelo botão “Enviar teste”. Fica salvo só neste navegador e o teste usa dados fictícios.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {SECOES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={secao === s.id}
            onClick={() => setSecao(s.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              secao === s.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.titulo}
          </button>
        ))}
      </div>

      {grupoInfo && (
        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-px" />
          {grupoInfo.descricao}
        </p>
      )}

      {grupoInfo && (
        <div className="space-y-4">
          {doGrupo.map((m) => (
            <CardMensagem key={m.chave} m={m} telefoneTeste={telefoneTeste} />
          ))}
        </div>
      )}

      {secao === "respostas" && <SecaoRespostas inicial={respostas} />}
      {secao === "pix" && <SecaoPix inicial={config} />}
    </div>
  );
}
