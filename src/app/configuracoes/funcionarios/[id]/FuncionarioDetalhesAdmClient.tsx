"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  History,
  MessageSquare,
  Pencil,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import ModalDecisaoBaixa, { type BaixaParaDecisao } from "../ModalDecisaoBaixa";
import {
  alternarWhatsappEmprestimo,
  removerDelegacaoEmprestimo,
} from "../actions";

export interface FuncionarioDetalheAdm {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  foto_url: string | null;
  ativo: boolean;
  modo_baixa: string;
  ocultar_telefone: boolean;
  pode_ver_documentos: boolean;
}

export interface EmprestimoCarteiraAdm {
  id: string;
  clienteNome: string;
  status: string;
  saldoAberto: number;
  maiorAtraso: number;
  podeDispararWhatsapp: boolean;
  dataPrevista: string | null;
}

export interface BaixaAdm {
  id: string;
  emprestimo_id: string;
  clienteNome: string;
  tipo: string;
  valor: number;
  juros_atraso: number;
  forma_pagamento: string;
  observacao: string | null;
  status: string;
  motivo_recusa: string | null;
  criado_em: string;
  decidido_em: string | null;
}

export interface RelatoAdm {
  id: string;
  emprestimo_id: string;
  clienteNome: string;
  tipo: string;
  texto: string;
  data_prometida: string | null;
  criado_em: string;
}

type Periodo = "hoje" | "7d" | "mes" | "mes_passado" | "tudo";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const fmtDataUTC = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

function labelTipoBaixa(t: string) {
  if (t === "renovacao") return "Renovação (+30d)";
  if (t === "quitacao") return "Quitação";
  return "Parcela";
}

export default function FuncionarioDetalhesAdmClient({
  funcionario,
  carteira,
  baixas,
  relatos,
}: {
  funcionario: FuncionarioDetalheAdm;
  carteira: EmprestimoCarteiraAdm[];
  baixas: BaixaAdm[];
  relatos: RelatoAdm[];
}) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [aba, setAba] = useState<"extrato" | "carteira" | "relatos">("extrato");
  const [copiado, setCopiado] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [decisao, setDecisao] = useState<{ baixa: BaixaParaDecisao; modo: "aprovar" | "recusar" } | null>(null);
  const [toast, setToast] = useState<{ texto: string; saindo: boolean } | null>(null);

  const showToast = (texto: string) => {
    setToast({ texto, saindo: false });
    setTimeout(() => setToast((t) => (t ? { ...t, saindo: true } : null)), 2600);
    setTimeout(() => setToast(null), 2800);
  };

  const pendentes = useMemo(() => baixas.filter((b) => b.status === "pendente"), [baixas]);

  const baixasPeriodo = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicio7d = new Date(inicioHoje);
    inicio7d.setDate(inicio7d.getDate() - 7);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

    return baixas.filter((b) => {
      if (b.status === "pendente") return false;
      const dt = new Date(b.criado_em);
      if (periodo === "hoje") return dt >= inicioHoje;
      if (periodo === "7d") return dt >= inicio7d;
      if (periodo === "mes") return dt >= inicioMes;
      if (periodo === "mes_passado") return dt >= inicioMesPassado && dt < inicioMes;
      return true;
    });
  }, [baixas, periodo]);

  const resumoFinanceiro = useMemo(() => {
    const efetivas = baixasPeriodo.filter((b) => b.status === "direta" || b.status === "aprovada");
    const total = efetivas.reduce((a, b) => a + b.valor, 0);
    const porForma: Record<string, number> = {};
    for (const b of efetivas) {
      porForma[b.forma_pagamento] = (porForma[b.forma_pagamento] || 0) + b.valor;
    }
    return { total, qtd: efetivas.length, porForma };
  }, [baixasPeriodo]);

  const totalCarteiraAtiva = useMemo(
    () => carteira.filter((c) => c.status === "ativo").reduce((a, c) => a + c.saldoAberto, 0),
    [carteira]
  );
  const atrasadosCount = useMemo(
    () => carteira.filter((c) => c.status === "ativo" && c.maiorAtraso > 0).length,
    [carteira]
  );

  const copiarLink = async () => {
    const url = `${window.location.origin}/${funcionario.slug}/cliente`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiado(true);
    showToast("Link de acesso copiado!");
    setTimeout(() => setCopiado(false), 2000);
  };

  const toggleWa = (c: EmprestimoCarteiraAdm) => {
    setBusyId(c.id);
    startTransition(async () => {
      try {
        await alternarWhatsappEmprestimo(c.id, !c.podeDispararWhatsapp, funcionario.id);
        showToast(
          !c.podeDispararWhatsapp
            ? `WhatsApp do sistema liberado para ${c.clienteNome}`
            : `WhatsApp do sistema bloqueado para ${c.clienteNome}`
        );
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  };

  const removerCarteira = (c: EmprestimoCarteiraAdm) => {
    if (!confirm(`Remover "${c.clienteNome}" da carteira de ${funcionario.nome}?`)) return;
    setBusyId(c.id);
    startTransition(async () => {
      try {
        await removerDelegacaoEmprestimo(c.id, funcionario.id);
        showToast(`${c.clienteNome} voltou para a carteira do ADM.`);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12 motion-page-enter">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/configuracoes/funcionarios"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Todos os Funcionários
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content="Copiar link de acesso para enviar no WhatsApp">
            <button
              type="button"
              onClick={copiarLink}
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pop" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? "Link copiado!" : "Copiar link"}
            </button>
          </Tooltip>
          <Tooltip content="Abrir a tela de acesso deste cobrador em nova aba">
            <a
              href={`/${funcionario.slug}/cliente`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-emerald-700"
            >
              Abrir painel <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Tooltip>
          <Tooltip content="Alterar foto, senha ou permissões">
            <Link
              href={`/configuracoes/funcionarios/${funcionario.id}/editar`}
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Link>
          </Tooltip>
        </div>
      </div>

      {/* Cabeçalho do Funcionário */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          {funcionario.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={funcionario.foto_url}
              alt={funcionario.nome}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xl font-black flex items-center justify-center shadow-xs">
              {funcionario.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{funcionario.nome}</h1>
              {!funcionario.ativo && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Desativado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              /{funcionario.slug}/cliente {funcionario.telefone ? `· ${funcionario.telefone}` : ""}
            </p>
          </div>
        </div>

        {/* Filtro de período */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "hoje", label: "Hoje" },
              { id: "7d", label: "7 dias" },
              { id: "mes", label: "Este mês" },
              { id: "mes_passado", label: "Mês passado" },
              { id: "tudo", label: "Tudo" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodo === p.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs de Prestação de Contas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div style={{ ["--i" as string]: 0 }} className="animate-row-in bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
            Arrecadado no Período
          </p>
          <p className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
            {brl(resumoFinanceiro.total)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {resumoFinanceiro.qtd} recebimento(s) efetivado(s)
          </p>
        </div>

        <div style={{ ["--i" as string]: 1 }} className="animate-row-in bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Por Forma (Período)
          </p>
          <div className="mt-1.5 space-y-0.5 text-xs">
            {Object.keys(resumoFinanceiro.porForma).length === 0 ? (
              <p className="text-slate-400 font-medium">Sem recebimentos</p>
            ) : (
              Object.entries(resumoFinanceiro.porForma).map(([forma, val]) => (
                <div key={forma} className="flex justify-between">
                  <span className="uppercase font-bold text-slate-500 text-[10px]">{forma}</span>
                  <span className="font-black text-slate-800 tabular-nums">{brl(val)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ ["--i" as string]: 2 }} className="animate-row-in bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Carteira Ativa
          </p>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">
            {brl(totalCarteiraAtiva)}
          </p>
          <p className="text-[11px] text-rose-600 font-bold mt-0.5">
            {atrasadosCount} em atraso · {carteira.length} contrato(s)
          </p>
        </div>

        <div style={{ ["--i" as string]: 3 }} className="animate-row-in bg-white border border-amber-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
            Pendentes Aprovação
          </p>
          <p className="text-xl font-black text-amber-700 mt-1 tabular-nums">
            {pendentes.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {brl(pendentes.reduce((a, b) => a + b.valor, 0))} aguardando
          </p>
        </div>
      </div>

      {/* Fila de Aprovações Pendentes */}
      {pendentes.length > 0 && (
        <div className="animate-fade-in-up bg-amber-50 border border-amber-300 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Clock className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-black text-amber-950">
              Fila de Aprovações Pendentes ({pendentes.length})
            </h2>
          </div>
          <div className="divide-y divide-amber-200/70">
            {pendentes.map((b) => (
              <div
                key={b.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 hover:bg-white transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/emprestimos/${b.emprestimo_id}`}
                      className="font-black text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      {b.clienteNome}
                    </Link>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {labelTipoBaixa(b.tipo)} · {b.forma_pagamento}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmtDataHora(b.criado_em)}
                    {b.observacao ? ` · “${b.observacao}”` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span className="font-black text-base text-emerald-700 mr-2 tabular-nums">
                    {brl(b.valor)}
                  </span>
                  <Tooltip content="Recusar informando motivo">
                    <button
                      type="button"
                      onClick={() =>
                        setDecisao({
                          baixa: { ...b, funcionarioNome: funcionario.nome },
                          modo: "recusar",
                        })
                      }
                      className="btn-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Recusar
                    </button>
                  </Tooltip>
                  <Tooltip content="Conferir e aprovar pagamento">
                    <button
                      type="button"
                      onClick={() =>
                        setDecisao({
                          baixa: { ...b, funcionarioNome: funcionario.nome },
                          modo: "aprovar",
                        })
                      }
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

      {/* Abas de Detalhe */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {(
            [
              { id: "extrato", label: `Prestação de Contas (${baixasPeriodo.length})`, icon: Wallet },
              { id: "carteira", label: `Carteira (${carteira.length})`, icon: AlertCircle },
              { id: "relatos", label: `Relatos (${relatos.length})`, icon: History },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  aba === t.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ABA 1: EXTRATO */}
        {aba === "extrato" && (
          <div key={`extrato-${periodo}`} className="animate-tab-in divide-y divide-slate-100">
            {baixasPeriodo.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhum recebimento registrado neste período.
              </p>
            ) : (
              baixasPeriodo.map((b, idx) => (
                <div
                  key={b.id}
                  style={{ ["--i" as string]: Math.min(idx, 12) }}
                  className="animate-row-in px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/emprestimos/${b.emprestimo_id}`}
                        className="font-black text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {b.clienteNome}
                      </Link>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          b.status === "recusada"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {b.status === "direta"
                          ? "Baixa Direta"
                          : b.status === "aprovada"
                            ? "Aprovada"
                            : "Recusada"}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {b.forma_pagamento}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {labelTipoBaixa(b.tipo)} · {fmtDataHora(b.criado_em)}
                      {b.observacao ? ` · “${b.observacao}”` : ""}
                    </p>
                    {b.motivo_recusa && (
                      <p className="text-xs text-rose-600 font-semibold mt-0.5">
                        Motivo: {b.motivo_recusa}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-black text-sm tabular-nums shrink-0 ${
                      b.status === "recusada" ? "text-slate-400 line-through" : "text-emerald-700"
                    }`}
                  >
                    {brl(b.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA 2: CARTEIRA */}
        {aba === "carteira" && (
          <div key="carteira" className="animate-tab-in divide-y divide-slate-100">
            {carteira.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhum empréstimo atribuído a este funcionário. Passe contratos pela tela de Cobranças ou pelo detalhe do Empréstimo.
              </p>
            ) : (
              carteira.map((c, idx) => (
                <div
                  key={c.id}
                  style={{ ["--i" as string]: Math.min(idx, 12) }}
                  className="animate-row-in px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/emprestimos/${c.id}`}
                        className="font-black text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {c.clienteNome}
                      </Link>
                      {c.maiorAtraso > 0 && c.status === "ativo" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          {c.maiorAtraso}d atraso
                        </span>
                      )}
                      {c.status !== "ativo" && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {c.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Saldo aberto: <strong>{brl(c.saldoAberto)}</strong>
                      {c.dataPrevista ? ` · Promessa: ${fmtDataUTC(c.dataPrevista)}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                    <Tooltip
                      content={
                        c.podeDispararWhatsapp
                          ? "Clique para bloquear disparo pelo WhatsApp do sistema"
                          : "Clique para liberar disparo pelo WhatsApp do sistema"
                      }
                    >
                      <button
                        type="button"
                        disabled={isPending && busyId === c.id}
                        onClick={() => toggleWa(c)}
                        className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          c.podeDispararWhatsapp
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {c.podeDispararWhatsapp ? "WA Liberado" : "WA Bloqueado"}
                      </button>
                    </Tooltip>
                    <Tooltip content="Retirar este empréstimo da carteira do funcionário">
                      <button
                        type="button"
                        disabled={isPending && busyId === c.id}
                        onClick={() => removerCarteira(c)}
                        className="btn-press p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA 3: RELATOS */}
        {aba === "relatos" && (
          <div key="relatos" className="animate-tab-in divide-y divide-slate-100">
            {relatos.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhum relato registrado por este funcionário ainda.
              </p>
            ) : (
              relatos.map((r, idx) => (
                <div
                  key={r.id}
                  style={{ ["--i" as string]: Math.min(idx, 12) }}
                  className="animate-row-in px-4 py-3.5 space-y-1 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/emprestimos/${r.emprestimo_id}`}
                        className="font-black text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {r.clienteNome}
                      </Link>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.tipo}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{fmtDataHora(r.criado_em)}</span>
                  </div>
                  <p className="text-xs text-slate-700">{r.texto}</p>
                  {r.data_prometida && (
                    <p className="text-[11px] font-bold text-amber-700 inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      Data prometida: {fmtDataUTC(r.data_prometida)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
