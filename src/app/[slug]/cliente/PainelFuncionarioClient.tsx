"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  History,
  Layers,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  Undo2,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { linkWhatsapp } from "@/lib/mensagens/render";
import Tooltip from "@/components/Tooltip";
import type {
  BaixaItemFuncionario,
  EmprestimoFuncionarioCard,
  FuncionarioPerfil,
} from "./tipos";

type Aba = "atrasados" | "hoje" | "aVencer" | "todos" | "historico";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtDataUTC = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

const fmtDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const TIPOS_RELATO = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "ligacao", label: "Ligação" },
  { id: "visita", label: "Visita" },
  { id: "promessa", label: "Promessa" },
  { id: "sem_resposta", label: "Sem resposta" },
  { id: "observacao", label: "Observação" },
];

const FORMAS_PAG = [
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "transferencia", label: "Transferência" },
  { id: "outro", label: "Outro" },
];

function labelTipoRelato(tipo: string) {
  if (tipo === "devolucao") return "Devolução ao ADM";
  return TIPOS_RELATO.find((t) => t.id === tipo)?.label || "Relato";
}

function labelTipoBaixa(tipo: string) {
  if (tipo === "renovacao") return "Renovação (+30d)";
  if (tipo === "quitacao") return "Quitação Total";
  return "Pagamento de Parcela";
}

function labelForma(forma: string) {
  return FORMAS_PAG.find((f) => f.id === forma)?.label || forma;
}

function mapsUrl(endereco?: string | null, cidade?: string | null) {
  const q = [endereco, cidade].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Modal / Bottom-Sheet com animação suave de entrada e saída + suporte a Escape */
function SheetModal({
  title,
  subtitle,
  maxWidth = "max-w-md",
  headerExtra,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  maxWidth?: string;
  headerExtra?: React.ReactNode;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);

  const fechar = useCallback(() => {
    if (busy || closing) return;
    setClosing(true);
    setTimeout(onClose, 150);
  }, [busy, closing, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fechar]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && fechar()}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center ${
        closing ? "motion-modal-backdrop-out" : "motion-modal-backdrop-in"
      }`}
    >
      <div
        className={`bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full ${maxWidth} max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden ${
          closing
            ? "motion-drawer-out sm:motion-modal-card-out"
            : "motion-drawer-in sm:motion-modal-card-in"
        }`}
      >
        {/* Handle mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 bg-slate-50/80 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300/80" />
        </div>

        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80 shrink-0">
          <div className="min-w-0">
            <h3 className="font-black text-sm sm:text-base text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <Tooltip content="Fechar (Esc)" side="bottom">
              <button
                type="button"
                onClick={fechar}
                disabled={busy}
                className="btn-press w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="p-5 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PainelFuncionarioClient({
  funcionario,
  emprestimos,
  baixas,
  recebidoMes,
}: {
  funcionario: FuncionarioPerfil;
  emprestimos: EmprestimoFuncionarioCard[];
  baixas: BaixaItemFuncionario[];
  recebidoMes: number;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>(() => {
    const temAtrasado = emprestimos.some((e) => e.status === "ativo" && e.maiorAtraso > 0);
    return temAtrasado ? "atrasados" : "todos";
  });
  const [busca, setBusca] = useState("");
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string; saindo: boolean } | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  // Modais
  const [detalheEmp, setDetalheEmp] = useState<EmprestimoFuncionarioCard | null>(null);
  const [cobrarEmp, setCobrarEmp] = useState<EmprestimoFuncionarioCard | null>(null);
  const [relatoEmp, setRelatoEmp] = useState<EmprestimoFuncionarioCard | null>(null);
  const [receberEmp, setReceberEmp] = useState<EmprestimoFuncionarioCard | null>(null);
  const [devolverEmp, setDevolverEmp] = useState<EmprestimoFuncionarioCard | null>(null);
  const [devolverMotivo, setDevolverMotivo] = useState("");
  const [devolvendo, setDevolvendo] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Documentos sob demanda no detalhe
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsData, setDocsData] = useState<{ clienteId: string; documento: string; documentos: string[] } | null>(null);

  // Estado modal Cobrar
  const [cobrando, setCobrando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Estado modal Relato
  const [relatoTipo, setRelatoTipo] = useState("whatsapp");
  const [relatoTexto, setRelatoTexto] = useState("");
  const [relatoData, setRelatoData] = useState("");
  const [salvandoRelato, setSalvandoRelato] = useState(false);

  // Estado modal Receber
  const [baixaTipo, setBaixaTipo] = useState<"parcela" | "renovacao" | "quitacao">("parcela");
  const [baixaParcelaId, setBaixaParcelaId] = useState<string>("");
  const [baixaCobrarAtraso, setBaixaCobrarAtraso] = useState(true);
  const [baixaForma, setBaixaForma] = useState("pix");
  const [baixaObs, setBaixaObs] = useState("");
  const [baixaWa, setBaixaWa] = useState(false);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);

  const showToast = (texto: string, tipo: "ok" | "erro" = "ok") => {
    setToast({ tipo, texto, saindo: false });
    setTimeout(() => setToast((t) => (t ? { ...t, saindo: true } : null)), 3100);
    setTimeout(() => setToast(null), 3300);
  };

  const refreshData = () => {
    setAtualizando(true);
    router.refresh();
    setTimeout(() => setAtualizando(false), 650);
  };

  // Classificação de contratos
  const ativos = useMemo(
    () => emprestimos.filter((e) => e.status === "ativo" || e.status === "pausado"),
    [emprestimos]
  );
  const quitados = useMemo(
    () => emprestimos.filter((e) => e.status === "quitado" || e.status === "quitado_com_atraso"),
    [emprestimos]
  );
  const atrasados = useMemo(
    () => ativos.filter((e) => e.status === "ativo" && e.maiorAtraso > 0),
    [ativos]
  );
  const vencemHoje = useMemo(
    () => ativos.filter((e) => e.status === "ativo" && e.maiorAtraso === 0),
    [ativos]
  );
  const aVencer = useMemo(
    () => ativos.filter((e) => e.status === "ativo" && e.maiorAtraso < 0 && e.maiorAtraso > -9999),
    [ativos]
  );

  const totalCarteira = useMemo(
    () => ativos.reduce((acc, e) => acc + e.saldoAberto, 0),
    [ativos]
  );
  const totalAtrasadoValor = useMemo(
    () =>
      atrasados.reduce(
        (acc, e) =>
          acc +
          e.parcelas
            .filter((p) => p.status === "aberto" && p.diasAtraso > 0)
            .reduce((s, p) => s + p.valor, 0),
        0
      ),
    [atrasados]
  );
  const qtdPendentes = useMemo(
    () => baixas.filter((b) => b.status === "pendente").length,
    [baixas]
  );

  const listaFiltrada = useMemo(() => {
    let base: EmprestimoFuncionarioCard[] = [];
    if (aba === "atrasados") base = atrasados;
    else if (aba === "hoje") base = vencemHoje;
    else if (aba === "aVencer") base = aVencer;
    else if (aba === "todos") base = ativos;
    else base = quitados;

    const q = busca.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (e) =>
        e.cliente.nome.toLowerCase().includes(q) ||
        (e.cliente.telefone || "").toLowerCase().includes(q) ||
        (e.cliente.cidade || "").toLowerCase().includes(q) ||
        (e.cliente.endereco || "").toLowerCase().includes(q)
    );
  }, [aba, atrasados, vencemHoje, aVencer, ativos, quitados, busca]);

  const gruposPorCliente = useMemo(() => {
    const mapa = new Map<string, EmprestimoFuncionarioCard[]>();
    for (const emp of listaFiltrada) {
      const arr = mapa.get(emp.cliente.id) || [];
      arr.push(emp);
      mapa.set(emp.cliente.id, arr);
    }
    return Array.from(mapa.entries()).map(([clienteId, itens]) => ({
      clienteId,
      itens,
    }));
  }, [listaFiltrada]);

  const abrirRelato = (emp: EmprestimoFuncionarioCard) => {
    setRelatoEmp(emp);
    setRelatoTipo("whatsapp");
    setRelatoTexto("");
    setRelatoData(emp.data_prevista_pagamento || "");
  };

  const abrirReceber = (emp: EmprestimoFuncionarioCard) => {
    const primeiraAberta = emp.parcelas.find((p) => p.status === "aberto");
    setReceberEmp(emp);
    setBaixaTipo(emp.podeRenovar ? "renovacao" : emp.isAVista ? "quitacao" : "parcela");
    setBaixaParcelaId(primeiraAberta?.id || "");
    setBaixaCobrarAtraso(true);
    setBaixaForma("pix");
    setBaixaObs("");
    setBaixaWa(false);
  };

  const carregarDocumentos = async (clienteId: string) => {
    if (docsData?.clienteId === clienteId) return;
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/funcionario/documentos/${clienteId}`);
      const d = await res.json();
      if (d.ok) {
        setDocsData({ clienteId, documento: d.documento, documentos: d.documentos || [] });
      } else {
        showToast(d.erro || "Não foi possível carregar documentos.", "erro");
      }
    } catch {
      showToast("Erro ao carregar documentos.", "erro");
    } finally {
      setDocsLoading(false);
    }
  };

  const dispararWhatsappSistema = async (emp: EmprestimoFuncionarioCard) => {
    setCobrando(true);
    try {
      const res = await fetch("/api/funcionario/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emprestimoId: emp.id, modo: "sistema" }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        showToast(`Cobrança enviada para ${emp.cliente.nome.split(" ")[0]}!`);
        setCobrarEmp(null);
        router.refresh();
      } else {
        showToast(d.erro || "Não foi possível enviar no WhatsApp.", "erro");
      }
    } catch {
      showToast("Falha de conexão ao enviar WhatsApp.", "erro");
    } finally {
      setCobrando(false);
    }
  };

  const registrarCobrancaManual = async (emp: EmprestimoFuncionarioCard) => {
    try {
      await fetch("/api/funcionario/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emprestimoId: emp.id, modo: "manual" }),
      });
      router.refresh();
    } catch {
      // silencioso
    }
  };

  const copiarMensagem = async (emp: EmprestimoFuncionarioCard) => {
    try {
      await navigator.clipboard.writeText(emp.mensagemPadrao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast("Mensagem copiada!");
    } catch {
      showToast("Não foi possível copiar.", "erro");
    }
  };

  const salvarRelato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relatoEmp) return;
    setSalvandoRelato(true);
    try {
      const res = await fetch("/api/funcionario/relato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprestimoId: relatoEmp.id,
          tipo: relatoTipo,
          texto: relatoTexto,
          dataPrometida: relatoData || null,
          limparDataPrevista: !relatoData && Boolean(relatoEmp.data_prevista_pagamento),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        showToast("Relato salvo com sucesso!");
        setRelatoEmp(null);
        router.refresh();
      } else {
        showToast(d.erro || "Erro ao salvar relato.", "erro");
      }
    } catch {
      showToast("Falha de conexão.", "erro");
    } finally {
      setSalvandoRelato(false);
    }
  };

  const enviarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receberEmp) return;
    setSalvandoBaixa(true);
    try {
      const res = await fetch("/api/funcionario/baixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprestimoId: receberEmp.id,
          parcelaId: baixaTipo === "parcela" ? baixaParcelaId : null,
          tipo: baixaTipo,
          cobrarJurosAtraso: baixaCobrarAtraso,
          formaPagamento: baixaForma,
          observacao: baixaObs,
          enviarWhatsapp: baixaWa,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        if (d.status === "pendente") {
          showToast("Pagamento enviado para aprovação do administrador!");
        } else {
          showToast(
            d.whatsappEnviado
              ? "Pagamento registrado e comprovante enviado!"
              : "Pagamento registrado com sucesso!"
          );
        }
        setReceberEmp(null);
        setDetalheEmp(null);
        router.refresh();
      } else {
        showToast(d.erro || "Erro ao registrar pagamento.", "erro");
      }
    } catch {
      showToast("Falha de conexão.", "erro");
    } finally {
      setSalvandoBaixa(false);
    }
  };

  const abrirDevolver = (emp: EmprestimoFuncionarioCard) => {
    setDevolverEmp(emp);
    setDevolverMotivo("");
  };

  const confirmarDevolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devolverEmp) return;
    setDevolvendo(true);
    try {
      const res = await fetch("/api/funcionario/devolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprestimoId: devolverEmp.id,
          motivo: devolverMotivo,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        showToast(`Empréstimo de ${devolverEmp.cliente.nome.split(" ")[0]} devolvido ao ADM!`);
        setDevolverEmp(null);
        setDetalheEmp(null);
        router.refresh();
      } else {
        showToast(d.erro || "Não foi possível devolver o empréstimo.", "erro");
      }
    } catch {
      showToast("Falha de conexão ao devolver empréstimo.", "erro");
    } finally {
      setDevolvendo(false);
    }
  };

  const sair = async () => {
    await fetch("/api/funcionario/sair", { method: "POST" });
    router.refresh();
  };

  const previewBaixa = useMemo(() => {
    if (!receberEmp) return { base: 0, juros: 0, total: 0 };
    const abertas = receberEmp.parcelas.filter((p) => p.status === "aberto");
    if (baixaTipo === "renovacao") {
      return { base: receberEmp.valorJurosRenovacao, juros: 0, total: receberEmp.valorJurosRenovacao };
    }
    if (baixaTipo === "quitacao") {
      const base = abertas.reduce((a, p) => a + p.valor, 0);
      const juros = baixaCobrarAtraso ? abertas.reduce((a, p) => a + p.jurosAtraso, 0) : 0;
      return { base, juros, total: base + juros };
    }
    const alvo = abertas.find((p) => p.id === baixaParcelaId) || abertas[0];
    if (!alvo) return { base: 0, juros: 0, total: 0 };
    const juros = baixaCobrarAtraso ? alvo.jurosAtraso : 0;
    return { base: alvo.valor, juros, total: alvo.valor + juros };
  }, [receberEmp, baixaTipo, baixaParcelaId, baixaCobrarAtraso]);

  const renderCardContrato = (emp: EmprestimoFuncionarioCard, idx: number, sub = false) => {
    const atrasado = emp.status === "ativo" && emp.maiorAtraso > 0;
    const hoje = emp.status === "ativo" && emp.maiorAtraso === 0;
    const pausado = emp.status === "pausado";
    const quitado = emp.status === "quitado" || emp.status === "quitado_com_atraso";
    const abertas = emp.parcelas.filter((p) => p.status === "aberto");
    const pagas = emp.parcelas.filter((p) => p.status.startsWith("pago"));

    const barraCor = atrasado
      ? "bg-rose-500"
      : hoje
        ? "bg-amber-500"
        : pausado
          ? "bg-yellow-400"
          : quitado
            ? "bg-emerald-500"
            : "bg-blue-500";

    return (
      <div
        key={emp.id}
        style={{ ["--i" as string]: Math.min(idx, 12) }}
        className={`${sub ? "" : "animate-row-in"} relative bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${
          atrasado
            ? "border-rose-200/90"
            : hoje
              ? "border-amber-200/90"
              : pausado
                ? "border-yellow-200/90"
                : "border-slate-200"
        }`}
      >
        {/* Faixa lateral de status */}
        <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${barraCor}`} />

        <div
          className={`pl-5 pr-4 py-3.5 flex items-start justify-between gap-3 ${
            atrasado ? "bg-rose-50/50" : hoje ? "bg-amber-50/40" : ""
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {!sub &&
              (emp.cliente.foto_src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={emp.cliente.foto_src}
                  alt={emp.cliente.nome}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {emp.cliente.nome
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
              ))}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-black text-slate-900 text-sm truncate">{emp.cliente.nome}</p>
                {atrasado && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2 py-0.5">
                    <AlertCircle className="w-3 h-3" /> {emp.maiorAtraso}d atraso
                  </span>
                )}
                {hoje && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                    <Clock className="w-3 h-3" /> Vence hoje
                  </span>
                )}
                {pausado && (
                  <span className="text-[10px] font-black text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-full px-2 py-0.5">
                    Pausado
                  </span>
                )}
                {quitado && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                    Quitado
                  </span>
                )}
                {emp.cobradoHoje && (
                  <Tooltip content={emp.ultimaCobranca ? `Última cobrança às ${fmtDataHora(emp.ultimaCobranca)}` : "Já cobrado hoje"}>
                    <span className="animate-pop inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 cursor-default">
                      <Check className="w-3 h-3" strokeWidth={3} /> Cobrado hoje
                    </span>
                  </Tooltip>
                )}
                {emp.temBaixaPendente && (
                  <Tooltip content="Pagamento enviado — aguardando conferência do administrador">
                    <span className="animate-pop inline-flex items-center gap-0.5 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 cursor-default">
                      <Clock className="w-3 h-3" /> Aguardando ADM
                    </span>
                  </Tooltip>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                {emp.cliente.telefone ? (
                  <Tooltip content="Ligar para o cliente">
                    <a
                      href={`tel:${emp.cliente.telefone}`}
                      className="inline-flex items-center gap-1 hover:text-emerald-700 font-medium transition-colors"
                    >
                      <Phone className="w-3 h-3" /> {emp.cliente.telefone}
                    </a>
                  </Tooltip>
                ) : (
                  <Tooltip content="Telefone oculto pelo administrador — use o botão Cobrar">
                    <span className="inline-flex items-center gap-1 text-slate-400 cursor-default">
                      <Phone className="w-3 h-3" /> Telefone protegido
                    </span>
                  </Tooltip>
                )}
                {(emp.cliente.endereco || emp.cliente.cidade) && (
                  <Tooltip content="Abrir endereço no Google Maps">
                    <a
                      href={mapsUrl(emp.cliente.endereco, emp.cliente.cidade)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-emerald-700 truncate max-w-[230px] transition-colors"
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {[emp.cliente.endereco, emp.cliente.cidade].filter(Boolean).join(" — ")}
                      </span>
                    </a>
                  </Tooltip>
                )}
              </div>

              {emp.data_prevista_pagamento && !quitado && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                  <CalendarClock className="w-3 h-3" />
                  Promessa: {fmtDataUTC(emp.data_prevista_pagamento)}
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {quitado ? "Total Pago" : "Em Aberto"}
            </p>
            <p className="text-base font-black text-slate-900 tabular-nums">
              {brl(quitado ? emp.totalPago : emp.saldoAberto)}
            </p>
            {emp.totalJurosAtraso > 0 && !quitado && (
              <p className="text-[10px] font-black text-rose-600 tabular-nums">
                + {brl(emp.totalJurosAtraso)} atraso
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">
              {emp.isAVista ? "À Vista" : `${pagas.length}/${emp.parcelas.length} pagas`}
            </p>
          </div>
        </div>

        {/* Próximas parcelas em aberto + atalho Devolver */}
        {!quitado && abertas.length > 0 && (
          <div className="pl-5 pr-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {emp.isAVista
                  ? `Vencimento: ${fmtDataUTC(abertas[0].data_vencimento)}`
                  : `Próxima: Parcela ${abertas[0].numero} · ${fmtDataUTC(abertas[0].data_vencimento)} (${brl(abertas[0].valor)})`}
              </span>
            </span>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {emp.relatos[0] && (
                <span className="hidden sm:inline text-[11px] text-slate-400 truncate max-w-[200px]">
                  {emp.relatos[0].texto}
                </span>
              )}
              <Tooltip content="Devolver este empréstimo ao ADM sem alterar nada">
                <button
                  type="button"
                  onClick={() => abrirDevolver(emp)}
                  className="btn-press inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-[11px] font-bold cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Devolver</span>
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Ações rápidas */}
        <div className="pl-4 pr-3 py-2.5 border-t border-slate-100 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {!quitado && (
            <button
              type="button"
              onClick={() => {
                setCopiado(false);
                setCobrarEmp(emp);
              }}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Cobrar
            </button>
          )}

          {!quitado && funcionario.modo_baixa !== "nenhum" && (
            <button
              type="button"
              onClick={() => abrirReceber(emp)}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black rounded-xl cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              {funcionario.modo_baixa === "direto" ? "Receber" : "Informar Pgto"}
            </button>
          )}

          {!quitado && (
            <button
              type="button"
              onClick={() => abrirRelato(emp)}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
              Relatar
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setDetalheEmp(emp);
              if (docsData?.clienteId !== emp.cliente.id) setDocsData(null);
            }}
            className="btn-press last:odd:col-span-2 sm:last:odd:col-span-1 flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Detalhes
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 motion-page-enter">
      {/* Toast animado */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-black flex items-center gap-2 ${
            toast.saindo ? "animate-toast-out" : "animate-toast-in"
          } ${
            toast.tipo === "ok"
              ? "bg-slate-900 text-white border-white/10"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.tipo === "ok" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.texto}</span>
        </div>
      )}

      {/* Header App */}
      <header className="sticky top-0 z-30 bg-[#064e3b] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {funcionario.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={funcionario.foto_url}
                alt={funcionario.nome}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400/60 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-700 border border-emerald-400/50 text-white font-black flex items-center justify-center shrink-0">
                {funcionario.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-black text-sm sm:text-base leading-tight truncate">
                {funcionario.nome}
              </p>
              <p className="text-[11px] text-emerald-200 truncate">
                {ativos.length} ativo{ativos.length === 1 ? "" : "s"} · {atrasados.length} em atraso
                {vencemHoje.length > 0 ? ` · ${vencemHoje.length} hoje` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content="Atualizar cobranças" side="bottom">
              <button
                type="button"
                onClick={refreshData}
                className="btn-press p-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${atualizando ? "animate-spin" : ""}`} />
              </button>
            </Tooltip>
            <Tooltip content="Encerrar sessão" side="bottom">
              <button
                type="button"
                onClick={sair}
                className="btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/60 hover:bg-rose-600/80 text-xs font-bold text-emerald-100 hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div
            style={{ ["--i" as string]: 0 }}
            className="animate-row-in col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex sm:block items-center justify-between gap-2"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Carteira Aberta
              </p>
              <p className="text-lg font-black text-slate-900 mt-0.5 sm:mt-1 tabular-nums">
                {brl(totalCarteira)}
              </p>
            </div>
            <p className="text-[11px] sm:text-[10px] text-slate-400 font-semibold sm:font-normal sm:mt-0.5 shrink-0">
              {ativos.length} contrato{ativos.length === 1 ? "" : "s"}
            </p>
          </div>

          <div
            style={{ ["--i" as string]: 1 }}
            className="animate-row-in bg-white border border-rose-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
              Em Atraso
            </p>
            <p className="text-base sm:text-lg font-black text-rose-600 mt-1 tabular-nums">
              {brl(totalAtrasadoValor)}
            </p>
            <p className="text-[10px] text-rose-400 mt-0.5">{atrasados.length} clientes</p>
          </div>

          <div
            style={{ ["--i" as string]: 2 }}
            className="animate-row-in bg-white border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
              Recebido (Mês)
            </p>
            <p className="text-base sm:text-lg font-black text-emerald-700 mt-1 tabular-nums">
              {brl(recebidoMes)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {qtdPendentes > 0 ? `${qtdPendentes} pendente(s)` : "Tudo em dia"}
            </p>
          </div>
        </div>

        {/* Busca + Abas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cidade ou endereço..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="animate-pop absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { id: "atrasados", label: "Atrasados", count: atrasados.length },
                { id: "hoje", label: "Vence Hoje", count: vencemHoje.length },
                { id: "aVencer", label: "A Vencer", count: aVencer.length },
                { id: "todos", label: "Todos Ativos", count: ativos.length },
                { id: "historico", label: "Histórico", count: baixas.length },
              ] as const
            ).map((t) => {
              const ativo = aba === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAba(t.id)}
                  className={`btn-press shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    ativo
                      ? "bg-[#064e3b] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 rounded-md text-[10px] ${
                      ativo ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo animado por aba */}
        <div key={aba} className="animate-tab-in">
          {aba === "historico" ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Meus Recebimentos & Solicitações
                  </h2>
                  <span className="text-xs font-bold text-slate-400">{baixas.length} registro(s)</span>
                </div>

                {baixas.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">
                    Nenhum pagamento registrado por você ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {baixas.map((b, idx) => (
                      <div
                        key={b.id}
                        style={{ ["--i" as string]: Math.min(idx, 12) }}
                        className="animate-row-in px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900 truncate">
                              {b.clienteNome}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                b.status === "pendente"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : b.status === "recusada"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {b.status === "pendente"
                                ? "Aguardando ADM"
                                : b.status === "aprovada"
                                  ? "Aprovada"
                                  : b.status === "direta"
                                    ? "Registrada"
                                    : "Recusada"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {labelTipoBaixa(b.tipo)} · {labelForma(b.forma_pagamento)} ·{" "}
                            {fmtDataHora(b.criado_em)}
                          </p>
                          {b.observacao && (
                            <p className="text-xs text-slate-600 mt-1 italic">“{b.observacao}”</p>
                          )}
                          {b.status === "recusada" && b.motivo_recusa && (
                            <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              Motivo: {b.motivo_recusa}
                            </p>
                          )}
                        </div>
                        <span className="font-black text-sm text-slate-900 tabular-nums shrink-0">
                          {brl(b.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {quitados.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                    Contratos Quitados ({quitados.length})
                  </h3>
                  {quitados.map((emp, idx) => renderCardContrato(emp, idx))}
                </div>
              )}
            </div>
          ) : gruposPorCliente.length === 0 ? (
            <div className="animate-fade-in-up bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-black text-slate-800">Nenhuma cobrança nesta aba</p>
              <p className="text-xs text-slate-500">
                {busca
                  ? "Tente limpar a busca para ver todos os clientes."
                  : "Quando o administrador compartilhar contratos com você, eles aparecerão aqui."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gruposPorCliente.map(({ clienteId, itens }, idx) => {
                if (itens.length === 1) {
                  return renderCardContrato(itens[0], idx);
                }
                const primeiro = itens[0];
                const aberto = !!expandidos[clienteId];
                const somaGrupo = itens.reduce((a, x) => a + x.saldoAberto, 0);
                const maiorAtrasoGrupo = itens.reduce((m, x) => Math.max(m, x.maiorAtraso), -9999);

                return (
                  <div
                    key={clienteId}
                    style={{ ["--i" as string]: Math.min(idx, 12) }}
                    className="animate-row-in bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandidos((prev) => ({ ...prev, [clienteId]: !prev[clienteId] }))
                      }
                      className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {primeiro.cliente.foto_src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primeiro.cliente.foto_src}
                            alt={primeiro.cliente.nome}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {primeiro.cliente.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900 truncate">
                              {primeiro.cliente.nome}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                              <Layers className="w-3 h-3" /> {itens.length} contratos
                            </span>
                            {maiorAtrasoGrupo > 0 && (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2 py-0.5">
                                {maiorAtrasoGrupo}d atraso
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {[primeiro.cliente.endereco, primeiro.cliente.cidade]
                              .filter(Boolean)
                              .join(" — ") || "Clique para ver os contratos"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                          <p className="text-sm font-black text-slate-900 tabular-nums">
                            {brl(somaGrupo)}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Expansão animada fluida */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        aberto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-3 pt-2 space-y-2.5 bg-slate-50/70 border-t border-slate-100">
                          {itens.map((emp, sIdx) => renderCardContrato(emp, sIdx, true))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: COBRAR ── */}
      {cobrarEmp && (
        <SheetModal
          title="Cobrar Cliente"
          subtitle={cobrarEmp.cliente.nome}
          busy={cobrando}
          onClose={() => setCobrarEmp(null)}
        >
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Prévia da mensagem pronta
              </p>
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-medium">
                {cobrarEmp.mensagemPadrao || "Sem mensagem configurada."}
              </div>
            </div>

            <div className="space-y-2.5">
              {cobrarEmp.podeDispararWhatsapp ? (
                <button
                  type="button"
                  disabled={cobrando}
                  onClick={() => dispararWhatsappSistema(cobrarEmp)}
                  className="btn-press w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
                >
                  {cobrando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {cobrando ? "Enviando..." : "Enviar pelo WhatsApp do Sistema"}
                </button>
              ) : (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  Disparo automático pelo número do sistema não habilitado neste contrato.
                </p>
              )}

              {cobrarEmp.cliente.telefone && (
                <a
                  href={linkWhatsapp(cobrarEmp.cliente.telefone, cobrarEmp.mensagemPadrao)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => registrarCobrancaManual(cobrarEmp)}
                  className="btn-press w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black rounded-xl flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir no Meu WhatsApp
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copiarMensagem(cobrarEmp)}
                  className="btn-press py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiado ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-pop" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiado ? "Copiada!" : "Copiar texto"}
                </button>
                {cobrarEmp.cliente.telefone ? (
                  <a
                    href={`tel:${cobrarEmp.cliente.telefone}`}
                    className="btn-press py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                ) : (
                  <Tooltip content="Telefone protegido pelo administrador">
                    <span className="w-full py-2.5 px-3 bg-slate-50 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-default">
                      <Phone className="w-3.5 h-3.5" /> Protegido
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </SheetModal>
      )}

      {/* ── MODAL: RELATAR / DATA PREVISTA ── */}
      {relatoEmp && (
        <SheetModal
          title="Registrar Relato / Promessa"
          subtitle={relatoEmp.cliente.nome}
          busy={salvandoRelato}
          onClose={() => setRelatoEmp(null)}
        >
          <form onSubmit={salvarRelato} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Tipo de contato
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_RELATO.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRelatoTipo(t.id)}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      relatoTipo === t.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                O que aconteceu?
              </label>
              <textarea
                rows={3}
                value={relatoTexto}
                onChange={(e) => setRelatoTexto(e.target.value)}
                placeholder="Ex: Passei no endereço, combinou de pagar na sexta-feira..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Data prevista / promessa de pagamento (opcional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={relatoData}
                  onChange={(e) => setRelatoData(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {relatoData && (
                  <button
                    type="button"
                    onClick={() => setRelatoData("")}
                    className="btn-press px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRelatoEmp(null)}
                className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoRelato || (!relatoTexto.trim() && !relatoData && !relatoEmp.data_prevista_pagamento)}
                className="btn-press flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {salvandoRelato && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Relato
              </button>
            </div>
          </form>
        </SheetModal>
      )}

      {/* ── MODAL: RECEBER / INFORMAR PAGAMENTO ── */}
      {receberEmp && (
        <SheetModal
          title={
            funcionario.modo_baixa === "direto"
              ? "Registrar Recebimento"
              : "Informar Recebimento (Aprovação)"
          }
          subtitle={receberEmp.cliente.nome}
          busy={salvandoBaixa}
          onClose={() => setReceberEmp(null)}
        >
          <form onSubmit={enviarBaixa} className="space-y-4">
            {funcionario.modo_baixa === "aprovacao" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Este pagamento será enviado para conferência e aprovação do administrador.
                </span>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                O que o cliente pagou?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {!receberEmp.isAVista && (
                  <button
                    type="button"
                    onClick={() => setBaixaTipo("parcela")}
                    className={`btn-press py-2.5 px-3 rounded-xl border text-xs font-black cursor-pointer ${
                      baixaTipo === "parcela"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Parcela
                  </button>
                )}
                {receberEmp.podeRenovar && (
                  <button
                    type="button"
                    onClick={() => setBaixaTipo("renovacao")}
                    className={`btn-press py-2.5 px-3 rounded-xl border text-xs font-black cursor-pointer ${
                      baixaTipo === "renovacao"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Só Juros (+30d)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBaixaTipo("quitacao")}
                  className={`btn-press py-2.5 px-3 rounded-xl border text-xs font-black cursor-pointer ${
                    baixaTipo === "quitacao"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {receberEmp.isAVista ? "Quitar À Vista" : "Quitar Tudo"}
                </button>
              </div>
            </div>

            {baixaTipo === "parcela" && !receberEmp.isAVista && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Parcela
                </label>
                <select
                  value={baixaParcelaId}
                  onChange={(e) => setBaixaParcelaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  {receberEmp.parcelas
                    .filter((p) => p.status === "aberto")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Parcela {p.numero} · Vence {fmtDataUTC(p.data_vencimento)} · {brl(p.valor)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-bold">Valor base</span>
                <span className="font-black text-slate-800">{brl(previewBaixa.base)}</span>
              </div>
              {previewBaixa.juros > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-rose-600 font-bold">Juros de atraso</span>
                  <span className="font-black text-rose-600">+ {brl(previewBaixa.juros)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200">
                <span className="font-black text-slate-800">Total recebido</span>
                <span className="font-black text-emerald-700">{brl(previewBaixa.total)}</span>
              </div>
            </div>

            {baixaTipo !== "renovacao" && receberEmp.totalJurosAtraso > 0 && (
              <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Cobrar juros de atraso</span>
                <input
                  type="checkbox"
                  checked={baixaCobrarAtraso}
                  onChange={(e) => setBaixaCobrarAtraso(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Forma de pagamento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {FORMAS_PAG.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBaixaForma(f.id)}
                    className={`btn-press py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      baixaForma === f.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Observação / Comprovante (opcional)
              </label>
              <input
                type="text"
                value={baixaObs}
                onChange={(e) => setBaixaObs(e.target.value)}
                placeholder="Ex: Pix enviado na conta do Roni / Pago em espécie"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
              />
            </div>

            {funcionario.modo_baixa === "direto" && receberEmp.podeDispararWhatsapp && (
              <label className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 cursor-pointer">
                <span className="text-xs font-bold text-emerald-900">
                  Enviar comprovante no WhatsApp do cliente
                </span>
                <input
                  type="checkbox"
                  checked={baixaWa}
                  onChange={(e) => setBaixaWa(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReceberEmp(null)}
                className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoBaixa}
                className="btn-press flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {salvandoBaixa && <Loader2 className="w-4 h-4 animate-spin" />}
                {funcionario.modo_baixa === "direto"
                  ? `Confirmar (${brl(previewBaixa.total)})`
                  : `Enviar p/ ADM (${brl(previewBaixa.total)})`}
              </button>
            </div>
          </form>
        </SheetModal>
      )}

      {/* ── DRAWER / MODAL: DETALHES COMPLETOS DO CONTRATO ── */}
      {detalheEmp && (
        <SheetModal
          title={detalheEmp.cliente.nome}
          subtitle={`Principal ${brl(detalheEmp.valor_emprestado)} · Juros ${detalheEmp.taxa_juros}%`}
          maxWidth="max-w-2xl"
          onClose={() => setDetalheEmp(null)}
          headerExtra={
            <div className="flex items-center gap-1.5">
              {detalheEmp.status !== "quitado" && detalheEmp.status !== "quitado_com_atraso" && (
                <Tooltip content="Devolver contrato ao ADM sem alterar parcelas" side="bottom">
                  <button
                    type="button"
                    onClick={() => {
                      const emp = detalheEmp;
                      setDetalheEmp(null);
                      abrirDevolver(emp);
                    }}
                    className="btn-press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden min-[380px]:inline">Devolver</span>
                  </button>
                </Tooltip>
              )}
              <Tooltip content="Baixar cronograma completo em PDF" side="bottom">
                <a
                  href={`/api/funcionario/emprestimo/${detalheEmp.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black"
                >
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </a>
              </Tooltip>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Ficha do cliente */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Dados do Cliente
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-bold">Telefone: </span>
                  {detalheEmp.cliente.telefone ? (
                    <a
                      href={`tel:${detalheEmp.cliente.telefone}`}
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      {detalheEmp.cliente.telefone}
                    </a>
                  ) : (
                    <span className="text-slate-500">Oculto pelo ADM</span>
                  )}
                </div>

                {detalheEmp.cliente.documento && (
                  <div>
                    <span className="text-slate-400 font-bold">CPF/Doc: </span>
                    <span className="font-bold text-slate-800">{detalheEmp.cliente.documento}</span>
                  </div>
                )}

                {(detalheEmp.cliente.endereco || detalheEmp.cliente.cidade) && (
                  <div className="sm:col-span-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 font-bold">Endereço: </span>
                      <span className="font-semibold text-slate-800">
                        {[detalheEmp.cliente.endereco, detalheEmp.cliente.cidade]
                          .filter(Boolean)
                          .join(" — ")}
                      </span>
                    </div>
                    <Tooltip content="Abrir rota no Google Maps">
                      <a
                        href={mapsUrl(detalheEmp.cliente.endereco, detalheEmp.cliente.cidade)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-emerald-700 font-black hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Maps
                      </a>
                    </Tooltip>
                  </div>
                )}

                {detalheEmp.cliente.referencia && (
                  <div>
                    <span className="text-slate-400 font-bold">Referência: </span>
                    <span className="font-semibold text-slate-700">{detalheEmp.cliente.referencia}</span>
                  </div>
                )}

                {detalheEmp.cliente.quem_indicou && (
                  <div>
                    <span className="text-slate-400 font-bold">Quem indicou: </span>
                    <span className="font-semibold text-slate-700">{detalheEmp.cliente.quem_indicou}</span>
                  </div>
                )}
              </div>

              {detalheEmp.observacoes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-amber-700 font-black">Observações: </span>
                  <span className="text-slate-700">{detalheEmp.observacoes}</span>
                </div>
              )}

              {funcionario.pode_ver_documentos && detalheEmp.cliente.temDocumentos && (
                <div className="pt-2 border-t border-slate-200">
                  {docsData?.clienteId === detalheEmp.cliente.id ? (
                    <div className="space-y-2 animate-fade-in">
                      <p className="font-bold text-slate-600">
                        Documentos ({docsData.documentos.length}):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {docsData.documentos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-slate-200 bg-white hover:ring-2 hover:ring-emerald-400 transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Doc ${idx + 1}`} className="w-full h-24 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={docsLoading}
                      onClick={() => carregarDocumentos(detalheEmp.cliente.id)}
                      className="inline-flex items-center gap-1.5 text-emerald-700 font-black hover:underline cursor-pointer"
                    >
                      {docsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      Carregar documentos anexados
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cronograma completo de parcelas */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Parcelas ({detalheEmp.parcelas.length})
              </p>
              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                {detalheEmp.parcelas.map((p) => {
                  const paga = p.status.startsWith("pago");
                  const isRenov = p.status.includes("renovacao") || p.status === "renovado";
                  const atras = p.status === "aberto" && p.diasAtraso > 0;
                  return (
                    <div
                      key={p.id}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${
                        atras ? "bg-rose-50/50" : paga ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800">
                            {isRenov ? "Renovação" : `Parcela ${p.numero}`}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              isRenov
                                ? "bg-purple-100 text-purple-700"
                                : paga
                                  ? "bg-emerald-100 text-emerald-700"
                                  : atras
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isRenov ? "renovado" : paga ? "pago" : atras ? `${p.diasAtraso}d atraso` : "aberto"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Vence {fmtDataUTC(p.data_vencimento)}
                          {p.data_pagamento ? ` · Pago ${fmtDataUTC(p.data_pagamento)}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 tabular-nums">{brl(p.valor)}</span>
                        {p.jurosAtraso > 0 && (
                          <p className="text-[10px] font-bold text-rose-600">
                            + {brl(p.jurosAtraso)} atraso
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relatos de cobrança */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Histórico de Relatos ({detalheEmp.relatos.length})
                </p>
                {detalheEmp.status !== "quitado" && detalheEmp.status !== "quitado_com_atraso" && (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = detalheEmp;
                      setDetalheEmp(null);
                      abrirRelato(emp);
                    }}
                    className="text-xs font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    + Novo relato
                  </button>
                )}
              </div>

              {detalheEmp.relatos.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  Nenhum relato registrado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {detalheEmp.relatos.map((r) => (
                    <div
                      key={r.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-700 uppercase text-[10px]">
                          {labelTipoRelato(r.tipo)}
                        </span>
                        <span className="text-[10px] text-slate-400">{fmtDataHora(r.criado_em)}</span>
                      </div>
                      <p className="text-slate-700">{r.texto}</p>
                      {r.data_prometida && (
                        <p className="text-[11px] font-bold text-amber-700">
                          Promessa p/ {fmtDataUTC(r.data_prometida)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetModal>
      )}

      {/* ── MODAL: DEVOLVER EMPRÉSTIMO AO ADM ── */}
      {devolverEmp && (
        <SheetModal
          title="Devolver Empréstimo ao ADM"
          subtitle={devolverEmp.cliente.nome}
          busy={devolvendo}
          onClose={() => setDevolverEmp(null)}
        >
          <form onSubmit={confirmarDevolucao} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <Undo2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                O contrato de <strong>{devolverEmp.cliente.nome}</strong> voltará para o administrador{" "}
                <strong>exatamente como está agora</strong> — nenhuma parcela, valor ou status será alterado.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Motivo rápido (opcional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Passado por engano",
                  "Cliente pediu p/ falar direto com ADM",
                  "Não consegui contato",
                  "Sem retorno no endereço",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDevolverMotivo(sug)}
                    className={`btn-press px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                      devolverMotivo === sug
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Observação para o ADM (opcional)
              </label>
              <textarea
                rows={2}
                value={devolverMotivo}
                onChange={(e) => setDevolverMotivo(e.target.value)}
                placeholder="Ex: Devolvendo porque o cliente vai acertar direto com você..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDevolverEmp(null)}
                disabled={devolvendo}
                className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={devolvendo}
                className="btn-press flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {devolvendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                {devolvendo ? "Devolvendo..." : "Devolver ao ADM"}
              </button>
            </div>
          </form>
        </SheetModal>
      )}
    </div>
  );
}
