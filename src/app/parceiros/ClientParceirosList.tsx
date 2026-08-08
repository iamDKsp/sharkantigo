"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, X, Loader2, Phone } from "lucide-react";
import { createParceiro, updateParceiro, deleteParceiro } from "./actions";

interface Parceiro {
  id: string;
  nome: string;
  telefone: string | null;
  criado_em: Date;
}

interface ClientParceirosListProps {
  parceiros: Parceiro[];
}

export default function ClientParceirosList({ parceiros }: ClientParceirosListProps) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null);

  // Form fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const handleOpenAdd = () => {
    setEditingParceiro(null);
    setNome("");
    setTelefone("");
    setShowModal(true);
  };

  const handleOpenEdit = (p: Parceiro) => {
    setEditingParceiro(p);
    setNome(p.nome);
    setTelefone(p.telefone || "");
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o parceiro ${name}?`)) {
      startTransition(async () => {
        try {
          await deleteParceiro(id);
        } catch (err: any) {
          alert(err.message || "Erro ao deletar parceiro");
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    const fd = new FormData();
    fd.set("nome", nome);
    fd.set("telefone", telefone);

    startTransition(async () => {
      try {
        if (editingParceiro) {
          await updateParceiro(editingParceiro.id, fd);
        } else {
          await createParceiro(fd);
        }
        setShowModal(false);
      } catch (err: any) {
        alert(err.message || "Erro ao salvar parceiro");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parceiros</h1>
          <p className="text-slate-500">
            {parceiros.length} parceiros cadastrados que emprestam capital.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo parceiro</span>
        </button>
      </div>

      {/* Grid de Parceiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parceiros.length === 0 ? (
          <div className="col-span-full premium-card p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Nenhum parceiro cadastrado. Cadastre um parceiro para começar a associar empréstimos a ele.
          </div>
        ) : (
          parceiros.map((p) => {
            const iniciais = p.nome
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();

            return (
              <div
                key={p.id}
                className="premium-card p-4 flex items-center justify-between bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-400 transition-all"
              >
                <Link href={`/parceiros/${p.id}`} className="flex items-center space-x-3.5 flex-1 group">
                  <div className="w-12 h-12 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center text-sm shadow-sm group-hover:bg-emerald-700 transition-colors">
                    {iniciais}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">
                      {p.nome}
                    </h3>
                    {p.telefone && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.telefone}</span>
                      </p>
                    )}
                  </div>
                </Link>

                <div className="flex items-center space-x-1.5 ml-4">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEdit(p); }}
                    className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                    title="Editar parceiro"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p.id, p.nome); }}
                    disabled={isPending}
                    className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    title="Excluir parceiro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-4 text-slate-900 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-xs">
                {editingParceiro ? "Editar Parceiro" : "Novo Parceiro"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 uppercase">Nome *</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Bruno"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 uppercase">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: (14) 99999-9999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-emerald-700 cursor-pointer"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
