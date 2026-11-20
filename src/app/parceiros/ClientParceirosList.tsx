"use client";

import { useState, useTransition } from "react";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useUrlState } from "@/hooks/useUrlState";
import Link from "next/link";
import { Plus, Edit3, Trash2, X, Loader2, Phone, Handshake, Users } from "lucide-react";
import { createParceiro, updateParceiro, deleteParceiro } from "./actions";
import FuncionariosListClient, {
  type BaixaPendenteGlobal,
  type FuncionarioResumoAdm,
} from "@/app/configuracoes/funcionarios/FuncionariosListClient";

interface Parceiro {
  id: string;
  nome: string;
  telefone: string | null;
  criado_em: Date;
}

type Aba = "parceiros" | "funcionarios";

const resolveAba = (v: string): Aba => (v === "funcionarios" ? "funcionarios" : "parceiros");

interface ClientParceirosListProps {
  parceiros: Parceiro[];
  funcionarios: FuncionarioResumoAdm[];
  pendentes: BaixaPendenteGlobal[];
  initialAba?: Aba;
}

export default function ClientParceirosList({
  parceiros,
  funcionarios,
  pendentes,
  initialAba = "parceiros",
}: ClientParceirosListProps) {
  useScrollRestoration("parceiros-list");
  const [aba, setAba] = useUrlState<Aba>("aba", initialAba, "parceiros", resolveAba);

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
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Erro ao deletar parceiro");
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
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao salvar parceiro");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Seletor de abas: Parceiros | Funcionários */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Alternar entre Parceiros e Funcionários"
          className="inline-flex w-full sm:w-auto p-1 bg-slate-100 border border-slate-200/80 rounded-2xl"
        >
          <button
            role="tab"
            type="button"
            aria-selected={aba === "parceiros"}
            onClick={() => setAba("parceiros")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              aba === "parceiros"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Handshake className="w-4 h-4 shrink-0" />
            <span>Parceiros</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                aba === "parceiros"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {parceiros.length}
            </span>
          </button>

          <button
            role="tab"
            type="button"
            aria-selected={aba === "funcionarios"}
            onClick={() => setAba("funcionarios")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              aba === "funcionarios"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Funcionários</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                aba === "funcionarios"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {funcionarios.length}
            </span>
            {pendentes.length > 0 && (
              <span
                title={`${pendentes.length} ${pendentes.length === 1 ? "aprovação pendente" : "aprovações pendentes"}`}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black tabular-nums shadow-xs"
              >
                {pendentes.length}
              </span>
            )}
          </button>
        </div>

        {aba === "parceiros" ? (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center space-x-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo parceiro</span>
          </button>
        ) : (
          <Link
            href="/configuracoes/funcionarios/criar"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-black shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Funcionário</span>
          </Link>
        )}
      </div>

      {aba === "parceiros" ? (
        <div key="aba-parceiros" className="space-y-5 motion-page-enter">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parceiros</h1>
            <p className="text-sm text-slate-500">
              {parceiros.length} {parceiros.length === 1 ? "parceiro cadastrado" : "parceiros cadastrados"} que emprestam capital.
            </p>
          </div>

          {/* Grid de Parceiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                    className="premium-card p-4 flex items-center justify-between bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-400 transition-all min-w-0"
                  >
                    <Link href={`/parceiros/${p.id}`} className="flex items-center space-x-3.5 flex-1 min-w-0 group">
                      <div className="w-12 h-12 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center text-sm shadow-sm group-hover:bg-emerald-700 transition-colors shrink-0">
                        {iniciais}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 leading-tight truncate group-hover:text-emerald-600 transition-colors">
                          {p.nome}
                        </h3>
                        {p.telefone && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.telefone}</span>
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center space-x-1.5 ml-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                        title="Editar parceiro"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(p.id, p.nome);
                        }}
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
        </div>
      ) : (
        <div key="aba-funcionarios" className="space-y-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Funcionários</h1>
            <p className="text-sm text-slate-500">
              Gerencie cobradores, permissões, aprovações de baixa e prestação de contas.
            </p>
          </div>

          <FuncionariosListClient funcionarios={funcionarios} pendentes={pendentes} />
        </div>
      )}

      {/* Modal Add/Edit Parceiro */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 animate-fade-in pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-xs">
                {editingParceiro ? "Editar Parceiro" : "Novo Parceiro"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
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

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto text-center px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto justify-center px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-emerald-700 cursor-pointer"
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
