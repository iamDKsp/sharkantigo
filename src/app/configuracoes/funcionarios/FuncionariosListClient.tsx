"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  MessageCircle,
  Pencil,
  PhoneOff,
  Power,
  Shield,
  XCircle,
} from "lucide-react";
import { linkWhatsapp } from "@/lib/mensagens/render";
import Tooltip from "@/components/Tooltip";
import ModalDecisaoBaixa, { type BaixaParaDecisao } from "./ModalDecisaoBaixa";
import { alternarAtivoFuncionario } from "./actions";

export interface FuncionarioResumoAdm {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  foto_url: string | null;
  ativo: boolean;
  modo_baixa: string;
  ocultar_telefone: boolean;
  pode_ver_documentos: boolean;
  emprestimosAtivos: number;
  pendentesCount: number;
  recebidoMes: number;
}

export interface BaixaPendenteGlobal {
  id: string;
  funcionario_id: string;
  funcionarioNome: string;
  emprestimo_id: string;
  clienteNome: string;
  tipo: string;
  valor: number;
  forma_pagamento: string;
  observacao: string | null;
  criado_em: string;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function labelModoBaixa(m: string) {
  if (m === "direto") {
    return {
      texto: "Baixa Direta",
      dica: "Baixas feitas por este cobrador efetivam na hora e entram na prestação de contas",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (m === "nenhum") {
    return {
      texto: "Só Cobrança",
      dica: "Não pode dar baixa financeira — apenas cobra e registra relatos",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  return {
    texto: "Baixa c/ Aprovação",
    dica: "Recebimentos informados por ele passam pela sua aprovação antes de efetivar",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  };
}

function labelTipoBaixa(t: string) {
  if (t === "renovacao") return "Renovação (+30d)";
  if (t === "quitacao") return "Quitação";
  return "Parcela";
}

export default function FuncionariosListClient({
  funcionarios,
  pendentes,
}: {
  funcionarios: FuncionarioResumoAdm[];
  pendentes: BaixaPendenteGlobal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [decisao, setDecisao] = useState<{ baixa: BaixaParaDecisao; modo: "aprovar" | "recusar" } | null>(null);
  const [toast, setToast] = useState<{ texto: string; saindo: boolean } | null>(null);

  const showToast = (texto: string) => {
    setToast({ texto, saindo: false });
    setTimeout(() => setToast((t) => (t ? { ...t, saindo: true } : null)), 2600);
    setTimeout(() => setToast(null), 2800);
  };

  const copiarLink = async (f: FuncionarioResumoAdm) => {
    const url = `${window.location.origin}/${f.slug}/cliente`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiadoId(f.id);
      showToast(`Link de ${f.nome} copiado!`);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      showToast(`Link: ${url}`);
    }
  };

  const linkEnvioWhatsapp = (f: FuncionarioResumoAdm) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${f.slug}/cliente`;
    const msg = `Olá ${f.nome}! Segue seu link de acesso ao painel de cobranças:\n\n${url}\n\nEntre usando a senha cadastrada.`;
    return linkWhatsapp(f.telefone || "", msg);
  };

  const toggleAtivo = (f: FuncionarioResumoAdm) => {
    setProcessandoId(f.id);
    startTransition(async () => {
      try {
        await alternarAtivoFuncionario(f.id, !f.ativo);
        showToast(f.ativo ? `${f.nome} desativado.` : `${f.nome} reativado!`);
        router.refresh();
      } finally {
        setProcessandoId(null);
      }
    });
  };

  return (
    <div className="space-y-5 motion-page-enter">
      {/* Toast animado */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-black shadow-xl border border-white/10 flex items-center gap-2 ${
            toast.saindo ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.texto}</span>
        </div>
      )}

      {/* Pendências Globais de Aprovação */}
      {pendentes.length > 0 && (
        <div className="animate-fade-in-up bg-amber-50/80 border border-amber-300 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <Clock className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-black text-amber-950">
                Pagamentos Aguardando Aprovação ({pendentes.length})
              </h2>
            </div>
          </div>
          <div className="divide-y divide-amber-200/70">
            {pendentes.map((b, idx) => (
              <div
                key={b.id}
                style={{ ["--i" as string]: Math.min(idx, 10) }}
                className="animate-row-in p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/75 hover:bg-white transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/emprestimos/${b.emprestimo_id}`}
                      className="font-black text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      {b.clienteNome}
                    </Link>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {b.funcionarioNome}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {labelTipoBaixa(b.tipo)} · {b.forma_pagamento}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enviado em {fmtDataHora(b.criado_em)}
                    {b.observacao ? ` · “${b.observacao}”` : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span className="font-black text-base text-emerald-700 tabular-nums mr-2">
                    {brl(b.valor)}
                  </span>
                  <Tooltip content="Recusar solicitação informando o motivo">
                    <button
                      type="button"
                      onClick={() => setDecisao({ baixa: b, modo: "recusar" })}
                      className="btn-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Recusar
                    </button>
                  </Tooltip>
                  <Tooltip content="Conferir e aprovar baixa financeira">
                    <button
                      type="button"
                      onClick={() => setDecisao({ baixa: b, modo: "aprovar" })}
                      className="btn-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Funcionários */}
      {funcionarios.length === 0 ? (
        <div className="animate-fade-in-up bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <Shield className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-black text-slate-700">Nenhum funcionário cadastrado</p>
          <p className="text-xs text-slate-500">
            Cadastre cobradores para delegar contratos, controlar permissões e acompanhar a prestação de contas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {funcionarios.map((f, idx) => {
            const mb = labelModoBaixa(f.modo_baixa);
            return (
              <div
                key={f.id}
                style={{ ["--i" as string]: Math.min(idx, 12) }}
                className={`animate-row-in bg-white border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 ${
                  f.ativo ? "border-slate-200" : "border-slate-200 opacity-75 bg-slate-50/70"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {f.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.foto_url}
                        alt={f.nome}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                        {f.nome.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/configuracoes/funcionarios/${f.id}`}
                          className="font-black text-base text-slate-900 hover:text-emerald-700 transition-colors truncate"
                        >
                          {f.nome}
                        </Link>
                        {!f.ativo && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            Desativado
                          </span>
                        )}
                        {f.pendentesCount > 0 && (
                          <span className="animate-pop text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            {f.pendentesCount} pendente(s)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tooltip content={mb.dica}>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border cursor-default ${mb.cls}`}>
                            {mb.texto}
                          </span>
                        </Tooltip>
                        {f.ocultar_telefone && (
                          <Tooltip content="Telefone dos clientes oculto — só cobra pelo WhatsApp do sistema">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 cursor-default">
                              <PhoneOff className="w-3 h-3" /> Tel. oculto
                            </span>
                          </Tooltip>
                        )}
                        {f.pode_ver_documentos && (
                          <Tooltip content="Pode visualizar CPF e documentos anexados dos clientes da carteira">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 cursor-default">
                              <FileText className="w-3 h-3" /> Docs liberados
                            </span>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                        <Tooltip content="Abrir a tela de login deste cobrador em nova aba">
                          <a
                            href={`/${f.slug}/cliente`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            /{f.slug}/cliente <ExternalLink className="w-3 h-3" />
                          </a>
                        </Tooltip>
                        <span>· {f.emprestimosAtivos} ativo(s)</span>
                        <span className="font-bold text-emerald-700">
                          · Mês: {brl(f.recebidoMes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Tooltip content="Copiar link de acesso para mandar ao funcionário">
                      <button
                        type="button"
                        onClick={() => copiarLink(f)}
                        className="btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {copiadoId === f.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-pop" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiadoId === f.id ? "Copiado!" : "Copiar link"}
                      </button>
                    </Tooltip>

                    {f.telefone && (
                      <Tooltip content="Abrir WhatsApp com o link de acesso pronto">
                        <a
                          href={linkEnvioWhatsapp(f)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Enviar acesso
                        </a>
                      </Tooltip>
                    )}

                    <Tooltip content="Editar dados, foto, senha e permissões">
                      <Link
                        href={`/configuracoes/funcionarios/${f.id}/editar`}
                        className="btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Link>
                    </Tooltip>

                    <Tooltip content={f.ativo ? "Bloquear login imediatamente" : "Liberar acesso novamente"}>
                      <button
                        type="button"
                        disabled={isPending && processandoId === f.id}
                        onClick={() => toggleAtivo(f)}
                        className={`btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 ${
                          f.ativo
                            ? "bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {f.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </Tooltip>

                    <Tooltip content="Ver prestação de contas, carteira e relatos">
                      <Link
                        href={`/configuracoes/funcionarios/${f.id}`}
                        className="btn-press inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
                      >
                        Painel <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {decisao && (
        <ModalDecisaoBaixa
          baixa={decisao.baixa}
          modo={decisao.modo}
          onClose={() => setDecisao(null)}
          onDone={(msg) => {
            setDecisao(null);
            showToast(msg);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
