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
    totalParcelas: number;
    data_prevista_pagamento: string | null;
    cliente: {
      id: string;
      nome: string;
      telefone: string;
    };
  };
}

interface ClientCobrancasViewProps {
  atrasadosOntem: Parcela[];
  atrasadosAnteriores: Parcela[];
  hojeLista: Parcela[];
  aVencer: Parcela[];
  initialFiltro?: string;
}

type TabId = "atrasados" | "ontem" | "anteriores" | "hoje" | "aVencer";

export default function ClientCobrancasView({ atrasadosOntem, atrasadosAnteriores, hojeLista, aVencer, initialFiltro }: ClientCobrancasViewProps) {
  // Combina ontem + anteriores para manter compatibilidade com lógica existente
  const atrasados = [...atrasadosOntem, ...atrasadosAnteriores].sort(
    (a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
  );

  // Resolve aba inicial a partir do filtro da URL
  const resolveTab = (f?: string): TabId => {
    if (f === "ontem") return "ontem";
    if (f === "anteriores") return "anteriores";
    if (f === "hoje") return "hoje";
    if (f === "aVencer") return "aVencer";
    return "atrasados";
  };

  const [activeTab, setActiveTab] = useState<TabId>(resolveTab(initialFiltro));
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
  // Templates parcelado (com nº de parcela)
  const [msgAtrasados, setMsgAtrasados] = useState(`Olá, {nome}! Notamos que a parcela nº {num} no valor de {valor} do seu empréstimo está pendente (venceu em {data}). Por favor, regularize o quanto antes.`);
  const [msgHoje, setMsgHoje] = useState(`Olá, {nome}! Passando para lembrar que hoje ({data}) vence a sua parcela nº {num} no valor de {valor}. Caso já tenha pago, por favor desconsidere.`);
  const [msgAVencer, setMsgAVencer] = useState(`Olá, {nome}! Lembrete: a sua parcela nº {num} no valor de {valor} vencerá em breve, no dia {data}.`);
  // Templates à vista (sem nº de parcela)
  const [msgAtrasadosAvista, setMsgAtrasadosAvista] = useState(`Olá, {nome}! Notamos que o pagamento de {valor} do seu empréstimo está pendente (venceu em {data}). Por favor, regularize o quanto antes.`);
  const [msgHojeAvista, setMsgHojeAvista] = useState(`Olá, {nome}! Passando para lembrar que hoje ({data}) vence o pagamento de {valor} do seu empréstimo. Caso já tenha pago, por favor desconsidere.`);
  const [msgAVencerAvista, setMsgAVencerAvista] = useState(`Olá, {nome}! Lembrete: o pagamento de {valor} do seu empréstimo vencerá em breve, no dia {data}.`);

  useEffect(() => {
    const savedAtrasados = localStorage.getItem("template_atrasados");
    const savedHoje = localStorage.getItem("template_hoje");
    const savedAVencer = localStorage.getItem("template_aVencer");
    const savedAtrasadosAv = localStorage.getItem("template_atrasados_avista");
    const savedHojeAv = localStorage.getItem("template_hoje_avista");
    const savedAVencerAv = localStorage.getItem("template_avencer_avista");

    if (savedAtrasados) setMsgAtrasados(savedAtrasados);
    if (savedHoje) setMsgHoje(savedHoje);
    if (savedAVencer) setMsgAVencer(savedAVencer);
    if (savedAtrasadosAv) setMsgAtrasadosAvista(savedAtrasadosAv);
    if (savedHojeAv) setMsgHojeAvista(savedHojeAv);
    if (savedAVencerAv) setMsgAVencerAvista(savedAVencerAv);
  }, []);

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("template_atrasados", msgAtrasados);
    localStorage.setItem("template_hoje", msgHoje);
    localStorage.setItem("template_aVencer", msgAVencer);
    localStorage.setItem("template_atrasados_avista", msgAtrasadosAvista);
    localStorage.setItem("template_hoje_avista", msgHojeAvista);
    localStorage.setItem("template_avencer_avista", msgAVencerAvista);
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

  // Rodapé fixo de pagamento — Pix + instrução + renovação com valor
  const getPIXRodape = (p: Parcela) => {
    const valorRenovacao = formatBRL(p.emprestimo.valor_emprestado * (p.emprestimo.taxa_juros / 100));
    return `\n\n💳 *Para pagar:*\nPix: 14991185521 (Itaú)\nNome: Ronivaldo Gabriel Oscar\n\nSe preferir, podemos combinar para buscar pessoalmente em dinheiro. 😊\n\n🔄 *Ou, se preferir, podemos fazer a renovação do empréstimo!*\nO valor da renovação é de apenas *${valorRenovacao}* (juros do período). Entre em contato e combinamos!`;
  };

  // Mensagens Customizadas por Tipo
  const getMessageText = (p: Parcela, type: "atrasados" | "hoje" | "aVencer") => {
    const nome = p.emprestimo.cliente.nome.split(" ")[0];
    const data = formatData(p.data_vencimento);
    const valor = formatBRL(p.valor);
    const num = p.numero;
    // Empréstimo é "único" se tiver apenas 1 parcela no total
    const isUnico = p.emprestimo.totalParcelas === 1;

    let template = "";
    if (type === "atrasados") {
      template = isUnico ? msgAtrasadosAvista : msgAtrasados;
    } else if (type === "hoje") {
      template = isUnico ? msgHojeAvista : msgHoje;
    } else {
      template = isUnico ? msgAVencerAvista : msgAVencer;
    }

    const corpo = template
      .replace(/{nome}/g, nome)
      .replace(/{data}/g, data)
      .replace(/{valor}/g, valor)
      .replace(/{num}/g, String(num));

    return corpo + getPIXRodape(p);
  };

  // Disparo em Massa para um grupo específico
  const handleMassTrigger = (targetIds: string[], type: "atrasados" | "hoje" | "aVencer") => {
    if (targetIds.length === 0) return;

    setIsSimulating(true);
    setShowSimulate(true);
    setSimulateProgress(0);
    setSimulateLogs([]);

    const fullList =
      type === "atrasados" ? atrasados
      : type === "hoje" ? hojeLista
      : aVencer;
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
        const res = await fetch("/api/whatsapp/send", {
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

  // Variáveis derivadas do tab ativo (calculadas fora do JSX)
  const listaAtrasados = activeTab === "ontem" ? atrasadosOntem : activeTab === "anteriores" ? atrasadosAnteriores : atrasados;
  const tituloAtrasados = activeTab === "ontem" ? "Atrasados Ontem" : activeTab === "anteriores" ? "Atrasados Anteriores (2+ dias)" : "Todos Atrasados / Vencidos";
  const corAtrasados = activeTab === "anteriores" ? "red" : activeTab === "ontem" ? "orange" : "rose";

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-1 animate-fade-in">
      {/* Header mobile-compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cobranças
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Gerenciamento de lembretes e cobranças.
          </p>
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-emerald-500" />
          <span>Mensagens</span>
        </button>
      </div>

      {/* Tabs de Filtro — grade 2 colunas mobile, 3 sm, 5 md */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {([
          { id: "atrasados" as TabId, label: "Todos",    sublabel: "Atrasados", count: atrasados.length,           color: "rose"    },
          { id: "ontem" as TabId,     label: "Ontem",    sublabel: "Atrasados", count: atrasadosOntem.length,      color: "orange"  },
          { id: "anteriores" as TabId,label: "Anteriores",sublabel: "+ 2 dias", count: atrasadosAnteriores.length, color: "red"     },
          { id: "hoje" as TabId,      label: "Hoje",     sublabel: "Vencem",    count: hojeLista.length,           color: "amber"   },
          { id: "aVencer" as TabId,   label: "A Vencer", sublabel: "3 dias",    count: aVencer.length,             color: "emerald" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? tab.color === "rose"    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : tab.color === "orange"  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : tab.color === "red"     ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : tab.color === "amber"   ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                :                          "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className={`text-lg font-black leading-none ${
              activeTab === tab.id ? "text-white" :
              tab.color === "rose"   ? "text-rose-500" :
              tab.color === "orange" ? "text-orange-500" :
              tab.color === "red"    ? "text-red-600" :
              tab.color === "amber"  ? "text-amber-500" :
              "text-emerald-600"
            }`}>{tab.count}</span>
            <span className="font-extrabold text-[11px] leading-tight">{tab.label}</span>
            <span className={`text-[9px] leading-tight opacity-70`}>{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {/* GRUPO ATRASADOS */}
      {(activeTab === "atrasados" || activeTab === "ontem" || activeTab === "anteriores") && (
        <div className="space-y-3">
          <div className={`flex items-center justify-between border-b pb-2 ${
            corAtrasados === "orange" ? "border-orange-500/20" :
            corAtrasados === "red"    ? "border-red-500/20" :
            "border-rose-500/20"
          }`}>
            <div className="flex items-center space-x-2">
              <span className={`h-2 w-2 rounded-full animate-pulse ${
                corAtrasados === "orange" ? "bg-orange-500" : corAtrasados === "red" ? "bg-red-600" : "bg-rose-500"
              }`} />
              <h2 className={`text-md font-extrabold ${
                corAtrasados === "orange" ? "text-orange-600" :
                corAtrasados === "red"    ? "text-red-700" :
                "text-rose-600"
              }`}>{tituloAtrasados}</h2>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
              corAtrasados === "orange" ? "bg-orange-50 text-orange-600 border border-orange-200" :
              corAtrasados === "red"    ? "bg-red-50 text-red-600 border border-red-200" :
              "bg-rose-50 text-rose-600 border border-rose-200"
            }`}>
              {formatBRL(listaAtrasados.reduce((acc, p) => acc + p.valor, 0))} ({listaAtrasados.length} parcelas)
            </span>
          </div>

          <div className="premium-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={listaAtrasados.length > 0 && selectedAtrasados.length === listaAtrasados.length}
                  onChange={(e) => toggleSelectAll(listaAtrasados, selectedAtrasados, setSelectedAtrasados, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-rose-500"
                  disabled={listaAtrasados.length === 0}
                />
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {selectedAtrasados.length} de {listaAtrasados.length} selecionados
                </span>
              </div>
              {selectedAtrasados.length > 0 && (
                <button
                  onClick={() => handleMassTrigger(selectedAtrasados, "atrasados")}
                  className="flex items-center justify-center space-x-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Disparo em Massa ({selectedAtrasados.length})</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {listaAtrasados.length === 0 ? (
                <div className="py-10 text-center text-sm font-medium text-slate-500">
                  Nenhuma parcela nesta categoria.
                </div>
              ) : (
                listaAtrasados.map((p) => {
                  const isChecked = selectedAtrasados.includes(p.id);
                  const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(getMessageText(p, "atrasados"))}`;
                  return (
                    <div
                      key={p.id}
                      className={`px-3 py-3 flex items-center gap-3 transition-all duration-150 ${
                        isChecked ? "bg-rose-50/60" : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelectOne(setSelectedAtrasados, p.id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-rose-500 flex-shrink-0"
                      />

                      {/* Info — cresce */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 truncate">{p.emprestimo.cliente.nome}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                            corAtrasados === "orange" ? "bg-orange-50 text-orange-600 border-orange-200" :
                            corAtrasados === "red"    ? "bg-red-50 text-red-600 border-red-200" :
                            "bg-rose-50 text-rose-600 border-rose-200"
                          }`}>Parc. {p.numero}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatData(p.data_vencimento)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{p.emprestimo.cliente.telefone}</span>
                        </div>
                        {p.emprestimo.data_prevista_pagamento && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700">
                              📅 Previsto: {formatData(p.emprestimo.data_prevista_pagamento)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Valor + WhatsApp */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-sm font-black text-slate-900">{formatBRL(p.valor)}</span>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Zap</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. GRUPO: VENCENDO HOJE */}
      {activeTab === "hoje" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <h2 className="text-md font-extrabold text-amber-600">Grupo: Vencendo Hoje</h2>
            </div>
            <span className="bg-amber-50 text-amber-600 border border-amber-200 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              Total: {formatBRL(hojeLista.reduce((acc, p) => acc + p.valor, 0))} ({hojeLista.length} parcelas)
            </span>
          </div>

        <div className="premium-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2.5">
              <input
                type="checkbox"
                checked={hojeLista.length > 0 && selectedHoje.length === hojeLista.length}
                onChange={(e) => toggleSelectAll(hojeLista, selectedHoje, setSelectedHoje, e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                disabled={hojeLista.length === 0}
              />
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {selectedHoje.length} de {hojeLista.length} selecionados
              </span>
            </div>
            {selectedHoje.length > 0 && (
              <button
                onClick={() => handleMassTrigger(selectedHoje, "hoje")}
                className="flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Disparo em Massa ({selectedHoje.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {hojeLista.length === 0 ? (
              <div className="py-10 text-center text-sm font-medium text-slate-500">
                Nenhuma parcela vencendo hoje.
              </div>
            ) : (
              hojeLista.map((p) => {
                const isChecked = selectedHoje.includes(p.id);
                const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(getMessageText(p, "hoje"))}`;
                return (
                  <div
                    key={p.id}
                    className={`px-3 py-3 flex items-center gap-3 transition-all duration-150 ${
                      isChecked ? "bg-amber-50/60" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleSelectOne(setSelectedHoje, p.id, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-amber-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">{p.emprestimo.cliente.nome}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase border bg-amber-50 text-amber-600 border-amber-200">Parc. {p.numero}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatData(p.data_vencimento)}</span>
                        <span className="text-slate-300">·</span>
                        <span>{p.emprestimo.cliente.telefone}</span>
                      </div>
                      {p.emprestimo.data_prevista_pagamento && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700">
                            📅 Previsto: {formatData(p.emprestimo.data_prevista_pagamento)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-black text-slate-900">{formatBRL(p.valor)}</span>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                        <MessageSquare className="w-3 h-3" /><span>Zap</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>)}

      {/* 3. GRUPO: A VENCER */}
      {activeTab === "aVencer" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-md font-extrabold text-emerald-600">Grupo: A Vencer (em até 3 dias)</h2>
            </div>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              Total: {formatBRL(aVencer.reduce((acc, p) => acc + p.valor, 0))} ({aVencer.length} parcelas)
            </span>
          </div>

        <div className="premium-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2.5">
              <input
                type="checkbox"
                checked={aVencer.length > 0 && selectedAVencer.length === aVencer.length}
                onChange={(e) => toggleSelectAll(aVencer, selectedAVencer, setSelectedAVencer, e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                disabled={aVencer.length === 0}
              />
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {selectedAVencer.length} de {aVencer.length} selecionados
              </span>
            </div>
            {selectedAVencer.length > 0 && (
              <button
                onClick={() => handleMassTrigger(selectedAVencer, "aVencer")}
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Disparo em Massa ({selectedAVencer.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {aVencer.length === 0 ? (
              <div className="py-10 text-center text-sm font-medium text-slate-500">
                Nenhuma parcela vencendo nos próximos 3 dias.
              </div>
            ) : (
              aVencer.map((p) => {
                const isChecked = selectedAVencer.includes(p.id);
                const whatsappUrl = `https://wa.me/${p.emprestimo.cliente.telefone}?text=${encodeURIComponent(getMessageText(p, "aVencer"))}`;
                return (
                  <div
                    key={p.id}
                    className={`px-3 py-3 flex items-center gap-3 transition-all duration-150 ${
                      isChecked ? "bg-emerald-50/60" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleSelectOne(setSelectedAVencer, p.id, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-emerald-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">{p.emprestimo.cliente.nome}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase border bg-emerald-50 text-emerald-600 border-emerald-200">Parc. {p.numero}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatData(p.data_vencimento)}</span>
                        <span className="text-slate-300">·</span>
                        <span>{p.emprestimo.cliente.telefone}</span>
                      </div>
                      {p.emprestimo.data_prevista_pagamento && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700">
                            📅 Previsto: {formatData(p.emprestimo.data_prevista_pagamento)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-black text-slate-900">{formatBRL(p.valor)}</span>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                        <MessageSquare className="w-3 h-3" /><span>Zap</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {/* Modal de Simulação de Disparo */}
      {showSimulate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 text-slate-900 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm">Disparo de Lembretes em Massa</h3>
              {!isSimulating && (
                <button
                  type="button"
                  onClick={() => setShowSimulate(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wide">
                <span>Progresso de Envio</span>
                <span>{simulateProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${simulateProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Log visual */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 h-48 overflow-y-auto font-mono text-xs text-slate-700 space-y-1.5 scrollbar-thin">
              {simulateLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => setShowSimulate(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSimulating ? "Processando..." : "Fechar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Mensagens */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveTemplates}
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4 text-slate-900 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm flex items-center space-x-1.5 text-emerald-600">
                <Settings className="w-5 h-5 animate-spin-slow" />
                <span>Configurar Modelos de Cobrança</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-sm overflow-y-auto max-h-[70vh] pr-1">

              {/* Banner Pix Fixo */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                <span className="font-extrabold text-emerald-700 block text-xs uppercase tracking-wider">💳 Rodapé fixo (enviado em todas as mensagens)</span>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  Pix: 14991185521 (Itaú) · Ronivaldo Gabriel Oscar<br />
                  Opção de pagamento em dinheiro pessoalmente<br />
                  Opção de renovação do empréstimo
                </p>
              </div>

              {/* Grupo Parcelado */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 px-2">Empréstimos Parcelados</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">Atrasado / Vencido</label>
                  <textarea value={msgAtrasados} onChange={(e) => setMsgAtrasados(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">Vencendo Hoje</label>
                  <textarea value={msgHoje} onChange={(e) => setMsgHoje(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">A Vencer (Lembrete)</label>
                  <textarea value={msgAVencer} onChange={(e) => setMsgAVencer(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Grupo À Vista */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 px-2">Empréstimos À Vista</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">Atrasado / Vencido</label>
                  <textarea value={msgAtrasadosAvista} onChange={(e) => setMsgAtrasadosAvista(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">Vencendo Hoje</label>
                  <textarea value={msgHojeAvista} onChange={(e) => setMsgHojeAvista(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 text-xs uppercase">A Vencer (Lembrete)</label>
                  <textarea value={msgAVencerAvista} onChange={(e) => setMsgAVencerAvista(e.target.value)} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium transition-all text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Variáveis */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="font-extrabold block uppercase tracking-wider text-xs text-slate-500">Variáveis disponíveis</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <span className="text-slate-700"><strong>{`{nome}`}</strong> — Primeiro nome</span>
                  <span className="text-slate-700"><strong>{`{valor}`}</strong> — Valor da parcela</span>
                  <span className="text-slate-700"><strong>{`{data}`}</strong> — Data de vencimento</span>
                  <span className="text-slate-700"><strong>{`{num}`}</strong> — Nº da parcela (parcelados)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
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
