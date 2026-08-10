"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, ExternalLink, CheckCheck, Calendar, AlertCircle, Clock } from "lucide-react";

interface Notificacao {
  id: string;
  clienteNome: string;
  clienteId: string;
  clienteTelefone: string;
  dataPrevista: string; // "YYYY-MM-DD"
  diasRestantes: number;
  valorEmprestado: number;
}

const LIDAS_KEY = "notificacoes_lidas_v1";

function getLidas(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LIDAS_KEY) || "{}");
  } catch {
    return {};
  }
}

function marcarLida(id: string) {
  const lidas = getLidas();
  lidas[id] = new Date().toISOString();
  localStorage.setItem(LIDAS_KEY, JSON.stringify(lidas));
}

function marcarTodasLidas(ids: string[]) {
  const lidas = getLidas();
  const agora = new Date().toISOString();
  ids.forEach((id) => { lidas[id] = agora; });
  localStorage.setItem(LIDAS_KEY, JSON.stringify(lidas));
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtData = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

function getUrgencia(dias: number) {
  if (dias < 0) return { label: `${Math.abs(dias)}d atrasada`, cor: "rose", icon: AlertCircle };
  if (dias === 0) return { label: "Vence hoje", cor: "amber", icon: Clock };
  if (dias === 1) return { label: "Vence amanhã", cor: "orange", icon: Clock };
  return { label: `${dias}d restantes`, cor: "amber", icon: Calendar };
}

export default function NotificacoesMenu() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidas, setLidas] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const fetchNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      if (res.ok) {
        const data: Notificacao[] = await res.json();
        setNotificacoes(data);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, []);

  // Carrega na montagem e a cada 5 minutos
  useEffect(() => {
    setLidas(getLidas());
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotificacoes]);

  // Atualiza lidas quando abre o painel
  useEffect(() => {
    if (open) setLidas(getLidas());
  }, [open]);

  // Fecha ao clicar fora (desktop)
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = panelRef.current?.contains(target);
      const insideMobile  = mobileSheetRef.current?.contains(target);
      const insideBtn     = btnRef.current?.contains(target);
      if (!insideDesktop && !insideMobile && !insideBtn) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Conta não lidas
  const naoLidas = notificacoes.filter((n) => !lidas[n.id]);
  const count = naoLidas.length;

  const handleMarcarLida = (id: string) => {
    marcarLida(id);
    setLidas(getLidas());
  };

  const handleMarcarTodas = () => {
    marcarTodasLidas(notificacoes.map((n) => n.id));
    setLidas(getLidas());
  };

  const handleAbrirEmprestimo = (id: string) => {
    setOpen(false);
    router.push(`/emprestimos/${id}`);
  };

  return (
    <div className="relative">
      {/* Botão / âncora — sobrepõe ao cifrão dourado do logo via posicionamento */}
      <button
        ref={btnRef}
        onClick={() => { setOpen((v) => !v); if (!open) { setLidas(getLidas()); } }}
        aria-label={`Notificações${count > 0 ? ` — ${count} novas` : ""}`}
        className="relative p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition-all active:scale-95 cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[17px] h-[17px] px-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-sm shadow-rose-500/40 ring-1 ring-[#064e3b] animate-pulse-once select-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── PAINEL DESKTOP (dropdown) ── */}
      {open && (
        <>
          {/* Overlay — cobre tela toda incluindo nav mobile */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
            onClick={() => setOpen(false)}
          />

          {/* Painel desktop */}
          <div
            ref={panelRef}
            className={`
              z-50 bg-white border border-slate-200 shadow-2xl
              hidden md:flex md:flex-col
              absolute right-0 top-full mt-2 w-96 rounded-2xl
              max-h-[80vh] overflow-hidden
            `}
          >
            <PainelConteudo
              notificacoes={notificacoes}
              lidas={lidas}
              loading={loading}
              onMarcarLida={handleMarcarLida}
              onMarcarTodas={handleMarcarTodas}
              onAbrirEmprestimo={handleAbrirEmprestimo}
              onClose={() => setOpen(false)}
            />
          </div>

          {/* Bottom sheet mobile — fica ACIMA da nav bar (bottom-16 = 64px) */}
          <div
            ref={mobileSheetRef}
            className="md:hidden fixed bottom-16 left-0 right-0 z-[60] bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up"
            style={{ maxHeight: 'calc(85vh - 4rem)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <PainelConteudo
              notificacoes={notificacoes}
              lidas={lidas}
              loading={loading}
              onMarcarLida={handleMarcarLida}
              onMarcarTodas={handleMarcarTodas}
              onAbrirEmprestimo={handleAbrirEmprestimo}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-componente: conteúdo do painel ──
interface PainelProps {
  notificacoes: Notificacao[];
  lidas: Record<string, string>;
  loading: boolean;
  onMarcarLida: (id: string) => void;
  onMarcarTodas: () => void;
  onAbrirEmprestimo: (id: string) => void;
  onClose: () => void;
}

function PainelConteudo({
  notificacoes,
  lidas,
  loading,
  onMarcarLida,
  onMarcarTodas,
  onAbrirEmprestimo,
  onClose,
}: PainelProps) {
  const naoLidas = notificacoes.filter((n) => !lidas[n.id]);
  const jaLidas  = notificacoes.filter((n) =>  lidas[n.id]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <span className="font-black text-sm text-slate-900">Notificações</span>
          {naoLidas.length > 0 && (
            <span className="flex items-center justify-center px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full leading-none">
              {naoLidas.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {naoLidas.length > 0 && (
            <button
              onClick={onMarcarTodas}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marcar todas lidas</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1">
        {loading && notificacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Carregando...</span>
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-600">Sem notificações</p>
              <p className="text-xs mt-0.5">Nenhum pagamento previsto nos próximos 2 dias</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Não lidas */}
            {naoLidas.length > 0 && (
              <div>
                <p className="px-5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Novas
                </p>
                {naoLidas.map((n) => (
                  <NotificacaoCard
                    key={n.id}
                    notificacao={n}
                    lida={false}
                    onMarcarLida={() => onMarcarLida(n.id)}
                    onAbrir={() => onAbrirEmprestimo(n.id)}
                  />
                ))}
              </div>
            )}
            {/* Já lidas */}
            {jaLidas.length > 0 && (
              <div>
                <p className="px-5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Lidas
                </p>
                {jaLidas.map((n) => (
                  <NotificacaoCard
                    key={n.id}
                    notificacao={n}
                    lida={true}
                    onMarcarLida={() => onMarcarLida(n.id)}
                    onAbrir={() => onAbrirEmprestimo(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Card individual ──
function NotificacaoCard({
  notificacao,
  lida,
  onMarcarLida,
  onAbrir,
}: {
  notificacao: Notificacao;
  lida: boolean;
  onMarcarLida: () => void;
  onAbrir: () => void;
}) {
  const { label, cor, icon: Icon } = getUrgencia(notificacao.diasRestantes);

  const corClasses: Record<string, string> = {
    rose:   "bg-rose-50 text-rose-700 border-rose-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <div className={`px-5 py-3.5 transition-colors hover:bg-slate-50 ${lida ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Dot indicador */}
        {!lida && (
          <div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 shadow-sm shadow-rose-300" />
        )}
        {lida && <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900 truncate">{notificacao.clienteNome}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${corClasses[cor] || corClasses.amber}`}>
              <Icon className="w-2.5 h-2.5" />
              {label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Previsto: <span className="font-semibold text-slate-700">{fmtData(notificacao.dataPrevista)}</span>
            {" · "}
            <span className="font-semibold text-emerald-700">{fmtBRL(notificacao.valorEmprestado)}</span>
          </p>

          {/* Ações */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onAbrir}
              className="flex items-center gap-1 text-[11px] font-black text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir Empréstimo
            </button>
            {!lida && (
              <button
                onClick={onMarcarLida}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                Marcar como lida
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
