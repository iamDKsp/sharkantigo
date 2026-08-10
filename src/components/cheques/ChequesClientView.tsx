"use client";

import { useState } from "react";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useUrlState } from "@/hooks/useUrlState";
import { Plus, CheckCircle, AlertTriangle, Clock, Trash2, Search, MessageCircle } from "lucide-react";
import ModalCadastrarCheque from "./ModalCadastrarCheque";
import { updateChequeStatus, deleteCheque } from "@/app/cheques/actions";

interface Cheque {
  id: string;
  cliente_id: string | null;
  parceiro_id: string | null;
  titular: string | null;
  banco: string | null;
  valor: any; // Decimal
  taxa_desconto: any; // Decimal
  valor_liquido: any; // Decimal
  data_compensacao: Date;
  status: string;
  foto_url: string | null;
  observacoes: string | null;
  cliente?: {
    nome: string;
    telefone: string;
  } | null;
  parceiro?: {
    nome: string;
  } | null;
}

interface ChequesClientViewProps {
  cheques: Cheque[];
  clientes: any[];
  parceiros: any[];
}

export default function ChequesClientView({ cheques, clientes, parceiros }: ChequesClientViewProps) {
  useScrollRestoration("cheques-list");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useUrlState<string>("q", "", "");

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatData = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(date));
  };

  const totalLiquido = cheques.reduce((acc, curr) => acc + Number(curr.valor_liquido || curr.valor), 0);
  const totalBruto = cheques.reduce((acc, curr) => acc + Number(curr.valor), 0);

  const filteredCheques = cheques.filter((c) => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = norm(searchQuery);
    const clienteNome = norm(c.cliente?.nome || "");
    const telefone = c.cliente?.telefone || "";
    return clienteNome.includes(term) || telefone.includes(term);
  });

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cheque?")) {
      await deleteCheque(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Troca de Cheques</h1>
          <p className="text-xs text-slate-500">
            {cheques.length} no total • líquido {formatBRL(totalLiquido)} • bruto {formatBRL(totalBruto)}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo cheque</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {filteredCheques.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-sm">Nenhum cheque encontrado.</div>
        ) : (
          filteredCheques.map((c) => (
            <div key={c.id} className="premium-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-slate-900 text-base">
                      {c.cliente?.nome || c.titular || "Cliente não informado"}
                    </h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1 ${
                      c.status === "compensado" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "devolvido" ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {c.status === "compensado" ? "Compensado" : c.status === "devolvido" ? "Devolvido" : "Pendente"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-2">
                    <span>Vence {formatData(c.data_compensacao)}</span>
                    {c.cliente?.telefone && (
                      <>
                        <span>•</span>
                        <span>{c.cliente.telefone}</span>
                      </>
                    )}
                    {c.parceiro && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600">Parceiro: {c.parceiro.nome}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={c.status}
                    onChange={(e) => updateChequeStatus(c.id, e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="em_maos">Pendente</option>
                    <option value="compensado">Compensado</option>
                    <option value="devolvido">Devolvido</option>
                  </select>

                  {c.cliente?.telefone && (
                    <a
                      href={`https://wa.me/${c.cliente.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cheque</div>
                  <div className="font-bold text-slate-900">{formatBRL(Number(c.valor))}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa {c.taxa_desconto ? `${Number(c.taxa_desconto)}%` : '-'}</div>
                  <div className="font-bold text-slate-900">
                    {c.taxa_desconto ? formatBRL(Number(c.valor) - Number(c.valor_liquido)) : '-'}
                  </div>
                </div>
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Líquido</div>
                  <div className="font-bold text-emerald-700">{formatBRL(Number(c.valor_liquido || c.valor))}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ModalCadastrarCheque
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientes={clientes}
        parceiros={parceiros}
      />
    </div>
  );
}
