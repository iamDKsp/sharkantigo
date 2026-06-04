"use client";

import { useState, useTransition, useEffect } from "react";
import { MessageSquare, Calendar, DollarSign, X, Loader2, Settings } from "lucide-react";
import { logRemindersSent } from "./actions";

interface Parcela {
  id: string;
  numero: number;
  valor: number;
  data_vencimento: string;
  status: string;
  emprestimo: {
    id: string;
    valor_emprestado: number;
    taxa_juros: number;
    tipo_pagamento: string;
    cliente: {
      id: string;
      nome: string;
      telefone: string;
    };
  };
}

interface ClientCobrancasViewProps {
  atrasados: Parcela[];
  hojeLista: Parcela[];
  aVencer: Parcela[];
}

export default function ClientCobrancasView({ atrasados, hojeLista, aVencer }: ClientCobrancasViewProps) {
  const [isPending, startTransition] = useTransition();

  // Estados de Seleção para cada Grupo
  const [selectedAtrasados, setSelectedAtrasados] = useState<string[]>([]);
  const [selectedHoje, setSelectedHoje] = useState<string[]>([]);
  const [selectedAVencer, setSelectedAVencer] = useState<string[]>([]);

  // Estados de Simulação
  const [showSimulate, setShowSimulate] = useState(false);
  const [simulateProgress, setSimulateProgress] = useState(0);
  const [simulateLogs, setSimulateLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Modelos de Mensagens Configuráveis
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [msgAtrasados, setMsgAtrasados] = useState(`Olá, {nome}! Notamos que a parcela nº {num} no valor de {valor} de seu empréstimo está pendente (venceu em {data}). Por favor, entre em contato conosco para regularizar.`);
  const [msgHoje, setMsgHoje] = useState(`Olá, {nome}! Passando para lembrar que hoje ({data}) vence a sua parcela nº {num} no valor de {valor}. Caso já tenha pago, por favor desconsidere.`);
  const [msgAVencer, setMsgAVencer] = useState(`Olá, {nome}! Este é um lembrete amigável de que a sua parcela nº {num} no valor de {valor} vencerá em breve, no dia {data}.`);

  useEffect(() => {
    const savedAtrasados = localStorage.getItem("template_atrasados");
    const savedHoje = localStorage.getItem("template_hoje");
    const savedAVencer = localStorage.getItem("template_aVencer");

    if (savedAtrasados) setMsgAtrasados(savedAtrasados);
    if (savedHoje) setMsgHoje(savedHoje);
    if (savedAVencer) setMsgAVencer(savedAVencer);
  }, []);

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("template_atrasados", msgAtrasados);
    localStorage.setItem("template_hoje", msgHoje);
    localStorage.setItem("template_aVencer", msgAVencer);
    setShowConfigModal(false);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatData = (dateStr: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(dateStr));
  };

  // Mensagens Customizadas por Tipo
  const getMessageText = (p: Parcela, type: "atrasados" | "hoje" | "aVencer") => {
    const nome = p.emprestimo.cliente.nome.split(" ")[0];
    const data = formatData(p.data_vencimento);
    const valor = formatBRL(p.valor);
    const num = p.numero;

    let template = "";
    if (type === "atrasados") {
      template = msgAtrasados;
    } else if (type === "hoje") {
      template = msgHoje;
    } else {
      template = msgAVencer;
    }

    return template
      .replace(/{nome}/g, nome)
      .replace(/{data}/g, data)
      .replace(/{valor}/g, valor)
      .replace(/{num}/g, String(num));
  };

  // Disparo em Massa para um grupo específico
  const handleMassTrigger = (targetIds: string[], type: "atrasados" | "hoje" | "aVencer") => {
    if (targetIds.length === 0) return;

    setIsSimulating(true);
    setShowSimulate(true);
    setSimulateProgress(0);
    setSimulateLogs([]);

    const fullList = type === "atrasados" ? atrasados : type === "hoje" ? hojeLista : aVencer;
    const itemsToProcess = fullList.filter((p) => targetIds.includes(p.id));
    let currentIndex = 0;

    const processNext = async () => {
      if (currentIndex >= itemsToProcess.length) {
        setIsSimulating(false);
        setSimulateProgress(100);
        setSimulateLogs((prev) => [...prev, "✓ Todos os disparos concluídos com sucesso! Logs salvos."]);
        
        startTransition(async () => {
          await logRemindersSent(targetIds);
        });
        return;
      }

      const p = itemsToProcess[currentIndex];
      const clienteNome = p.emprestimo.cliente.nome;
      const telefone = p.emprestimo.cliente.telefone;
      const msgText = getMessageText(p, type);

      setSimulateLogs((prev) => [
        ...prev,
        `[${currentIndex + 1}/${itemsToProcess.length}] Enviando para ${clienteNome} (${telefone})...`,
      ]);

      try {
        const res = await fetch("http://localhost:3001/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ phone: telefone, text: msgText }]
          })
        });

        if (res.ok) {
          setSimulateLogs((prev) => [
            ...prev,
            `→ Lembrete enviado via WhatsApp para ${clienteNome}.`,
          ]);
        } else {
          const errData = await res.json().catch(() => ({}));
          setSimulateLogs((prev) => [
            ...prev,
            `❌ Falha ao enviar para ${clienteNome}: ${errData.error || "Erro desconhecido"}.`,
          ]);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setSimulateLogs((prev) => [
          ...prev,
          `❌ Falha de conexão: ${errMsg}. Certifique-se de que o WhatsApp está conectado no Perfil.`,
        ]);
      }

      currentIndex++;
      setSimulateProgress(Math.floor((currentIndex / itemsToProcess.length) * 100));
      setTimeout(processNext, 1000);
    };

    processNext();
  };

  // Funções de Seleção Auxiliares
  const toggleSelectAll = (list: Parcela[], selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>, checked: boolean) => {
    if (checked) {
      setSelected(list.map((p) => p.id));
    } else {
      setSelected([]);
    }
  };

  const toggleSelectOne = (setSelected: React.Dispatch<React.SetStateAction<string[]>>, id: string, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [...prev, id]);
    } else {
      setSelected((prev) => prev.filter((item) => item !== id));
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-zinc-800 to-zinc-950 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
            Painel de Cobranças
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Gerenciamento estratégico de lembretes e cobranças em massa.
          </p>
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center space-x-1.5 border border-zinc-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm self-start md:self-center"
        >
          <Settings className="w-4 h-4 text-emerald-500" />
          <span>Configurar Mensagens</span>
        </button>
      </div>

      {/* 1. GRUPO: ATRASADOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-rose-500/10 dark:border-rose-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-md font-extrabold text-rose-600 dark:text-rose-455">Grupo: Atrasados / Vencidos</h2>
          </div>
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-sm font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
            Total: {formatBRL(atrasados.reduce((acc, p) => acc + p.valor, 0))} ({atrasados.length} parcelas)
          </span>
        </div>

        <div className="premium-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/20 dark:bg-white/[0.01]">
            <div className="flex items-center space-x-2.5">
              <input
                type="checkbox"
                checked={atrasados.length > 0 && selectedAtrasados.length === atrasados.length}
                onChange={(e) => toggleSelectAll(atrasados, selectedAtrasados, setSelectedAtrasados, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-rose-550 focus:ring-rose-500 cursor-pointer accent-rose-500"
                disabled={atrasados.length === 0}
              />
              <span className="text-sm font-black text-slate-550 dark:text-zinc-400 uppercase tracking-wider">
                {selectedAtrasados.length} de {atrasados.length} selecionados
              </span>
            </div>
            {selectedAtrasados.length > 0 && (
              <button
                onClick={() => handleMassTrigger(selectedAtrasados, "atrasados")}
                className="flex items-center justify-center space-x-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Disparo em Massa ({selectedAtrasados.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {atrasados.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-550 dark:text-zinc-500">
                Nenhuma parcela vencida no momento.
              </div>
            ) : (
              atrasados.map((p) => {
                const isChecked = selectedAtrasados.includes(p.id);
                const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(
                  getMessageText(p, "atrasados")
                )}`;

                return (
                  <div
                    key={p.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between transition-all duration-200 ${
                      isChecked ? "bg-rose-500/[0.03]" : "hover:bg-slate-50/30 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelectOne(setSelectedAtrasados, p.id, e.target.checked)}
                        className="mt-1.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-rose-550 focus:ring-rose-500 cursor-pointer accent-rose-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">{p.emprestimo.cliente.nome}</span>
                          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">
                            Parcela {p.numero}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-550" />
                            <span>Vencimento: {formatData(p.data_vencimento)}</span>
                          </span>
                          <span>Tel: {p.emprestimo.cliente.telefone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-4 mt-3 md:mt-0 pl-8 md:pl-0">
                      <div className="text-left md:text-right">
                        <span className="text-sm font-black text-slate-950 dark:text-white">{formatBRL(p.valor)}</span>
                      </div>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 border border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500/10 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. GRUPO: VENCENDO HOJE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-amber-500/10 dark:border-amber-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <h2 className="text-md font-extrabold text-amber-600 dark:text-amber-455">Grupo: Vencendo Hoje</h2>
          </div>
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-sm font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
            Total: {formatBRL(hojeLista.reduce((acc, p) => acc + p.valor, 0))} ({hojeLista.length} parcelas)
          </span>
        </div>

        <div className="premium-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/20 dark:bg-white/[0.01]">
            <div className="flex items-center space-x-2.5">
              <input
                type="checkbox"
                checked={hojeLista.length > 0 && selectedHoje.length === hojeLista.length}
                onChange={(e) => toggleSelectAll(hojeLista, selectedHoje, setSelectedHoje, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-amber-550 focus:ring-amber-500 cursor-pointer accent-amber-500"
                disabled={hojeLista.length === 0}
              />
              <span className="text-sm font-black text-slate-550 dark:text-zinc-400 uppercase tracking-wider">
                {selectedHoje.length} de {hojeLista.length} selecionados
              </span>
            </div>
            {selectedHoje.length > 0 && (
              <button
                onClick={() => handleMassTrigger(selectedHoje, "hoje")}
                className="flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-650 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Disparo em Massa ({selectedHoje.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {hojeLista.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-550 dark:text-zinc-500">
                Nenhuma parcela vencendo hoje.
              </div>
            ) : (
              hojeLista.map((p) => {
                const isChecked = selectedHoje.includes(p.id);
                const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(
                  getMessageText(p, "hoje")
                )}`;

                return (
                  <div
                    key={p.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between transition-all duration-200 ${
                      isChecked ? "bg-amber-500/[0.03]" : "hover:bg-slate-50/30 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelectOne(setSelectedHoje, p.id, e.target.checked)}
                        className="mt-1.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-amber-550 focus:ring-amber-500 cursor-pointer accent-amber-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">{p.emprestimo.cliente.nome}</span>
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">
                            Parcela {p.numero}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-550" />
                            <span>Vencimento: {formatData(p.data_vencimento)}</span>
                          </span>
                          <span>Tel: {p.emprestimo.cliente.telefone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-4 mt-3 md:mt-0 pl-8 md:pl-0">
                      <div className="text-left md:text-right">
                        <span className="text-sm font-black text-slate-950 dark:text-white">{formatBRL(p.valor)}</span>
                      </div>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 border border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500/10 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. GRUPO: A VENCER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/10 dark:border-emerald-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <h2 className="text-md font-extrabold text-emerald-600 dark:text-emerald-455">Grupo: A Vencer (em até 3 dias)</h2>
          </div>
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
            Total: {formatBRL(aVencer.reduce((acc, p) => acc + p.valor, 0))} ({aVencer.length} parcelas)
          </span>
        </div>

        <div className="premium-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/20 dark:bg-white/[0.01]">
            <div className="flex items-center space-x-2.5">
              <input
                type="checkbox"
                checked={aVencer.length > 0 && selectedAVencer.length === aVencer.length}
                onChange={(e) => toggleSelectAll(aVencer, selectedAVencer, setSelectedAVencer, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-550 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                disabled={aVencer.length === 0}
              />
              <span className="text-sm font-black text-slate-555 dark:text-zinc-400 uppercase tracking-wider">
                {selectedAVencer.length} de {aVencer.length} selecionados
              </span>
            </div>
            {selectedAVencer.length > 0 && (
              <button
                onClick={() => handleMassTrigger(selectedAVencer, "aVencer")}
                className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Disparo em Massa ({selectedAVencer.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {aVencer.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-550 dark:text-zinc-500">
                Nenhuma parcela vencendo nos próximos 3 dias.
              </div>
            ) : (
              aVencer.map((p) => {
                const isChecked = selectedAVencer.includes(p.id);
                const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(
                  getMessageText(p, "aVencer")
                )}`;

                return (
                  <div
                    key={p.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between transition-all duration-200 ${
                      isChecked ? "bg-emerald-500/[0.03]" : "hover:bg-slate-50/30 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelectOne(setSelectedAVencer, p.id, e.target.checked)}
                        className="mt-1.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-555 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">{p.emprestimo.cliente.nome}</span>
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">
                            Parcela {p.numero}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-555" />
                            <span>Vencimento: {formatData(p.data_vencimento)}</span>
                          </span>
                          <span>Tel: {p.emprestimo.cliente.telefone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-4 mt-3 md:mt-0 pl-8 md:pl-0">
                      <div className="text-left md:text-right">
                        <span className="text-sm font-black text-slate-950 dark:text-white">{formatBRL(p.valor)}</span>
                      </div>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 border border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500/10 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Simulação de Disparo */}
      {showSimulate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#13221b] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 text-slate-900 dark:text-white animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-sm">Disparo de Lembretes em Massa</h3>
              {!isSimulating && (
                <button
                  type="button"
                  onClick={() => setShowSimulate(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                <span>Progresso de Envio</span>
                <span>{simulateProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${simulateProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Log visual */}
            <div className="bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 h-48 overflow-y-auto font-mono text-sm text-slate-700 dark:text-emerald-400 space-y-1.5 scrollbar-thin">
              {simulateLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => setShowSimulate(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-350 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              >
                {isSimulating ? "Processando..." : "Fechar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Mensagens */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveTemplates}
            className="bg-white dark:bg-[#13221b] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4 text-slate-900 dark:text-white animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-sm flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <Settings className="w-5 h-5 animate-spin-slow" />
                <span>Configurar Modelos de Cobrança</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-350">Mensagem: Atrasados / Vencidos</label>
                <textarea
                  value={msgAtrasados}
                  onChange={(e) => setMsgAtrasados(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#090d16] border border-slate-205 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-350">Mensagem: Vencendo Hoje</label>
                <textarea
                  value={msgHoje}
                  onChange={(e) => setMsgHoje(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#090d16] border border-slate-205 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-350">Mensagem: A Vencer (Lembrete)</label>
                <textarea
                  value={msgAVencer}
                  onChange={(e) => setMsgAVencer(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#090d16] border border-slate-205 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 dark:text-white"
                />
              </div>

              <div className="bg-emerald-500/[0.04] dark:bg-emerald-950/20 border border-emerald-500/10 rounded-xl p-4.5 space-y-2 text-slate-650 dark:text-emerald-400">
                <span className="font-extrabold block uppercase tracking-wider text-sm">Variáveis Dinâmicas</span>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono leading-relaxed">
                  <span><strong className="text-emerald-650 dark:text-emerald-300 font-bold">{`{nome}`}</strong> - Primeiro nome</span>
                  <span><strong className="text-emerald-650 dark:text-emerald-300 font-bold">{`{valor}`}</strong> - Valor parcela</span>
                  <span><strong className="text-emerald-650 dark:text-emerald-300 font-bold">{`{data}`}</strong> - Vencimento</span>
                  <span><strong className="text-emerald-650 dark:text-emerald-300 font-bold">{`{num}`}</strong> - Nº parcela</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-350 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
