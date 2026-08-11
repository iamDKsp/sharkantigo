"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useUrlState } from "@/hooks/useUrlState";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import Link from "next/link";
import { Search, Calendar, MessageCircle, ArrowUpDown, ArrowDownUp, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Send, Settings, Plus, Trash2, Loader2, ChevronDown, RefreshCw } from "lucide-react";
import { receberSoJurosEmprestimo } from "@/app/emprestimos/[id]/actions";
import { hojeEmBrasilia } from "@/lib/dateUtils";

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
  initialFiltro?:   string;
  initialSearch?:   string;
  initialParceiro?: string;
  initialSort?:     string;
  initialPagina?:   number;
}

type StatusFilter = "todos" | "ativos" | "atrasados" | "ontem" | "quitados" | "hoje";
type SortOption = "padrao" | "maior_valor" | "menor_valor" | "mais_proximo" | "mais_distante";

const sortLabels: Record<SortOption, string> = {
  padrao: "Padrão",
  maior_valor: "Maior Valor",
  menor_valor: "Menor Valor",
  mais_proximo: "Vence Antes",
  mais_distante: "Vence Depois",
};

function resolveStatus(filtro: string): StatusFilter {
  if (filtro === "hoje")      return "hoje";
  if (filtro === "ontem")     return "ontem";
  if (filtro === "atrasados") return "atrasados";
  if (filtro === "quitados")  return "quitados";
  if (filtro === "todos")     return "todos";
  return "ativos";
}

export default function EmprestimosListWrapper({
  initialEmprestimos,
  initialFiltro   = "ativos",
  initialSearch   = "",
  initialParceiro = "todos",
  initialSort     = "padrao",
  initialPagina   = 1,
}: EmprestimosListWrapperProps) {
  // ── Scroll restoration ──
  useScrollRestoration("emprestimos-list");

  // ── Estado persistido na URL ──
  const [search, setSearch]               = useUrlState("q",       initialSearch,   "");
  const [statusFilter, setStatusFilter]   = useUrlState<StatusFilter>("status", resolveStatus(initialFiltro), "ativos");
  const [parceiroFilter, setParceiroFilter] = useUrlState("parceiro", initialParceiro, "todos");
  const [sortOption, setSortOption]       = useUrlState<SortOption>("sort", initialSort as SortOption, "padrao");
  const [currentPage, setCurrentPage]     = useUrlState("pagina",  String(initialPagina), "1");

  // Helper para mudar filtros e resetar página
  const setStatusAndReset   = (v: StatusFilter) => { setStatusFilter(v);   setCurrentPage("1"); };
  const setParceiroAndReset = (v: string)       => { setParceiroFilter(v); setCurrentPage("1"); };
  const setSortAndReset     = (v: SortOption)   => { setSortOption(v);     setCurrentPage("1"); };
  const setSearchAndReset   = (v: string)       => { setSearch(v);         setCurrentPage("1"); };

  const currentPageNum = parseInt(currentPage, 10) || 1;
  const ITEMS_PER_PAGE = 10;

  // sortOpen é estado local (não persiste na URL)
  const [sortOpen, setSortOpen] = useState(false);

  // Renovação rápida
  const [renewModalEmp, setRenewModalEmp] = useState<any>(null);
  const [isRenewing, setIsRenewing]       = useState(false);
  const [renewError, setRenewError]       = useState<string | null>(null);
  const [isPendingRenew, startRenewTransition] = useTransition();

  const openRenewModal = (e: React.MouseEvent, emp: any) => {
    e.preventDefault();
    e.stopPropagation();
    setRenewError(null);
    setRenewModalEmp(emp);
  };

  const confirmRenew = () => {
    if (!renewModalEmp) return;
    setIsRenewing(true);
    setRenewError(null);
    startRenewTransition(async () => {
      try {
        await receberSoJurosEmprestimo(renewModalEmp.id);
        setRenewModalEmp(null);
      } catch (err: any) {
        setRenewError(err.message || "Erro ao renovar o empréstimo.");
      } finally {
        setIsRenewing(false);
      }
    });
  };

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
    // O currentPage já é resetado pelos helpers setXxxAndReset
    // Este effect é mantido como safeguard para mudanças externas
  }, []);

  const parceirosList = useMemo(() => {
    const map = new Map<string, string>();
    initialEmprestimos.forEach(emp => {
      if (emp.parceiro) {
        map.set(emp.parceiro.id, emp.parceiro.nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [initialEmprestimos]);

  const hojeUTC = useMemo(() => hojeEmBrasilia(), []);

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

      let temAtrasadaOntem = false;
      const ontemUTC = new Date(hojeUTC);
      ontemUTC.setUTCDate(hojeUTC.getUTCDate() - 1);

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
          temAtrasadaOntem = emp.parcelas.some((p: any) => {
            if (p.status !== "aberto") return false;
            const vObj = new Date(p.data_vencimento);
            const vUTC = new Date(Date.UTC(vObj.getUTCFullYear(), vObj.getUTCMonth(), vObj.getUTCDate()));
            return vUTC.getTime() === ontemUTC.getTime();
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
        estaAtrasadoOntem: temAtrasadaOntem,
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
      if (statusFilter === "ontem" && !emp.estaAtrasadoOntem) return false;
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
    (currentPageNum - 1) * ITEMS_PER_PAGE,
    currentPageNum * ITEMS_PER_PAGE
  );

  // Contadores por categoria (usados nos badges das tabs)
  const contadores = useMemo(() => ({
    todos:     emprestimosProcessados.length,
    ativos:    emprestimosProcessados.filter(e => e.statusReal === "ativo" && !e.estaAtrasado).length,
    atrasados: emprestimosProcessados.filter(e => e.estaAtrasado).length,
    ontem:     emprestimosProcessados.filter(e => e.estaAtrasadoOntem).length,
    hoje:      emprestimosProcessados.filter(e => e.venceHoje).length,
    quitados:  emprestimosProcessados.filter(e => e.statusReal === "quitado").length,
  }), [emprestimosProcessados]);

  return (
    <div className="space-y-4">
      {/* Busca + Ordenação */}
      <div className="flex items-center gap-3">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearchAndReset(e.target.value)}
            placeholder="Buscar por cliente, telefone ou cidade..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 shadow-sm"
          />
        </div>

        {/* Dropdown Combinado de Ordenação e Parceiros */}
        <div className="relative self-start flex-shrink-0">
          <button
            onClick={() => { setSortOpen((prev) => !prev); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-emerald-400 transition-all shadow-sm cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-emerald-500" />
            <span>
              {parceiroFilter !== "todos"
                ? (parceiroFilter === "sem_parceiro" ? "Sem Parceiro" : parceirosList.find(p => p.id === parceiroFilter)?.nome || "Parceiro")
                : sortLabels[sortOption]}
            </span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
              {/* Seção de Ordenação */}
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50">
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
                    onClick={() => { setSortAndReset(key as SortOption); setSortOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors text-left cursor-pointer ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={isActive ? "text-emerald-500" : "text-slate-400"}>
                      {icons[key as SortOption]}
                    </span>
                    {label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                  </button>
                );
              })}

              {/* Seção de Parceiros */}
              <div className="px-4 py-2 mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-t border-slate-100">
                Parceiros
              </div>
              <button
                onClick={() => { setParceiroAndReset("todos"); setSortOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors text-left cursor-pointer ${
                  parceiroFilter === "todos"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos os Parceiros
                {parceiroFilter === "todos" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              </button>
              <button
                onClick={() => { setParceiroAndReset("sem_parceiro"); setSortOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors text-left cursor-pointer ${
                  parceiroFilter === "sem_parceiro"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
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
                    onClick={() => { setParceiroAndReset(p.id); setSortOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors text-left cursor-pointer ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
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

      {/* Filtros de Status — grade 3 colunas mobile, 6 em sm+ */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([
          { id: "todos"     as StatusFilter, label: "Todos",      sublabel: "Empréstimos",  color: "slate"   },
          { id: "ativos"    as StatusFilter, label: "Ativos",     sublabel: "Em dia",        color: "emerald" },
          { id: "atrasados" as StatusFilter, label: "Atrasados",  sublabel: "Todos",          color: "rose"    },
          { id: "ontem"     as StatusFilter, label: "Ontem",      sublabel: "Atrasados",     color: "orange"  },
          { id: "hoje"      as StatusFilter, label: "Hoje",       sublabel: "Vencem",         color: "amber"   },
          { id: "quitados"  as StatusFilter, label: "Quitados",   sublabel: "Pagos",          color: "blue"    },
        ] as const).map((tab) => {
          const isSelected = statusFilter === tab.id;
          const count = contadores[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setStatusAndReset(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? tab.color === "emerald" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : tab.color === "rose"    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : tab.color === "orange"  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : tab.color === "amber"   ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : tab.color === "blue"    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-700 text-white shadow-lg"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className={`text-lg font-black leading-none ${
                isSelected ? "text-white" :
                tab.color === "emerald" ? "text-emerald-600" :
                tab.color === "rose"    ? "text-rose-500" :
                tab.color === "orange"  ? "text-orange-500" :
                tab.color === "amber"   ? "text-amber-500" :
                tab.color === "blue"    ? "text-blue-500" :
                "text-slate-600"
              }`}>{count}</span>
              <span className="font-extrabold text-[11px] leading-tight uppercase tracking-wide">{tab.label}</span>
              <span className="text-[9px] leading-tight opacity-60">{tab.sublabel}</span>
            </button>
          );
        })}
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          {emprestimosFiltrados.length} empréstimo{emprestimosFiltrados.length !== 1 ? "s" : ""}
          {sortOption !== "padrao" && (
            <span className="ml-3 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
              Ordenado: {sortLabels[sortOption]}
            </span>
          )}
        </div>
        
        {/* Top Pagination info */}
        {totalPages > 1 && (
          <div className="text-xs text-slate-400 font-bold">
            Pág <span className="text-slate-700">{currentPageNum}</span> de {totalPages}
          </div>
        )}
      </div>

      {/* Lista de Cards Modernos */}
      <div className="space-y-3">
        {paginatedEmprestimos.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
            Nenhum empréstimo encontrado nesta visualização.
          </div>
        ) : (
          paginatedEmprestimos.map((emp) => {
            const isQuitado = emp.statusReal === "quitado";
            const isAtrasado = emp.estaAtrasado;
            const isVencendo = emp.venceHoje || emp.venceEmBreve;
            
            // Accent colors for the card
            let accentColor = "bg-emerald-500";
            let borderColor = "border-slate-200";
            let bgClass = "bg-white";
            let textColor = "text-emerald-600";
            
            if (isQuitado) {
              accentColor = "bg-slate-300";
              bgClass = "bg-slate-50/50";
              textColor = "text-slate-500";
            } else if (isAtrasado) {
              accentColor = "bg-rose-500";
              borderColor = "border-rose-200";
              bgClass = "bg-white";
              textColor = "text-rose-600";
            } else if (isVencendo) {
              accentColor = "bg-amber-500";
              borderColor = "border-amber-200";
              bgClass = "bg-amber-50/30";
              textColor = "text-amber-600";
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
                    <span className="text-sm font-black text-slate-900 tracking-tight">{emp.cliente.nome}</span>
                    {isQuitado ? (
                      <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Quitado
                      </span>
                    ) : isAtrasado ? (
                      <span className="flex items-center gap-1 bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Atrasado
                      </span>
                    ) : isVencendo ? (
                      <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {emp.venceHoje ? "Vence Hoje" : "A Vencer"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Em dia
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      Vence em {formatData(emp.data_vencimento)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      Juros: <span className="text-slate-700">{Number(emp.taxa_juros)}%</span>
                    </span>
                    {Number(emp.taxa_multa) > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Multa: <span className="text-slate-700">{Number(emp.taxa_multa)}%</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      Investido: <span className="text-slate-700">{formatBRL(emp.principal)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 mt-2 md:mt-0 z-10 pl-2 md:pl-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                  <div className="text-left md:text-right pointer-events-none flex-1">
                    <div className="text-sm font-black text-slate-900 flex items-center md:justify-end gap-2">
                      <span className={textColor}>{formatBRL(emp.totalEstimado)}</span>
                    </div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mt-0.5">
                      Total Estimado
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-2">
                    {/* Botão de Renovação Rápida */}
                    {!isQuitado && (
                      <button
                        onClick={(e) => openRenewModal(e, emp)}
                        title="Renovar empréstimo (+30 dias)"
                        className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm shrink-0 group-hover:scale-105 active:scale-90 z-20 cursor-pointer"
                      >
                        <RefreshCw className="w-5 h-5 pointer-events-none" />
                      </button>
                    )}

                    {/* Botão de WhatsApp */}
                    <button
                      onClick={(e) => { e.preventDefault(); openWaModal(emp); }}
                      className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm shrink-0 group-hover:scale-105 active:scale-90 z-20 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 pointer-events-none" />
                    </button>
                  </div>
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
            onClick={() => setCurrentPage(String(Math.max(1, currentPageNum - 1)))}
            disabled={currentPageNum === 1}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = currentPageNum === page;
              
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPageNum - 1 && page <= currentPageNum + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(String(page))}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-110" 
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              }
              
              if (
                (page === currentPageNum - 2 && page > 1) || 
                (page === currentPageNum + 2 && page < totalPages)
              ) {
                return <span key={page} className="px-1 text-slate-400">...</span>;
              }
              
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(String(Math.min(totalPages, currentPageNum + 1)))}
            disabled={currentPageNum === totalPages}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Fechar dropdown ao clicar fora */}
      {sortOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setSortOpen(false); }} />
      )}
      
      {/* Modal de Confirmação de Renovação */}
      {renewModalEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Renovar Empréstimo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Receber juros e prorrogar +30 dias</p>
                </div>
              </div>
              <button
                onClick={() => { setRenewModalEmp(null); setRenewError(null); }}
                disabled={isRenewing}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Tem certeza que deseja renovar o empréstimo de{" "}
                <span className="font-black text-slate-900">{renewModalEmp.cliente.nome}</span>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-amber-700 font-semibold">Juros recebidos agora</span>
                  <span className="font-black text-amber-800">
                    {formatBRL(Number(renewModalEmp.valor_emprestado) * (Number(renewModalEmp.taxa_juros) / 100))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Novo vencimento</span>
                  <span className="font-black text-slate-800">+30 dias</span>
                </div>
              </div>

              {renewError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-medium">{renewError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => { setRenewModalEmp(null); setRenewError(null); }}
                disabled={isRenewing}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRenew}
                disabled={isRenewing || isPendingRenew}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {(isRenewing || isPendingRenew) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {(isRenewing || isPendingRenew) ? "Renovando..." : "Sim, Renovar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {waModalOpen && waSelectedEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  Enviar Mensagem
                </h3>
                <p className="text-xs text-slate-500 mt-1">Para {waSelectedEmp.cliente.nome}</p>
              </div>
              <button onClick={() => setWaModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Respostas Rápidas</label>
                  <button onClick={() => setWaConfigMode(!waConfigMode)} className="text-xs flex items-center gap-1 font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer">
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
                      <Plus className="w-4 h-4" /> Adicionar Nova Mensagem
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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