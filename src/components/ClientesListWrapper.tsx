"use client";

import { useEffect, useState, useRef } from "react";
import { useUrlState } from "@/hooks/useUrlState";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import Link from "next/link";
import { Plus, Search, MessageCircle, Loader2, X, Send, Settings, Trash2 } from "lucide-react";
import { enviarMensagemManual, listarRespostasRapidas } from "@/app/mensagens/actions";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  documento: string;
  foto_url: string | null;
}

export default function ClientesListWrapper({ initialQuery = "" }: { initialQuery?: string }) {
  useScrollRestoration("clientes-list");

  const [query, setQuery] = useUrlState("q", initialQuery, "");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // AbortController para cancelar requests de busca obsoletos (evita race condition)
  const abortControllerRef = useRef<AbortController | null>(null);

  // WhatsApp Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalClosing, setWaModalClosing] = useState(false);
  const [waSelectedCliente, setWaSelectedCliente] = useState<Cliente | null>(null);
  const [waCustomMsg, setWaCustomMsg] = useState("");
  const [isWaSending, setIsWaSending] = useState(false);
  // Lista única de respostas rápidas, salva no banco (edição em /configuracoes/mensagens)
  const [waTemplates, setWaTemplates] = useState<string[]>([]);

  useEffect(() => {
    listarRespostasRapidas().then(setWaTemplates).catch(() => {});
  }, []);

  const openWaModal = (cliente: Cliente) => {
    setWaSelectedCliente(cliente);
    setWaCustomMsg("");
    setWaModalClosing(false);
    setWaModalOpen(true);
  };

  const closeWaModal = () => {
    setWaModalClosing(true);
    setTimeout(() => {
      setWaModalClosing(false);
      setWaModalOpen(false);
    }, 150);
  };

  const sendWaMsg = async (text: string) => {
    if (!waSelectedCliente || !text.trim()) return;
    setIsWaSending(true);
    try {
      const res = await enviarMensagemManual({ clienteId: waSelectedCliente.id, texto: text });
      if (res.ok) {
        closeWaModal();
      } else {
        alert(`Falha ao enviar: ${res.erro || "Erro desconhecido"}`);
      }
    } catch (err) {
      alert("Falha de conexão. O serviço do WhatsApp está rodando?");
    } finally {
      setIsWaSending(false);
    }
  };

  // Função para buscar clientes da API
  // Fix: usa AbortController para cancelar requests anteriores ainda pendentes,
  // evitando race condition onde resultado de query antiga sobrescreve resultado recente.
  const fetchClientes = async (searchQuery: string, pageNum: number, append = false) => {
    // Cancela qualquer request de busca anterior ainda em andamento
    if (!append && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    if (!append) {
      abortControllerRef.current = controller;
    }

    try {
      if (pageNum === 1 && !append) setLoading(true);
      else setLoadingMore(true);

      // Fix: envia a query sem remover acentos — a API já usa unaccent() no Postgres
      const response = await fetch(
        `/api/clientes?query=${encodeURIComponent(searchQuery.trim())}&page=${pageNum}&limit=16`,
        { signal: controller.signal }
      );
      const data = await response.json();

      if (data.clientes) {
        if (append) {
          setClientes((prev) => [...prev, ...data.clientes]);
        } else {
          setClientes(data.clientes);
        }
        setHasMore(data.hasMore);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      // AbortError é esperado quando o request é cancelado propositalmente — não logar como erro
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Erro ao buscar clientes:", err);
    } finally {
      // Só limpa loading se este controller ainda é o ativo (não foi substituído)
      if (!append && abortControllerRef.current !== controller) return;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Efeito disparado ao digitar na busca (com debounce)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchClientes(query, 1, false);
    }, 300); // 300ms de debounce para não afogar o banco

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [query]);

  // Carregar mais clientes (paginação)
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchClientes(query, nextPage, true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-slate-500">
            {loading ? "Carregando..." : `${totalCount} cadastrados`}
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center space-x-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo cliente</span>
        </Link>
      </div>

      {/* Input de Busca Dinâmico */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, telefone, cidade ou CPF..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 placeholder-slate-400"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          </div>
        )}
      </div>

      {/* Grid de Clientes */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 transition-opacity duration-200 ${loading && page === 1 && clientes.length > 0 ? "opacity-60" : "opacity-100"}`}>
        {loading && page === 1 && clientes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-sm text-slate-400">Buscando na lista...</span>
          </div>
        ) : clientes.length === 0 ? (
          <div className="col-span-full premium-card p-12 text-center text-slate-500 animate-fade-in">
            Nenhum cliente encontrado para a busca.
          </div>
        ) : (
          clientes.map((c, index) => {
            const avatarLetra = c.nome.charAt(0).toUpperCase();
            
            return (
              <div 
                key={c.id} 
                style={{ "--i": Math.min(index, 10) } as React.CSSProperties}
                className="animate-row-in premium-card p-4 flex items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm rounded-2xl active:scale-[0.98] transition-transform cursor-pointer hover:border-emerald-400 overflow-hidden"
              >
                <Link href={`/clientes/${c.id}`} className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0 group">
                  {/* Foto de Perfil ou Letra */}
                  {c.foto_url ? (
                    <img 
                      src={c.foto_url} 
                      alt={c.nome} 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 group-hover:border-emerald-500 transition-colors pointer-events-none shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center text-base group-hover:bg-emerald-700 transition-colors pointer-events-none shadow-sm shrink-0">
                      {avatarLetra}
                    </div>
                  )}

                  {/* Informações */}
                  <div className="space-y-0.5 pointer-events-none min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors truncate">
                      {c.nome}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {c.telefone}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.cidade || "Não informada"} {c.documento ? `• ${c.documento}` : ""}
                    </p>
                  </div>
                </Link>

                {/* Botões de Ação */}
                <div className="flex items-center space-x-2 shrink-0 z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); openWaModal(c); }}
                    className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-all active:scale-90 cursor-pointer"
                    title="Enviar Mensagem"
                  >
                    <MessageCircle className="w-5 h-5 pointer-events-none" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Botão Carregar Mais */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Carregando fila...</span>
              </>
            ) : (
              <span>Carregar mais clientes (ver fila)</span>
            )}
          </button>
        </div>
      )}

      {/* WhatsApp Modal */}
      {waModalOpen && waSelectedCliente && (
        <div 
          onClick={closeWaModal}
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 ${
            waModalClosing ? "motion-modal-backdrop-out" : "motion-modal-backdrop-in"
          }`}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden ${
              waModalClosing ? "motion-modal-card-out" : "motion-modal-card-in"
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                  <MessageCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Enviar Mensagem</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">Para {waSelectedCliente.nome}</p>
              </div>
              <button onClick={closeWaModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Respostas Rápidas</label>
                  <Link href="/configuracoes/mensagens#respostas" className="text-xs flex items-center gap-1 font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer">
                    <Settings className="w-3.5 h-3.5" /> Editar modelos
                  </Link>
                </div>
                <div className="flex flex-col gap-2">
                  {waTemplates.map((msg, i) => (
                    <button key={i} onClick={() => sendWaMsg(msg)} disabled={isWaSending} className="text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] break-words">
                      {msg
                        .replace(/\{nome_completo\}/g, waSelectedCliente.nome)
                        .replace(/\{nome\}/g, waSelectedCliente.nome.split(" ")[0])}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mensagem Personalizada</label>
                <textarea 
                  value={waCustomMsg}
                  onChange={(e) => setWaCustomMsg(e.target.value)}
                  placeholder="Digite sua mensagem livre aqui..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 min-h-[90px] resize-y"
                />
              </div>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button 
                onClick={() => sendWaMsg(waCustomMsg)}
                disabled={!waCustomMsg.trim() || isWaSending}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 text-xs sm:text-sm"
              >
                {isWaSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isWaSending ? "Enviando..." : "Enviar Mensagem"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
