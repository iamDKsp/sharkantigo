"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Trash2, Calendar, MessageSquare, AlertCircle,
  Clock, CheckCircle2, X, Loader2, Phone, TrendingUp,
  RefreshCw, CalendarClock, ShieldOff, Shield, Layers,
  BadgeCheck, AlertTriangle, ChevronRight, Wallet, DollarSign, Pencil,
} from "lucide-react";
import {
  payNextInstallment, payFullLoan, renegociarEmprestimo,
  reprogramarEmprestimo, toggleClientBlacklist, deleteLoan,
  receberSoJurosEmprestimo, salvarDataPrevistaPagamento
} from "@/app/emprestimos/[id]/actions";

interface Cliente { id: string; nome: string; telefone: string; blacklist: boolean; foto_url: string | null; }
interface Parcela { id: string; numero: number; valor: number; data_vencimento: any; status: string; data_pagamento: any; }
interface Parceiro { id: string; nome: string; }
interface Emprestimo {
  id: string; valor_emprestado: number; taxa_juros: number; taxa_multa: number;
  data_vencimento: any; status: string; tipo_pagamento: string; frequencia: string;
  categoria: string; observacoes: string | null; cliente: Cliente; parcelas: Parcela[]; parceiro?: Parceiro | null;
  data_prevista_pagamento: string | null;
}

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder:text-slate-400";

function Modal({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-black text-sm text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors ml-4 flex-shrink-0 cursor-pointer">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export default function EmprestimoDetalhesView({ emprestimo }: { emprestimo: Emprestimo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<null | "renegociar" | "reprogramar" | "delete" | "wa">(null);

  // ── Data Prevista de Pagamento ──
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataPrevistaInput, setDataPrevistaInput] = useState(
    emprestimo.data_prevista_pagamento ?? ""
  );
  const [isSavingData, setIsSavingData] = useState(false);

  const handleSalvarDataPrevista = async () => {
    if (!dataPrevistaInput) return;
    setIsSavingData(true);
    try {
      await salvarDataPrevistaPagamento(emprestimo.id, dataPrevistaInput);
      setShowDatePicker(false);
    } catch (err: any) {
      alert(err.message);
    }
    setIsSavingData(false);
  };

  const handleLimparDataPrevista = async () => {
    if (!confirm("Remover data prevista de pagamento?")) return;
    setIsSavingData(true);
    try {
      await salvarDataPrevistaPagamento(emprestimo.id, null);
      setDataPrevistaInput("");
      setShowDatePicker(false);
    } catch (err: any) {
      alert(err.message);
    }
    setIsSavingData(false);
  };
  const [waConfigMode, setWaConfigMode] = useState(false);
  const [waTemplates, setWaTemplates] = useState<string[]>([]);
  const [waCustomMsg, setWaCustomMsg] = useState("");
  const [isWaSending, setIsWaSending] = useState(false);

  const [valorAbater, setValorAbater] = useState("");
  const [aplicarJuros, setAplicarJuros] = useState(false);
  const [taxaReneg, setTaxaReneg] = useState("10");

  const [novaData, setNovaData] = useState("");
  const [extra, setExtra] = useState("");
  const [taxaReprog, setTaxaReprog] = useState("");
  const [freqReprog, setFreqReprog] = useState(emprestimo.frequencia);

  useEffect(() => { if (modal === "reprogramar") setFreqReprog(emprestimo.frequencia); }, [modal]);

  useEffect(() => {
    const saved = localStorage.getItem("wa_templates");
    if (saved) {
      try { setWaTemplates(JSON.parse(saved)); } catch (e) {}
    } else {
      setWaTemplates([
        "Olá, tudo bem? Lembrando que seu empréstimo vence em breve.",
        "Olá, sua parcela vence hoje. Qualquer dúvida estou à disposição!",
        "Olá, notamos um pequeno atraso. Como podemos ajudar?",
        "Olá, seu empréstimo já consta como quitado. Muito obrigado!"
      ]);
    }
  }, []);

  const handleUpdateTemplate = (index: number, val: string) => {
    const newT = [...waTemplates];
    newT[index] = val;
    setWaTemplates(newT);
    localStorage.setItem("wa_templates", JSON.stringify(newT));
  };
  const handleRemoveTemplate = (index: number) => {
    const newT = waTemplates.filter((_, i) => i !== index);
    setWaTemplates(newT);
    localStorage.setItem("wa_templates", JSON.stringify(newT));
  };
  const handleAddTemplate = () => {
    const newT = [...waTemplates, "Nova mensagem"];
    setWaTemplates(newT);
    localStorage.setItem("wa_templates", JSON.stringify(newT));
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtDate = (d: any) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(d));

  // ── Cálculos ──
  const totalEstimado = emprestimo.parcelas.length > 0
    ? emprestimo.parcelas.reduce((a, p) => a + p.valor, 0)
    : emprestimo.valor_emprestado * (1 + emprestimo.taxa_juros / 100);
  const totalPago = emprestimo.parcelas.reduce((a, p) => p.status.startsWith("pago") ? a + p.valor : a, 0);
  const saldoRestante = Math.max(0, totalEstimado - totalPago);
  const progresso = totalEstimado > 0 ? (totalPago / totalEstimado) * 100 : 0;

  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const vencObj = new Date(emprestimo.data_vencimento);
  const vencUTC = new Date(Date.UTC(vencObj.getUTCFullYear(), vencObj.getUTCMonth(), vencObj.getUTCDate()));
  const diasDiff = Math.ceil((vencUTC.getTime() - hojeUTC.getTime()) / 86400000);

  const abertas = emprestimo.parcelas.filter(p => p.status === "aberto");
  const pagas = emprestimo.parcelas.filter(p => p.status.startsWith("pago"));
  const multiplas = abertas.length > 1;

  const todasPagas = emprestimo.parcelas.length > 0 && emprestimo.parcelas.every(p => p.status.startsWith("pago"));
  let statusReal = todasPagas ? "quitado" : emprestimo.status;
  let atrasado = false, venceHoje = false;

  if (!todasPagas) {
    atrasado = emprestimo.parcelas.some(p => {
      if (p.status !== "aberto") return false;
      const v = new Date(p.data_vencimento);
      return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())) < hojeUTC;
    });
    venceHoje = emprestimo.parcelas.some(p => {
      if (p.status !== "aberto") return false;
      const v = new Date(p.data_vencimento);
      return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())).getTime() === hojeUTC.getTime();
    });
    if (emprestimo.parcelas.length === 0) {
      atrasado = vencUTC < hojeUTC;
      venceHoje = vencUTC.getTime() === hojeUTC.getTime();
    }
    if (atrasado) statusReal = "atrasado";
  }

  const STATUS = {
    quitado:  { label: "Quitado",        icon: <CheckCircle2 className="w-3 h-3" />, bg: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", stripe: "from-emerald-500/5 to-transparent" },
    atrasado: { label: "Atrasado",        icon: <AlertCircle className="w-3 h-3" />, bg: "bg-rose-50 text-rose-700 border-rose-200", bar: "bg-rose-500", stripe: "from-rose-500/5 to-transparent" },
    hoje:     { label: "Vence Hoje",      icon: <Clock className="w-3 h-3" />, bg: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500", stripe: "from-amber-500/5 to-transparent" },
    emDia:    { label: "Em Dia",          icon: <BadgeCheck className="w-3 h-3" />, bg: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-emerald-500", stripe: "from-blue-500/5 to-transparent" },
  };
  const s = STATUS[statusReal === "quitado" ? "quitado" : atrasado ? "atrasado" : venceHoje ? "hoje" : "emDia"];

  const freqLabel: Record<string, string> = { diario: "Diário", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };
  const tipoLabel: Record<string, string> = { a_vista: "À Vista", a_vista_juros: "À Vista + Juros", juros_compostos: "Juros Compostos", parcelado: "Parcelado", juros_mensais: "Juros Mensais" };

  // ── Handlers ──
  const pay = (withDelay: boolean) => {
    if (!confirm(`Confirmar recebimento como ${withDelay ? "atrasado" : "pago"}?`)) return;
    startTransition(async () => { await payNextInstallment(emprestimo.id, withDelay); });
  };
  const payAll = (withDelay: boolean) => {
    if (!confirm(`Confirmar QUITAÇÃO TOTAL como ${withDelay ? "com atraso" : "pago"}?`)) return;
    startTransition(async () => { await payFullLoan(emprestimo.id, withDelay); });
  };
  const toggleBL = () => {
    if (!confirm(emprestimo.cliente.blacklist ? "Remover da lista negra?" : "Marcar como LISTA NEGRA?")) return;
    startTransition(async () => { await toggleClientBlacklist(emprestimo.cliente.id, emprestimo.cliente.blacklist, emprestimo.id); });
  };
  const excluir = () => {
    startTransition(async () => {
      const res = await deleteLoan(emprestimo.id);
      if (res?.success && res?.redirectUrl) router.push(res.redirectUrl);
    });
  };

  const receiveJuros = () => {
    if (!confirm("Confirmar recebimento de APENAS os juros e renovar o principal para +30 dias?")) return;
    startTransition(async () => {
      try {
        await receberSoJurosEmprestimo(emprestimo.id);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const sendWaMsg = async (text: string) => {
    if (!text) return;
    setIsWaSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ phone: emprestimo.cliente.telefone, text }]
        })
      });
      if (res.ok) {
        alert("Mensagem enviada com sucesso!");
        setModal(null);
        setWaCustomMsg("");
      } else {
        alert("Erro ao enviar mensagem");
      }
    } catch (err) {
      alert("Falha de conexão. Verifique se a plataforma (Evolution API) está rodando.");
    }
    setIsWaSending(false);
  };

  const whatsapp = () => {
    setModal("wa");
  };
  const submitReneg = (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valorAbater);
    if (!v || v <= 0) { alert("Valor inválido."); return; }
    startTransition(async () => {
      try { await renegociarEmprestimo(emprestimo.id, v, aplicarJuros, aplicarJuros ? Number(taxaReneg) : 0); setModal(null); setValorAbater(""); }
      catch (err: any) { alert(err.message); }
    });
  };
  const submitReprog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaData) { alert("Data obrigatória."); return; }
    startTransition(async () => {
      try { await reprogramarEmprestimo(emprestimo.id, novaData, extra ? Number(extra) : 0, taxaReprog ? Number(taxaReprog) : 0, freqReprog); setModal(null); setNovaData(""); setExtra(""); setTaxaReprog(""); }
      catch (err: any) { alert(err.message); }
    });
  };

  // ── Button helpers ──
  const BtnPrimary = ({ onClick, children, disabled }: any) => (
    <button onClick={onClick} disabled={disabled ?? isPending} className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-black tracking-wide rounded-xl transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-60 cursor-pointer">
      {children}
    </button>
  );
  const BtnSecondary = ({ onClick, children, danger }: any) => (
    <button onClick={onClick} disabled={isPending} className={`flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-black tracking-wide rounded-xl border transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer ${danger ? "bg-slate-50 text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}>
      {children}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">

      {/* Prefetch silencioso da lista — pré-carrega em background */}
      <Link href="/emprestimos" prefetch className="hidden" aria-hidden tabIndex={-1} />

      {/* Top bar */}
      <div className="flex items-center justify-between py-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors group active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        <div className="flex items-center gap-2">
          <Link
            href={`/emprestimos/${emprestimo.id}/editar`}
            className="flex items-center gap-1.5 text-sm font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Link>
          <button onClick={() => setModal("delete")} className="flex items-center gap-1.5 text-sm font-black text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL 2-col ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* COL ESQUERDA — 2/3 */}
        <div className="lg:col-span-2 space-y-4">

          {/* HERO CARD */}
          <div className={`relative overflow-hidden rounded-2xl border bg-white border-slate-200 shadow-sm`}>
            {/* Stripe lateral de status */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
            <div className={`absolute inset-0 bg-gradient-to-r ${s.stripe} pointer-events-none`} />

            <div className="relative px-6 pt-5 pb-6">
              {/* Status + valor principal */}
              <div className="flex items-start justify-between mb-5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${s.bg}`}>
                  {s.icon} {s.label}
                </span>
                {statusReal !== "quitado" && (
                  <div className={`text-right text-xs font-black px-2.5 py-1 rounded-xl border ${
                    diasDiff < 0 ? "bg-rose-50 text-rose-700 border-rose-200" :
                    diasDiff === 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(emprestimo.data_vencimento)}
                    </div>
                    <div className="mt-0.5 opacity-80">
                      {diasDiff < 0 ? `${Math.abs(diasDiff)}d em atraso` : diasDiff === 0 ? "Vence hoje" : `${diasDiff}d restantes`}
                    </div>
                  </div>
                )}
              </div>

              {/* Valores */}
              <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo a Receber</p>
                  <p className="text-2xl font-black text-slate-900 leading-none tracking-tight">{fmt(saldoRestante > 0 ? saldoRestante : totalEstimado)}</p>
                </div>
                <div className="flex gap-6 items-end pb-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Juros</p>
                    <p className="text-sm font-black text-slate-500 leading-none">{fmt(totalEstimado - emprestimo.valor_emprestado)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Recebido</p>
                    <p className="text-sm font-black text-emerald-600 leading-none">{fmt(totalPago)}</p>
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div>
                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  <span>Progresso — {progresso.toFixed(0)}% pago</span>
                  <span>{pagas.length}/{emprestimo.parcelas.length} parcelas</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${Math.max(progresso, progresso > 0 ? 3 : 0)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* PARCELAS */}
          {emprestimo.parcelas.length > 0 && (
            <div className="rounded-2xl border bg-white border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-black text-slate-900">Parcelas</span>
                </div>
                <div className="flex gap-2 text-xs font-black uppercase tracking-widest">
                  {pagas.length > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{pagas.length} pagas</span>}
                  {abertas.length > 0 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{abertas.length} abertas</span>}
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {emprestimo.parcelas.map((p) => {
                  const v = new Date(p.data_vencimento);
                  const pUTC = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
                  const pAtras = p.status === "aberto" && pUTC < hojeUTC;
                  const pHoje = p.status === "aberto" && pUTC.getTime() === hojeUTC.getTime();
                  const pPago = p.status.startsWith("pago");
                  const pAtrasoPago = p.status === "pago_com_atraso";

                  return (
                    <div key={p.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors ${pAtras ? "bg-rose-50/40" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${pPago ? "bg-emerald-50" : pAtras ? "bg-rose-50" : pHoje ? "bg-amber-50" : "bg-slate-100"}`}>
                          {pPago ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : pAtras ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> : pHoje ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : <Calendar className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-black text-slate-900">Parcela {p.numero}</span>
                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                              pPago ? `${pAtrasoPago ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}` :
                              pAtras ? "bg-rose-50 text-rose-700 border-rose-200" :
                              pHoje ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {pPago ? (pAtrasoPago ? "c/ atraso" : "pago") : pAtras ? "atrasada" : pHoje ? "hoje" : "aberta"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex gap-2">
                            <span>Vence {fmtDate(p.data_vencimento)}</span>
                            {p.data_pagamento && <span className="text-emerald-600 font-bold">· Pago {fmtDate(p.data_pagamento)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-black text-slate-900">{fmt(p.valor)}</span>
                        {p.status === "aberto" && (
                          <div className="flex gap-1">
                            <button onClick={() => pay(false)} disabled={isPending} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition-colors shadow-sm cursor-pointer">
                              Pagar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* COL DIREITA — 1/3 */}
        <div className="space-y-4">

          {/* CLIENTE */}
          <div className="rounded-2xl border bg-white border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Tomador</p>
            <div className="flex items-center gap-3 mb-4">
              {emprestimo.cliente.foto_url ? (
                <img src={emprestimo.cliente.foto_url} alt={emprestimo.cliente.nome} className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                  {emprestimo.cliente.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <Link href={`/clientes/${emprestimo.cliente.id}`} className="font-black text-sm text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-0.5 group truncate">
                  {emprestimo.cliente.nome}
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
                <a href={`tel:${emprestimo.cliente.telefone}`} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {emprestimo.cliente.telefone}
                </a>
              </div>
            </div>
            {emprestimo.cliente.blacklist && (
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
                <ShieldOff className="w-3 h-3" /> Lista Negra
              </div>
            )}
          </div>

          {/* MÉTRICAS */}
          <div className="rounded-2xl border bg-white border-slate-200 shadow-sm p-5 grid grid-cols-2 gap-4">
            {[
              { label: "Principal", value: fmt(emprestimo.valor_emprestado), color: "text-slate-900" },
              { label: "Juros", value: `${emprestimo.taxa_juros}%`, color: "text-emerald-600" },
              { label: "Multa", value: `${emprestimo.taxa_multa}%`, color: "text-rose-500" },
              { label: "Frequência", value: freqLabel[emprestimo.frequencia] || emprestimo.frequencia, color: "text-slate-900" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className={`text-sm font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* CONTRATO */}
          <div className="rounded-2xl border bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {[
                { label: "Vencimento", value: fmtDate(emprestimo.data_vencimento) },
                { label: "Tipo", value: tipoLabel[emprestimo.tipo_pagamento] || emprestimo.tipo_pagamento },
                { label: "Categoria", value: emprestimo.categoria || "Sem categoria" },
                { label: "Emprestou", value: emprestimo.parceiro ? `${emprestimo.parceiro.nome} · Parceiro` : "Capital próprio" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <span className="text-xs font-black text-slate-900 text-right max-w-[55%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          {emprestimo.observacoes && (
            <div className="rounded-2xl border bg-amber-50 border-amber-200 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Observações</p>
              <p className="text-xs text-slate-700 leading-relaxed">{emprestimo.observacoes}</p>
            </div>
          )}

          {/* DATA PREVISTA DE PAGAMENTO */}
          {statusReal !== "quitado" && (() => {
            const dp = emprestimo.data_prevista_pagamento;
            let diasDP: number | null = null;
            let urgLabel = "";
            let urgCor = "";
            if (dp) {
              const dpObj = new Date(dp);
              const dpUTC = new Date(Date.UTC(dpObj.getUTCFullYear(), dpObj.getUTCMonth(), dpObj.getUTCDate()));
              diasDP = Math.ceil((dpUTC.getTime() - hojeUTC.getTime()) / 86400000);
              if (diasDP < 0) { urgLabel = `${Math.abs(diasDP)}d atrasada`; urgCor = "rose"; }
              else if (diasDP === 0) { urgLabel = "Vence hoje"; urgCor = "amber"; }
              else if (diasDP <= 2) { urgLabel = `${diasDP}d restantes`; urgCor = "orange"; }
              else { urgLabel = `${diasDP}d restantes`; urgCor = "slate"; }
            }
            return (
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${
                dp && urgCor === "rose" ? "bg-rose-50 border-rose-200" :
                dp && urgCor === "amber" ? "bg-amber-50 border-amber-200" :
                dp && urgCor === "orange" ? "bg-orange-50 border-orange-200" :
                "bg-white border-slate-200"
              }`}>
                <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-black text-slate-900">Data Prevista</span>
                    {dp && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        urgCor === "rose"   ? "bg-rose-100 text-rose-700 border-rose-300" :
                        urgCor === "amber"  ? "bg-amber-100 text-amber-700 border-amber-300" :
                        urgCor === "orange" ? "bg-orange-100 text-orange-700 border-orange-300" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{urgLabel}</span>
                    )}
                  </div>
                  {dp && !showDatePicker && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setShowDatePicker(true); setDataPrevistaInput(dp); }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      >Editar</button>
                      <button
                        onClick={handleLimparDataPrevista}
                        disabled={isSavingData}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      >Remover</button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {dp && !showDatePicker ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-black text-slate-900">{fmtDate(dp)}</span>
                    </div>
                  ) : showDatePicker ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dataPrevistaInput}
                        onChange={(e) => setDataPrevistaInput(e.target.value)}
                        className={inputCls}
                      />
                      <button
                        onClick={handleSalvarDataPrevista}
                        disabled={isSavingData || !dataPrevistaInput}
                        className="flex-shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all disabled:opacity-60 cursor-pointer"
                      >{isSavingData ? "..." : "Salvar"}</button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-shrink-0 px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-all cursor-pointer"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Definir data prevista de pagamento
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AÇÕES */}
          <div className="rounded-2xl border bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-black text-slate-900">Ações</span>
            </div>
            <div className="p-4 space-y-2">
              {statusReal !== "quitado" && (
                <>
                  {multiplas ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <BtnPrimary onClick={() => pay(false)}><Wallet className="w-3.5 h-3.5" /> Pagar Parcela</BtnPrimary>
                        <button onClick={() => payAll(false)} disabled={isPending} className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black rounded-xl transition-all active:scale-[0.98] cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Quitar Tudo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <BtnPrimary onClick={() => pay(false)}><CheckCircle2 className="w-4 h-4" /> Marcar como Pago</BtnPrimary>
                    </>
                  )}
                  <button onClick={receiveJuros} disabled={isPending} className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black rounded-xl transition-all active:scale-[0.98] shadow-sm cursor-pointer">
                    <RefreshCw className="w-4 h-4" /> Receber só os juros (renovar +30d)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <BtnSecondary onClick={() => setModal("renegociar")}><RefreshCw className="w-3.5 h-3.5" /> Renegociar</BtnSecondary>
                    <BtnSecondary onClick={() => setModal("reprogramar")}><CalendarClock className="w-3.5 h-3.5" /> Reprogramar</BtnSecondary>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <BtnSecondary onClick={toggleBL} danger={!emprestimo.cliente.blacklist}>
                  {emprestimo.cliente.blacklist ? <><Shield className="w-3.5 h-3.5" /> Remover BL</> : <><ShieldOff className="w-3.5 h-3.5" /> Lista Negra</>}
                </BtnSecondary>
                <BtnSecondary onClick={whatsapp}><MessageSquare className="w-3.5 h-3.5" /> Lembrete WA</BtnSecondary>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Renegociar ── */}
      {modal === "renegociar" && (
        <Modal onClose={() => setModal(null)} title="Renegociar Dívida" subtitle="Abate um valor do saldo devedor">
          <form onSubmit={submitReneg} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Valor Pago Agora (R$) *</label>
              <input type="number" step="any" required min="0.01" max={saldoRestante} value={valorAbater} onChange={e => setValorAbater(e.target.value)} placeholder="Ex: 500" className={inputCls} />
              <p className="text-xs text-slate-400 mt-1">Saldo atual: <span className="font-bold text-slate-600">{fmt(saldoRestante)}</span></p>
            </div>
            <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
              <span className="text-xs font-bold text-slate-600">Cobrar juros sobre saldo restante</span>
              <input type="checkbox" checked={aplicarJuros} onChange={e => setAplicarJuros(e.target.checked)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </label>
            {aplicarJuros && (
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nova Taxa de Juros (%) *</label>
                <input type="number" step="any" required value={taxaReneg} onChange={e => setTaxaReneg(e.target.value)} placeholder="Ex: 10" className={inputCls} />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Reprogramar ── */}
      {modal === "reprogramar" && (
        <Modal onClose={() => setModal(null)} title="Reprogramar Vencimento" subtitle="Redefine data e condições do contrato">
          <form onSubmit={submitReprog} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nova Data de Vencimento *</label>
              <input type="date" required value={novaData} onChange={e => setNovaData(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Frequência das Parcelas *</label>
              <select value={freqReprog} onChange={e => setFreqReprog(e.target.value)} className={inputCls}>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Valor Extra / Adicional (R$)</label>
              <input type="number" step="any" value={extra} onChange={e => setExtra(e.target.value)} placeholder="Ex: 200 (adiciona ao saldo)" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nova Taxa de Juros (%)</label>
              <input type="number" step="any" value={taxaReprog} onChange={e => setTaxaReprog(e.target.value)} placeholder="Ex: 10 (sobre o novo saldo)" className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Confirmar Exclusão ── */}
      {modal === "delete" && (
        <Modal onClose={() => setModal(null)} title="Excluir Empréstimo?" subtitle="Esta ação é irreversível e não pode ser desfeita.">
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-xs text-rose-700 font-semibold">Todos os dados deste empréstimo, incluindo parcelas e histórico, serão permanentemente removidos.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-colors cursor-pointer">Cancelar</button>
            <button onClick={() => { setModal(null); excluir(); }} disabled={isPending} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir Definitivamente
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Disparo WhatsApp via Plataforma ── */}
      {modal === "wa" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  Enviar Mensagem
                </h3>
                <p className="text-xs text-slate-500 mt-1">Para {emprestimo.cliente.nome}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Respostas Rápidas</label>
                  <button onClick={() => setWaConfigMode(!waConfigMode)} className="text-xs flex items-center gap-1 font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer">
                    {waConfigMode ? "Concluir" : "Configurar"}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {waTemplates.map((msg, i) => (
                    waConfigMode ? (
                      <div key={i} className="flex gap-2 items-start">
                        <textarea 
                          value={msg}
                          onChange={(e) => handleUpdateTemplate(i, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 resize-none h-[60px]"
                        />
                        <button onClick={() => handleRemoveTemplate(i)} className="p-2 mt-2 text-rose-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button key={i} onClick={() => sendWaMsg(msg)} disabled={isWaSending} className="text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        {msg}
                      </button>
                    )
                  ))}
                  {waConfigMode && (
                    <button onClick={handleAddTemplate} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors mt-1 cursor-pointer">
                      Adicionar Nova Mensagem
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mensagem Personalizada</label>
                <textarea 
                  value={waCustomMsg}
                  onChange={(e) => setWaCustomMsg(e.target.value)}
                  placeholder="Digite sua mensagem livre aqui..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 min-h-[100px] resize-y"
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => sendWaMsg(waCustomMsg)}
                disabled={!waCustomMsg.trim() || isWaSending}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isWaSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isWaSending ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
