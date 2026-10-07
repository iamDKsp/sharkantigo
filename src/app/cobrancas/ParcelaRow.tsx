"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarClock, Check, Clock, Copy, ExternalLink, MessageCircle, MoreHorizontal, Phone, User } from "lucide-react";
import { linkWhatsapp } from "@/lib/mensagens/render";
import {
  formatBRL,
  formatData,
  formatTelefone,
  isParcelaUnica,
  severidade,
  telLink,
  tempoRelativo,
  type Parcela,
  type Tema,
  type TipoCobranca,
} from "./tipos";

interface ParcelaRowProps {
  p: Parcela;
  /** Posição na lista — usada só para escalonar a animação de entrada. */
  index: number;
  tema: Tema;
  tipo: TipoCobranca;
  selecionado: boolean;
  cobradoHoje: boolean;
  /** ISO da última cobrança (inclui as feitas nesta sessão). */
  ultimoEnvio: string | null;
  onToggle: (id: string, checked: boolean) => void;
  onCobrar: (p: Parcela, tipo: TipoCobranca) => void;
  onCopiar: (p: Parcela) => void;
  modoCarencia?: boolean;
}

/** Selo de severidade + situação da cobrança. */
function StatusBlock({ p, cobradoHoje, ultimoEnvio, modoCarencia }: { p: Parcela; cobradoHoje: boolean; ultimoEnvio: string | null; modoCarencia?: boolean }) {
  const sev = severidade(p.diasAtraso, modoCarencia);
  const textoCobranca = ultimoEnvio ? `Cobrado ${tempoRelativo(ultimoEnvio)}` : cobradoHoje ? "Cobrado hoje" : "Ainda não cobrado";
  return (
    <>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${sev.badge}`}>
        {sev.texto}
      </span>
      {cobradoHoje ? (
        <span
          key="cobrado"
          suppressHydrationWarning
          className="animate-pop inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          <Check className="w-3 h-3" strokeWidth={3} />
          {textoCobranca}
        </span>
      ) : (
        <span suppressHydrationWarning className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Clock className="w-3 h-3" />
          {textoCobranca}
        </span>
      )}
    </>
  );
}

/** Menu "⋯" — usa position: fixed para nunca ser cortado pelo cartão da lista. */
function MenuLinha({ p, onCopiar }: { p: Parcela; onCopiar: (p: Parcela) => void }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    const aoClicarFora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!menuRef.current?.contains(alvo) && !btnRef.current?.contains(alvo)) fechar();
    };
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("pointerdown", aoClicarFora);
    document.addEventListener("keydown", aoTecla);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("pointerdown", aoClicarFora);
      document.removeEventListener("keydown", aoTecla);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  const alternar = () => {
    if (aberto) return setAberto(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const abreParaCima = window.innerHeight - r.bottom < 190;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      ...(abreParaCima ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
    setAberto(true);
  };

  const itemCls =
    "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors cursor-pointer text-left";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={alternar}
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`btn-press h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-xl border text-slate-500 cursor-pointer ${
          aberto ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700"
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {aberto && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          className="animate-drop-in fixed z-[45] w-52 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden divide-y divide-slate-100"
        >
          <Link role="menuitem" href={`/clientes/${p.emprestimo.cliente.id}`} className={itemCls}>
            <User className="w-4 h-4 text-slate-400" /> Ver cliente
          </Link>
          <a role="menuitem" href={telLink(p.emprestimo.cliente.telefone)} onClick={() => setAberto(false)} className={itemCls}>
            <Phone className="w-4 h-4 text-slate-400" /> Ligar
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onCopiar(p);
              setAberto(false);
            }}
            className={itemCls}
          >
            <Copy className="w-4 h-4 text-slate-400" /> Copiar mensagem
          </button>
        </div>
      )}
    </>
  );
}

function ParcelaRowBase({ p, index, tema, tipo, selecionado, cobradoHoje, ultimoEnvio, onToggle, onCobrar, onCopiar, modoCarencia }: ParcelaRowProps) {
  const cliente = p.emprestimo.cliente;
  const sev = severidade(p.diasAtraso, modoCarencia);
  const semTelefone = !cliente.telefone?.replace(/\D/g, "");
  const totalLabel = isParcelaUnica(p) ? "À Vista" : `Parc. ${p.numero}/${p.emprestimo.totalParcelas}`;

  return (
    <div
      style={{ ["--i" as string]: Math.min(index, 12) }}
      className={`animate-row-in group relative grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_13rem_7.5rem_auto] items-center gap-x-3 gap-y-2.5 pl-4 pr-3 sm:pr-4 py-3 transition-colors duration-200 ${
        selecionado ? tema.selectedBg : "hover:bg-slate-50/70"
      }`}
    >
      {/* Barra lateral de urgência */}
      <span aria-hidden className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 group-hover:top-1 group-hover:bottom-1 ${sev.barra}`} />

      <input
        type="checkbox"
        checked={selecionado}
        onChange={(e) => onToggle(p.id, e.target.checked)}
        aria-label={`Selecionar ${cliente.nome}`}
        className={`w-[18px] h-[18px] rounded border-slate-300 cursor-pointer flex-shrink-0 ${tema.accent}`}
      />

      {/* Cliente */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/clientes/${cliente.id}`}
            title="Abrir perfil do cliente"
            className="font-bold text-sm text-slate-900 truncate hover:text-emerald-700 hover:underline underline-offset-2 decoration-emerald-300 transition-colors"
          >
            {cliente.nome}
          </Link>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${tema.chip}`}>{totalLabel}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            {formatData(p.data_vencimento)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums">{formatTelefone(cliente.telefone)}</span>
        </div>
        {/* Status — versão celular (no desktop vira coluna própria) */}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap md:hidden">
          <StatusBlock p={p} cobradoHoje={cobradoHoje} ultimoEnvio={ultimoEnvio} modoCarencia={modoCarencia} />
        </div>
        {p.emprestimo.data_prevista_pagamento && (
          <div className="mt-1 flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700">
              <CalendarClock className="w-3 h-3" />
              Previsto: {formatData(p.emprestimo.data_prevista_pagamento)}
            </span>
          </div>
        )}
      </div>

      {/* Status — versão desktop */}
      <div className="hidden md:flex flex-col items-start gap-1.5">
        <StatusBlock p={p} cobradoHoje={cobradoHoje} ultimoEnvio={ultimoEnvio} modoCarencia={modoCarencia} />
      </div>

      {/* Valor */}
      <span className="text-sm font-black text-slate-900 tabular-nums text-right">{formatBRL(p.valor)}</span>

      {/* Ações: no celular ocupam a 2ª linha, com Cobrar em largura total */}
      <div className="col-start-2 col-span-2 md:col-start-auto md:col-span-1 flex items-center gap-2 md:justify-end">
        {semTelefone ? (
          <span
            title="Cliente sem telefone cadastrado"
            className="flex-1 md:flex-none h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" /> Sem telefone
          </span>
        ) : (
          <a
            href={linkWhatsapp(cliente.telefone, p.mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onCobrar(p, tipo)}
            className={`btn-press flex-1 md:flex-none h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              cobradoHoje
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/25 hover:shadow-md hover:shadow-emerald-600/30"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {cobradoHoje ? "Cobrar de novo" : "Cobrar"}
          </a>
        )}

        <Link
          href={`/emprestimos/${p.emprestimo.id}`}
          title="Abrir empréstimo"
          className="btn-press h-9 px-3 flex-shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline md:hidden xl:inline">Empréstimo</span>
        </Link>

        <MenuLinha p={p} onCopiar={onCopiar} />
      </div>
    </div>
  );
}

/** memo: marcar uma linha não re-renderiza as outras ~90. */
export default memo(ParcelaRowBase);
