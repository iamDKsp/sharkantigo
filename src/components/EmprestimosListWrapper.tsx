"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Calendar, MessageCircle, ArrowUpDown, ArrowDownUp, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Send, Settings, Plus, Trash2, Loader2, ChevronDown } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
}

interface Parcela {
  id: string;
  numero: number;
  valor: number;
  data_vencimento: Date;
  status: string;
}

interface Emprestimo {
  id: string;
  valor_emprestado: any;
  taxa_juros: any;
  taxa_multa: any;
  data_vencimento: Date;
  status: string;
  tipo_pagamento: string;
  frequencia: string;
  categoria: string;
  cliente: Cliente;
  parcelas: Parcela[];
  parceiro_id?: string | null;
  parceiro?: { id: string; nome: string } | null;
}

interface EmprestimosListWrapperProps {
  initialEmprestimos: any[];
  initialFiltro?: string;
}

type StatusFilter = "todos" | "ativos" | "atrasados" | "quitados" | "hoje";
type SortOption = "padrao" | "maior_valor" | "menor_valor" | "mais_proximo" | "mais_distante";

const sortLabels: Record<SortOption, string> = {
  padrao: "Padrão",
  maior_valor: "Maior Valor",
  menor_valor: "Menor Valor",
  mais_proximo: "Vence Antes",
  mais_distante: "Vence Depois",
};

export default function EmprestimosListWrapper({ initialEmprestimos, initialFiltro }: EmprestimosListWrapperProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialFiltro === "hoje" ? "hoje" : "ativos"
  );
  const [parceiroFilter, setParceiroFilter] = useState<string>("todos");
  const [sortOption, setSortOption] = useState<SortOption>("padrao");
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // WhatsApp Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waSelectedEmp, setWaSelectedEmp] = useState<any>(null);
  const [waCustomMsg, setWaCustomMsg] = useState("");
  const [waConfigMode, setWaConfigMode] = useState(false);
  const [isWaSending, setIsWaSending] = useState(false);
  const [waTemplates, setWaTemplates] = useState<string[]>([
    "Olá, tudo bem? Lembrando que seu empréstimo vence em breve.",
    "Olá, sua parcela vence hoje. Qualquer dúvida estou à disposição!",
    "Olá, notamos um pequeno atraso. Como podemos ajudar?",
    "Olá, seu empréstimo já consta como quitado. Muito obrigado!"
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("sol_wa_templates");
    if (saved) {
      try {
        setWaTemplates(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const openWaModal = (emp: any) => {
    setWaSelectedEmp(emp);
    setWaCustomMsg("");
    setWaModalOpen(true);
  };

  const sendWaMsg = async (text: string) => {
    if (!waSelectedEmp || !text.trim()) return;
    setIsWaSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ phone: waSelectedEmp.cliente.telefone, text }]
        })
      });

      if (res.ok) {
        setWaModalOpen(false);
        alert("Mensagem enviada com sucesso!");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Falha ao enviar: ${errData.error || "Erro desconhecido"}`);
      }
    } catch (err) {
      alert("Falha de conexão. O serviço do WhatsApp está rodando?");
    } finally {
      setIsWaSending(false);
    }
  };

  const handleUpdateTemplate = (index: number, newText: string) => {
    const newT = [...waTemplates];
    newT[index] = newText;
    setWaTemplates(newT);
    localStorage.setItem("sol_wa_templates", JSON.stringify(newT));
  };

  const handleAddTemplate = () => {
    const newT = [...waTemplates, "Nova mensagem rápida..."];
    setWaTemplates(newT);
    localStorage.setItem("sol_wa_templates", JSON.stringify(newT));
  };

  const handleRemoveTemplate = (index: number) => {
    const newT = waTemplates.filter((_, i) => i !== index);
    setWaTemplates(newT);
    localStorage.setItem("sol_wa_templates", JSON.stringify(newT));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortOption, parceiroFilter]);

  const parceirosList = useMemo(() => {
    const map = new Map<string, string>();
    initialEmprestimos.forEach(emp => {
      if (emp.parceiro) {
        map.set(emp.parceiro.id, emp.parceiro.nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [initialEmprestimos]);

  const hojeUTC = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }, []);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatData = (date: any) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));

  // Processar empréstimos com status reais e totais
  const emprestimosProcessados = useMemo(() => {
    return initialEmprestimos.map((emp) => {
      const principal = Number(emp.valor_emprestado);

      const totalEstimado =
        emp.parcelas && emp.parcelas.length > 0
          ? emp.parcelas.reduce((acc: number, p: any) => acc + Number(p.valor), 0)
          : principal * (1 + Number(emp.taxa_juros) / 100);

      const vencFinalObj = new Date(emp.data_vencimento);
      const dataVencimentoObjUTC = new Date(
        Date.UTC(vencFinalObj.getUTCFullYear(), vencFinalObj.getUTCMonth(), vencFinalObj.getUTCDate())
      );

      let statusReal = emp.status;
      let temAtrasada = false;
      let venceHoje = false;

      if (emp.parcelas && emp.parcelas.length > 0) {
        const todasPagas = emp.parcelas.every((p: any) => p.status.startsWith("pago"));
        if (todasPagas) {
          statusReal = "quitado";
        } else {
          statusReal = "ativo";
          temAtrasada = emp.parcelas.some((p: any) => {
            if (p.status !== "aberto") return false;
            const vObj = new Date(p.data_vencimento);
            const vUTC = new Date(Date.UTC(vObj.getUTCFullYear(), vObj.getUTCMonth(), vObj.getUTCDate()));
            return vUTC < hojeUTC;
          });
          venceHoje = emp.parcelas.some((p: any) => {
            if (p.status !== "aberto") return false;
            const vObj = new Date(p.data_vencimento);
            const vUTC = new Date(Date.UTC(vObj.getUTCFullYear(), vObj.getUTCMonth(), vObj.getUTCDate()));
            return vUTC.getTime() === hojeUTC.getTime();
          });
        }
      } else {
        if (emp.status === "ativo") {
          if (dataVencimentoObjUTC < hojeUTC) temAtrasada = true;
          else if (dataVencimentoObjUTC.getTime() === hojeUTC.getTime()) venceHoje = true;
        }
      }

      // Próxima parcela aberta
      let proxVencimentoUTC: Date | null = null;
      if (emp.parcelas && emp.parcelas.length > 0) {
        const abertas = emp.parcelas
          .filter((p: any) => p.status === "aberto")
          .map((p: any) => {
            const vObj = new Date(p.data_vencimento);
            return new Date(Date.UTC(vObj.getUTCFullYear(), vObj.getUTCMonth(), vObj.getUTCDate()));
          })
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        proxVencimentoUTC = abertas[0] || dataVencimentoObjUTC;
      } else {
        proxVencimentoUTC = dataVencimentoObjUTC;
      }

      let venceEmBreve = false;
      if (proxVencimentoUTC) {
        const diffTime = proxVencimentoUTC.getTime() - hojeUTC.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          venceEmBreve = true;
        }
      }

      return {
        ...emp,
        principal,
        totalEstimado,
        statusReal,
        estaAtrasado: temAtrasada,
        venceHoje,
        venceEmBreve,
        proxVencimentoUTC,
        dataVencimentoObjUTC,
      };
    });
  }, [initialEmprestimos, hojeUTC]);

  // Filtrar + Ordenar
  const emprestimosFiltrados = useMemo(() => {
    let lista = emprestimosProcessados.filter((emp) => {
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const query = norm(search.trim());
      const bateTexto =
        !query ||
        norm(emp.cliente.nome).includes(query) ||
        emp.cliente.telefone.includes(query) ||
        norm(emp.cliente.cidade).includes(query);

      if (!bateTexto) return false;

      if (statusFilter === "ativos" && (emp.statusReal !== "ativo" || emp.estaAtrasado)) return false;
      if (statusFilter === "atrasados" && !emp.estaAtrasado) return false;
      if (statusFilter === "quitados" && emp.statusReal !== "quitado") return false;
      if (statusFilter === "hoje" && !emp.venceHoje) return false;

      if (parceiroFilter !== "todos") {
        if (parceiroFilter === "sem_parceiro") {
          if (emp.parceiro_id) return false;
        } else {
          if (emp.parceiro_id !== parceiroFilter) return false;
        }
      }

      return true;
    });

    // Ordenação
    switch (sortOption) {
      case "maior_valor":
        lista = [...lista].sort((a, b) => b.totalEstimado - a.totalEstimado);
        break;
      case "menor_valor":
        lista = [...lista].sort((a, b) => a.totalEstimado - b.totalEstimado);
        break;
      case "mais_proximo":
        lista = [...lista].sort((a, b) => {
          const ta = a.proxVencimentoUTC?.getTime() ?? Infinity;
          const tb = b.proxVencimentoUTC?.getTime() ?? Infinity;
          return ta - tb;
        });
        break;
      case "mais_distante":
        lista = [...lista].sort((a, b) => {
          const ta = a.proxVencimentoUTC?.getTime() ?? 0;
          const tb = b.proxVencimentoUTC?.getTime() ?? 0;
          return tb - ta;
        });
        break;
      default:
        break;
    }

    return lista;
  }, [emprestimosProcessados, search, statusFilter, sortOption, parceiroFilter]);

  const totalPages = Math.max(1, Math.ceil(emprestimosFiltrados.length / ITEMS_PER_PAGE));
  const paginatedEmprestimos = emprestimosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-5">
      {/* Busca, Filtros de Status e Ordenação */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, telefone ou cidade..."
            className="w-full bg-white dark:bg-[#13221b] border border-slate-200 dark:border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-slate-900 dark:text-white shadow-sm"
          />
        </div>

        {/* Abas de Status */}
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-[#13221b] p-1 rounded-2xl self-start shadow-sm border border-slate-200 dark:border-emerald-950/50">
          {(["todos", "ativos", "atrasados", "quitados"] as const).map((tab) => {
            const isSelected = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                  isSelected
                    ? "bg-white dark:bg-emerald-800 text-emerald-900 dark:text-white shadow-md scale-[1.02]"
                    : "text-slate-500 dark:text-emerald-500/70 hover:text-slate-900 hover:bg-slate-200/50 dark:hover:bg-emerald-900/30"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Dropdown Combinado de Ordenação e Parceiros */}
        <div className="relative self-start flex-shrink-0">
          <button
            onClick={() => { setSortOpen((prev) => !prev); }}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-[#13221b] border border-slate-200 dark:border-emerald-950 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-600 dark:text-emerald-300 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-sm"
          >
            <ArrowUpDown className="w-4 h-4 text-emerald-500" />
            <span>
              {parceiroFilter !== "todos"
                ? (parceiroFilter === "sem_parceiro" ? "Sem Parceiro" : parceirosList.find(p => p.id === parceiroFilter)?.nome || "Parceiro")
                : sortLabels[sortOption]}
            </span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0f1c14] border border-slate-200 dark:border-emerald-950 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
              {/* Seção de Ordenação */}
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-emerald-950/20">
                Ordenação
              </div>
              {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => {
                const icons: Record<SortOption, React.ReactNode> = {
                  padrao: <ArrowUpDown className="w-4 h-4" />,
                  maior_valor: <ArrowDownUp className="w-4 h-4" />,
                  menor_valor: <ArrowUpDown className="w-4 h-4" />,
                  mais_proximo: <Clock className="w-4 h-4" />,
                  mais_distante: <Calendar className="w-4 h-4" />,
                };
                const isActive = sortOption === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setSortOption(key as SortOption); setSortOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-black uppercase tracking-wider transition-colors text-left ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-emerald-950/20"
                    }`}
                  >
                    <span className={isActive ? "text-emerald-500" : "text-slate-400 dark:text-zinc-600"}>
                      {icons[key as SortOption]}
                    </span>
                    {label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                  </button>
                );
              })}

              {/* Seção de Parceiros */}
              <div className="px-4 py-2 mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-emerald-950/20 border-t border-slate-100 dark:border-emerald-900/30">
                Parceiros
              </div>
              <button
                onClick={() => { setParceiroFilter("todos"); setSortOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-black uppercase tracking-wider transition-colors text-left ${
                  parceiroFilter === "todos"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-emerald-950/20"
                }`}
              >
                Todos os Parceiros
                {parceiroFilter === "todos" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              </button>
              <button
                onClick={() => { setParceiroFilter("sem_parceiro"); setSortOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-black uppercase tracking-wider transition-colors text-left ${
                  parceiroFilter === "sem_parceiro"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-emerald-950/20"
                }`}
              >
                Sem Parceiro
                {parceiroFilter === "sem_parceiro" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              </button>
              {parceirosList.map(p => {
                const isActive = parceiroFilter === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setParceiroFilter(p.id); setSortOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-black uppercase tracking-wider transition-colors text-left ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-emerald-950/20"
                    }`}
                  >
                    {p.nome}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-slate-400 dark:text-emerald-500/60 font-bold uppercase tracking-wider">
          {emprestimosFiltrados.length} empréstimo{emprestimosFiltrados.length !== 1 ? "s" : ""}
          {sortOption !== "padrao" && (
            <span className="ml-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md">
              Ordenado: {sortLabels[sortOption]}
            </span>
          )}
        </div>
        
        {/* Top Pagination info */}
        {totalPages > 1 && (
          <div className="text-sm text-slate-400 font-bold">
            Pág <span className="text-slate-700 dark:text-white">{currentPage}</span> de {totalPages}
          </div>
        )}
      </div>

      {/* Lista de Cards Modernos */}
      <div className="space-y-3">
        {paginatedEmprestimos.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-emerald-400/60 bg-white dark:bg-[#13221b] rounded-3xl border border-slate-200 dark:border-emerald-950 border-dashed">
            Nenhum empréstimo encontrado nesta visualização.
          </div>
        ) : (
          paginatedEmprestimos.map((emp) => {
            const isQuitado = emp.statusReal === "quitado";
            const isAtrasado = emp.estaAtrasado;
            const isVencendo = emp.venceHoje || emp.venceEmBreve;
            
            // Accent colors for the card
            let accentColor = "bg-emerald-500";
            let borderColor = "border-zinc-200 dark:border-emerald-950";
            let bgClass = "bg-white dark:bg-[#13221b]";
            let textColor = "text-emerald-600 dark:text-emerald-400";
            
            if (isQuitado) {
              accentColor = "bg-zinc-300 dark:bg-zinc-700";
              bgClass = "bg-zinc-50/50 dark:bg-[#0f1c14]";
              textColor = "text-zinc-500";
            } else if (isAtrasado) {
              accentColor = "bg-rose-500";
              borderColor = "border-rose-200 dark:border-rose-900/50";
              bgClass = "bg-white dark:bg-rose-950/10";
              textColor = "text-rose-600 dark:text-rose-400";
            } else if (isVencendo) {
              accentColor = "bg-amber-500";
              borderColor = "border-amber-200 dark:border-amber-900/50";
              bgClass = "bg-amber-50/30 dark:bg-amber-950/10";
              textColor = "text-amber-600 dark:text-amber-400";
            }

            return (
              <div
                key={emp.id}
                className={`group relative overflow-hidden rounded-2xl border ${borderColor} ${bgClass} p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 active:scale-[0.98] cursor-pointer`}
              >
                {/* Accent Line Left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

                <Link href={`/emprestimos/${emp.id}`} className="absolute inset-0 z-0" />

                <div className="space-y-2 z-10 pointer-events-none pl-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{emp.cliente.nome}</span>
                    {isQuitado ? (
                      <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Quitado
                      </span>
                    ) : isAtrasado ? (
                      <span className="flex items-center gap-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-sm font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Atrasado
                      </span>
                    ) : isVencendo ? (
                      <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-sm font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {emp.venceHoje ? "Vence Hoje" : "A Vencer"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-sm font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Em dia
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500 dark:text-emerald-500/70">
                    <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg text-slate-700 dark:text-emerald-300">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      Vence em {formatData(emp.data_vencimento)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-emerald-800" />
                      Juros: <span className="text-slate-700 dark:text-emerald-300">{Number(emp.taxa_juros)}%</span>
                    </span>
                    {Number(emp.taxa_multa) > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-emerald-800" />
                        Multa: <span className="text-slate-700 dark:text-emerald-300">{Number(emp.taxa_multa)}%</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-emerald-800" />
                      Investido: <span className="text-slate-700 dark:text-emerald-300">{formatBRL(emp.principal)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 mt-2 md:mt-0 z-10 pl-2 md:pl-0 border-t md:border-t-0 border-slate-100 dark:border-emerald-900/30 pt-4 md:pt-0">
                  <div className="text-left md:text-right pointer-events-none flex-1">
                    <div className="text-sm font-black text-slate-900 dark:text-white flex items-center md:justify-end gap-2">
                      <span className={textColor}>{formatBRL(emp.totalEstimado)}</span>
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-emerald-500/60 mt-0.5">
                      Total Estimado
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.preventDefault(); openWaModal(emp); }}
                    className="p-3 bg-slate-100 dark:bg-[#0f1c14] text-slate-400 dark:text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-all shadow-sm shrink-0 group-hover:scale-105 active:scale-90 z-20"
                  >
                    <MessageCircle className="w-5 h-5 pointer-events-none" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-slate-200 dark:border-emerald-900/50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-emerald-900/30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = currentPage === page;
              
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center ${
                      isCurrent 
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-110" 
                        : "text-slate-500 hover:bg-slate-100 dark:text-emerald-500/70 dark:hover:bg-emerald-900/30"
                    }`}
                  >
                    {page}
                  </button>
                );
              }
              
              if (
                (page === currentPage - 2 && page > 1) || 
                (page === currentPage + 2 && page < totalPages)
              ) {
                return <span key={page} className="px-1 text-slate-400">...</span>;
              }
              
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl border border-slate-200 dark:border-emerald-900/50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-emerald-900/30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Fechar dropdown ao clicar fora */}
      {sortOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setSortOpen(false); }} />
      )}
      
      {/* WhatsApp Modal */}
      {waModalOpen && waSelectedEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#13221b] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-emerald-900/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-emerald-900/30 flex justify-between items-center bg-slate-50 dark:bg-emerald-950/20">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  Enviar Mensagem
                </h3>
                <p className="text-sm text-slate-500 dark:text-emerald-500/70 mt-1">Para {waSelectedEmp.cliente.nome}</p>
              </div>
              <button onClick={() => setWaModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-emerald-900/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-500 dark:text-emerald-500/70 uppercase tracking-wider block">Respostas Rápidas</label>
                  <button onClick={() => setWaConfigMode(!waConfigMode)} className="text-sm flex items-center gap-1 font-bold text-slate-400 hover:text-emerald-500 transition-colors">
                    <Settings className="w-3.5 h-3.5" /> {waConfigMode ? "Concluir" : "Configurar"}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {waTemplates.map((msg, i) => (
                    waConfigMode ? (
                      <div key={i} className="flex gap-2 items-start">
                        <textarea 
                          value={msg}
                          onChange={(e) => handleUpdateTemplate(i, e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-[#0b130e] border border-slate-300 dark:border-emerald-900/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white resize-none h-[60px]"
                        />
                        <button onClick={() => handleRemoveTemplate(i)} className="p-2 mt-2 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button key={i} onClick={() => sendWaMsg(msg)} disabled={isWaSending} className="text-left p-3 rounded-xl bg-slate-50 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-900/50 text-sm text-slate-600 dark:text-emerald-100 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {msg}
                      </button>
                    )
                  ))}
                  {waConfigMode && (
                    <button onClick={handleAddTemplate} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-emerald-900/80 text-sm font-semibold text-slate-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors mt-1">
                      <Plus className="w-4 h-4" /> Adicionar Nova Mensagem
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-500 dark:text-emerald-500/70 uppercase tracking-wider mb-2 block">Mensagem Personalizada</label>
                <textarea 
                  value={waCustomMsg}
                  onChange={(e) => setWaCustomMsg(e.target.value)}
                  placeholder="Digite sua mensagem livre aqui..."
                  className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white min-h-[100px] resize-y"
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 dark:border-emerald-900/30 bg-slate-50 dark:bg-[#0f1c14] flex justify-end">
              <button 
                onClick={() => sendWaMsg(waCustomMsg)}
                disabled={!waCustomMsg.trim() || isWaSending}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWaSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isWaSending ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}