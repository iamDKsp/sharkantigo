"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Loader2, Send, X, XCircle } from "lucide-react";
import { enviarCobranca } from "./actions";
import type { Parcela, TipoCobranca } from "./tipos";

interface DisparoModalProps {
  /** Parcelas selecionadas (já limitadas às visíveis na lista). */
  itens: Parcela[];
  tipo: TipoCobranca;
  cobradasHoje: Set<string>;
  onClose: () => void;
  /** Chamado com os ids efetivamente enviados (para atualizar selos e seleção). */
  onEnviados: (ids: string[]) => void;
}

type Fase = "confirmar" | "enviando" | "fim";
type LogTipo = "info" | "ok" | "erro" | "aviso";
interface LogLinha {
  tipo: LogTipo;
  texto: string;
}
interface Resumo {
  enviados: number;
  falhas: number;
  ignorados: number;
  cancelado: boolean;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Disparo em massa em 3 passos: confirmar (com prévia da mensagem) → enviar
 * (progresso real, dá para cancelar) → resumo (com "reenviar falhas").
 * O envio roda no SERVIDOR, parcela por parcela, e cada um entra no histórico.
 */
export default function DisparoModal({ itens, tipo, cobradasHoje, onClose, onEnviados }: DisparoModalProps) {
  const [fase, setFase] = useState<Fase>("confirmar");
  const [pularCobrados, setPularCobrados] = useState(true);
  const [logs, setLogs] = useState<LogLinha[]>([]);
  const [progresso, setProgresso] = useState(0);
  const [resumo, setResumo] = useState<Resumo>({ enviados: 0, falhas: 0, ignorados: 0, cancelado: false });
  const [idsFalha, setIdsFalha] = useState<string[]>([]);
  const cancelarRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  const jaCobrados = itens.filter((p) => cobradasHoje.has(p.id));
  const alvo = pularCobrados ? itens.filter((p) => !cobradasHoje.has(p.id)) : itens;
  const previa = alvo[0] ?? itens[0];
  const minutos = Math.max(1, Math.round((alvo.length * 1.6) / 60));

  // Rola o log sozinho para a linha mais nova
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  // Esc fecha (menos durante o envio)
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && fase !== "enviando" && onClose();
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [fase, onClose]);

  const add = (tipoLog: LogTipo, texto: string) => setLogs((prev) => [...prev, { tipo: tipoLog, texto }]);

  const executar = async (lista: Parcela[]) => {
    if (lista.length === 0) return;
    cancelarRef.current = false;
    setFase("enviando");
    setLogs([]);
    setProgresso(0);
    setIdsFalha([]);

    let enviados = 0;
    let falhas = 0;
    let ignorados = 0;
    let cancelado = false;
    const idsOk: string[] = [];
    const idsErro: string[] = [];

    for (let i = 0; i < lista.length; i++) {
      if (cancelarRef.current) {
        cancelado = true;
        break;
      }
      const p = lista[i];
      const nome = p.emprestimo.cliente.nome;
      add("info", `[${i + 1}/${lista.length}] Enviando para ${nome}…`);

      try {
        const res = await enviarCobranca(p.id, tipo);
        if (res.enviado) {
          enviados++;
          idsOk.push(p.id);
          add("ok", `Enviado para ${nome}.`);
        } else if (res.ignorado) {
          ignorados++;
          add("aviso", `Mensagem desativada nas configurações — nada enviado para ${nome}.`);
        } else {
          falhas++;
          idsErro.push(p.id);
          add("erro", `Falha para ${nome}: ${res.erro || "erro desconhecido"}.`);
        }
      } catch (err) {
        falhas++;
        idsErro.push(p.id);
        const msg = err instanceof Error ? err.message : String(err);
        add("erro", `Falha de conexão (${nome}): ${msg}. Verifique se o WhatsApp está conectado no Perfil.`);
      }

      setProgresso(Math.round(((i + 1) / lista.length) * 100));
      if (i < lista.length - 1) await dormir(1000); // ritmo seguro para não bloquear o número
    }

    setResumo({ enviados, falhas, ignorados, cancelado });
    setIdsFalha(idsErro);
    if (idsOk.length > 0) onEnviados(idsOk);
    setFase("fim");
  };

  const fechar = () => fase !== "enviando" && onClose();

  const corLog: Record<LogTipo, string> = {
    info: "text-slate-500",
    ok: "text-emerald-700",
    erro: "text-red-600 font-semibold",
    aviso: "text-amber-700",
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in"
      onClick={fechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Disparo de cobranças em massa"
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 animate-scale-up"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm">Disparo de cobranças em massa</h3>
          </div>
          {fase !== "enviando" && (
            <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1. CONFIRMAR */}
        {fase === "confirmar" && (
          <div className="space-y-4 animate-tab-in">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Serão enviadas</div>
                <div className="text-2xl font-black text-emerald-600 leading-tight">{alvo.length}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tempo estimado</div>
                <div className="text-2xl font-black text-slate-700 leading-tight">~{minutos} min</div>
              </div>
            </div>

            {jaCobrados.length > 0 && (
              <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pularCobrados}
                  onChange={(e) => setPularCobrados(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs text-amber-900">
                  <strong className="font-bold">Pular quem já foi cobrado hoje</strong>
                  <span className="block text-amber-700/90 mt-0.5">
                    {jaCobrados.length} {jaCobrados.length === 1 ? "cliente já recebeu" : "clientes já receberam"} cobrança hoje.
                  </span>
                </span>
              </label>
            )}

            {previa && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Prévia — exemplo com {previa.emprestimo.cliente.nome}
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-emerald-50 border border-emerald-100 px-3.5 py-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {previa.mensagem}
                </div>
                <p className="text-[11px] text-slate-400">Cada cliente recebe a mensagem com os próprios dados.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-press px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                disabled={alvo.length === 0}
                onClick={() => executar(alvo)}
                className="btn-press flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar {alvo.length} {alvo.length === 1 ? "mensagem" : "mensagens"}
              </button>
            </div>
          </div>
        )}

        {/* 2 e 3. ENVIANDO / RESUMO */}
        {fase !== "confirmar" && (
          <div className="space-y-4 animate-tab-in">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  {fase === "enviando" && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                  {fase === "enviando" ? "Enviando…" : resumo.cancelado ? "Envio cancelado" : "Concluído"}
                </span>
                <span className="tabular-nums">{progresso}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${fase === "enviando" ? "progress-stripes" : ""} ${
                    fase === "fim" && resumo.falhas > 0 ? "bg-amber-500" : "bg-emerald-600"
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>

            <div ref={logRef} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 h-44 overflow-y-auto text-xs space-y-1.5">
              {logs.map((l, i) => (
                <div key={i} className={`leading-relaxed animate-tab-in ${corLog[l.tipo]}`}>
                  {l.texto}
                </div>
              ))}
            </div>

            {fase === "fim" && (
              <div className="grid grid-cols-3 gap-2 animate-tab-in">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-2 py-2.5 text-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  <div className="text-lg font-black text-emerald-700 leading-tight">{resumo.enviados}</div>
                  <div className="text-[10px] font-bold text-emerald-700/80 uppercase">Enviadas</div>
                </div>
                <div className={`rounded-xl border px-2 py-2.5 text-center ${resumo.falhas > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <XCircle className={`w-4 h-4 mx-auto ${resumo.falhas > 0 ? "text-red-600" : "text-slate-400"}`} />
                  <div className={`text-lg font-black leading-tight ${resumo.falhas > 0 ? "text-red-700" : "text-slate-500"}`}>{resumo.falhas}</div>
                  <div className={`text-[10px] font-bold uppercase ${resumo.falhas > 0 ? "text-red-700/80" : "text-slate-400"}`}>Falhas</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-2 py-2.5 text-center">
                  <Ban className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="text-lg font-black text-slate-500 leading-tight">{resumo.ignorados}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Desativadas</div>
                </div>
              </div>
            )}

            {fase === "fim" && resumo.falhas > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                Algumas mensagens falharam. Confira a conexão do WhatsApp e tente reenviar só as que falharam.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {fase === "enviando" ? (
                <button
                  type="button"
                  onClick={() => {
                    cancelarRef.current = true;
                    add("aviso", "Cancelando… o envio atual termina e o restante é interrompido.");
                  }}
                  className="btn-press px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar envio
                </button>
              ) : (
                <>
                  {idsFalha.length > 0 && (
                    <button
                      type="button"
                      onClick={() => executar(itens.filter((p) => idsFalha.includes(p.id)))}
                      className="btn-press px-5 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold shadow-md shadow-amber-500/25 cursor-pointer"
                    >
                      Reenviar {idsFalha.length} {idsFalha.length === 1 ? "falha" : "falhas"}
                    </button>
                  )}
                  <button type="button" onClick={onClose} className="btn-press px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
