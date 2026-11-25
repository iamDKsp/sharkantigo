"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, MessageSquare, UserPlus, X } from "lucide-react";
import { listarFuncionarios } from "@/app/configuracoes/funcionarios/actions";
import { passarEmprestimos } from "@/app/emprestimos/[id]/actions";
import type { Parcela } from "@/app/cobrancas/tipos";

export interface FuncionarioDelegacaoItem {
  id: string;
  nome: string;
  foto_url: string | null;
  _count: { emprestimos: number };
}

export interface EmprestimoDelegavel {
  id: string;
  cliente: { nome: string };
  funcionario?: { id: string; nome: string; foto_url?: string | null } | null;
  podeDispararWhatsapp?: boolean;
}

export interface ResultadoDelegacao {
  emprestimoIds: string[];
  funcionario: { id: string; nome: string; foto_url: string | null } | null;
  podeDispararWhatsapp: boolean;
}

export default function PassarFuncionarioModal({
  parcelas,
  emprestimos: emprestimosProp,
  funcionariosIniciais,
  onClose,
  onSuccess,
}: {
  parcelas?: Parcela[];
  emprestimos?: EmprestimoDelegavel[];
  funcionariosIniciais?: FuncionarioDelegacaoItem[];
  onClose: () => void;
  onSuccess: (msg: string, resultado: ResultadoDelegacao) => void;
}) {
  const [funcionariosCarregados, setFuncionariosCarregados] = useState<FuncionarioDelegacaoItem[] | null>(null);
  const funcionarios = funcionariosIniciais ?? funcionariosCarregados;
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Empréstimos únicos (aceita lista direta de empréstimos ou parcelas da tela de Cobranças)
  const emprestimos = useMemo<EmprestimoDelegavel[]>(() => {
    if (emprestimosProp && emprestimosProp.length > 0) {
      return Array.from(new Map(emprestimosProp.map((e) => [e.id, e])).values());
    }
    if (parcelas && parcelas.length > 0) {
      return Array.from(new Map(parcelas.map((p) => [p.emprestimo.id, p.emprestimo])).values());
    }
    return [];
  }, [emprestimosProp, parcelas]);

  const unico = emprestimos.length === 1 ? emprestimos[0] : null;
  const funcionarioAtualId = unico?.funcionario?.id ?? "";

  const [funcId, setFuncId] = useState(funcionarioAtualId);
  const [podeWa, setPodeWa] = useState(Boolean(unico?.podeDispararWhatsapp));

  useEffect(() => {
    if (funcionariosIniciais) return;
    listarFuncionarios()
      .then((l) =>
        setFuncionariosCarregados(
          l
            .filter((f) => f.ativo)
            .map((f) => ({
              id: f.id,
              nome: f.nome,
              foto_url: f.foto_url,
              _count: f._count,
            }))
        )
      )
      .catch(() => setErro("Não foi possível carregar os funcionários."));
  }, [funcionariosIniciais]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  const confirmar = (remover = false) => {
    setErro(null);
    if (!remover && !funcId) return setErro("Escolha um funcionário.");
    const ids = emprestimos.map((e) => e.id);
    const destino = remover ? null : funcionarios?.find((f) => f.id === funcId) ?? null;

    startTransition(async () => {
      try {
        await passarEmprestimos(ids, remover ? null : funcId, remover ? false : podeWa);
        const msg = remover
          ? "Compartilhamento removido"
          : emprestimos.length === 1
            ? funcionarioAtualId && funcionarioAtualId !== funcId
              ? `Empréstimo transferido para ${destino?.nome ?? "funcionário"}`
              : `Empréstimo passado para ${destino?.nome ?? "funcionário"}`
            : `${emprestimos.length} empréstimos passados para ${destino?.nome ?? "funcionário"}`;

        onSuccess(msg, {
          emprestimoIds: ids,
          funcionario: destino
            ? { id: destino.id, nome: destino.nome, foto_url: destino.foto_url }
            : null,
          podeDispararWhatsapp: remover ? false : podeWa,
        });
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : "Erro ao passar empréstimo.");
      }
    });
  };

  const algumCompartilhado = emprestimos.some((e) => Boolean(e.funcionario));

  const textoBotaoPrincipal =
    emprestimos.length > 1
      ? `Passar ${emprestimos.length} empréstimos`
      : funcionarioAtualId
        ? funcId === funcionarioAtualId
          ? "Salvar alteração"
          : "Trocar cobrador"
        : "Passar empréstimo";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && !isPending && onClose()}
      className="fixed inset-0 z-[100] p-3 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm motion-modal-backdrop-in"
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden motion-modal-card-in">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900">
              {unico?.funcionario ? "Gerenciar cobrador" : "Passar para funcionário"}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {unico ? unico.cliente.nome : `${emprestimos.length} empréstimos selecionados`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {erro && (
            <p className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3">
              {erro}
            </p>
          )}

          {funcionarios === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-slate-600">Nenhum funcionário cadastrado.</p>
              <Link
                href="/configuracoes/funcionarios/criar"
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                <UserPlus className="w-4 h-4" /> Cadastrar funcionário
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {funcionarios.map((f) => {
                  const ehAtual = funcionarioAtualId === f.id;
                  const selecionado = funcId === f.id;
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                        selecionado
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="func"
                        checked={selecionado}
                        onChange={() => setFuncId(f.id)}
                        className="accent-emerald-600"
                      />
                      {f.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                          {f.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex-1 text-sm font-bold text-slate-800 truncate">
                        {f.nome}
                      </span>
                      {ehAtual && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                          Atual
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {f._count.emprestimos} já
                      </span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPodeWa(!podeWa)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-colors ${
                  podeWa ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span
                  className={`p-2 rounded-xl ${
                    podeWa ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-black text-slate-800">
                    Pode cobrar pelo WhatsApp
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Envia do seu número (o funcionário não vê o celular)
                  </span>
                </span>
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    podeWa
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {podeWa && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
              </button>

              <div className="flex gap-2">
                {algumCompartilhado && (
                  <button
                    type="button"
                    onClick={() => confirmar(true)}
                    disabled={isPending}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => confirmar(false)}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {textoBotaoPrincipal}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
