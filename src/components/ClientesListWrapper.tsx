"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plus, Search, MessageCircle, Loader2, X, Send, Settings, Trash2 } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  documento: string;
  foto_url: string | null;
}

export default function ClientesListWrapper() {
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WhatsApp Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waSelectedCliente, setWaSelectedCliente] = useState<Cliente | null>(null);
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

  const openWaModal = (cliente: Cliente) => {
    setWaSelectedCliente(cliente);
    setWaCustomMsg("");
    setWaModalOpen(true);
  };

  const sendWaMsg = async (text: string) => {
    if (!waSelectedCliente || !text.trim()) return;
    setIsWaSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ phone: waSelectedCliente.telefone, text }]
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

  // Função para buscar clientes da API
  const fetchClientes = async (searchQuery: string, pageNum: number, append = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      else setLoadingMore(true);

      const response = await fetch(`/api/clientes?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=16`);
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
      console.error("Erro ao buscar clientes:", err);
    } finally {
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
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-slate-500 dark:text-emerald-400/80">
            {loading ? "Carregando..." : `${totalCount} cadastrados`}
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center space-x-1.5 bg-[#064e3b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-850 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Novo cliente</span>
        </Link>
      </div>

      {/* Input de Busca Dinâmico */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-emerald-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, telefone, cidade ou CPF..."
          className="w-full bg-white dark:bg-[#13221b] border border-slate-200 dark:border-emerald-950 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-600"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-650" />
          </div>
        )}
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && page === 1 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#064e3b] dark:text-[#10b981]" />
            <span className="text-sm text-slate-400">Buscando na lista...</span>
          </div>
        ) : clientes.length === 0 ? (
          <div className="col-span-full premium-card p-12 text-center text-slate-500 dark:text-emerald-400/60">
            Nenhum cliente encontrado para a busca.
          </div>
        ) : (
          clientes.map((c) => {
            const avatarLetra = c.nome.charAt(0).toUpperCase();
            
            return (
              <div 
                key={c.id} 
                className="premium-card p-4 flex items-center justify-between bg-white dark:bg-[#13221b] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Link href={`/clientes/${c.id}`} className="flex items-center space-x-4 flex-grow group">
                  {/* Foto de Perfil ou Letra */}
                  {c.foto_url ? (
                    <img 
                      src={c.foto_url} 
                      alt={c.nome} 
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-100 dark:border-emerald-800/30 group-hover:border-emerald-500 transition-colors pointer-events-none"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-emerald-800 text-emerald-100 font-bold rounded-2xl flex items-center justify-center text-sm group-hover:bg-emerald-700 transition-colors pointer-events-none">
                      {avatarLetra}
                    </div>
                  )}

                  {/* Informações */}
                  <div className="space-y-0.5 pointer-events-none">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-455 transition-colors">
                      {c.nome}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-emerald-400/80">
                      {c.telefone}
                    </p>
                    <p className="text-sm text-slate-400 dark:text-emerald-600">
                      {c.cidade || "Não informada"} {c.documento ? `• ${c.documento}` : ""}
                    </p>
                  </div>
                </Link>

                {/* Botões de Ação */}
                <div className="flex items-center space-x-2 z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); openWaModal(c); }}
                    className="p-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all active:scale-90"
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
            className="flex items-center space-x-2 bg-white dark:bg-[#13221b] border border-slate-200 dark:border-emerald-950 text-slate-700 dark:text-emerald-455 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#13221b] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-emerald-900/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-emerald-900/30 flex justify-between items-center bg-slate-50 dark:bg-emerald-950/20">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  Enviar Mensagem
                </h3>
                <p className="text-sm text-slate-500 dark:text-emerald-500/70 mt-1">Para {waSelectedCliente.nome}</p>
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
