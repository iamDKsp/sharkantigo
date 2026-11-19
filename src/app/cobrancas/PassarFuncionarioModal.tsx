"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, UserPlus, X } from "lucide-react";
import { listarFuncionarios } from "@/app/configuracoes/funcionarios/actions";
import { passarEmprestimos } from "@/app/emprestimos/[id]/actions";
import type { Parcela } from "./tipos";

type Funcionario = Awaited<ReturnType<typeof listarFuncionarios>>[number];

export default function PassarFuncionarioModal({
  parcelas,
  onClose,
  onSuccess,
}: {
  parcelas: Parcela[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Empréstimos únicos (várias parcelas podem ser do mesmo empréstimo)
  const emprestimos = Array.from(new Map(parcelas.map((p) => [p.emprestimo.id, p.emprestimo])).values());
  const unico = emprestimos.length === 1 ? emprestimos[0] : null;

  const [funcId, setFuncId] = useState(unico?.funcionario?.id ?? "");
  const [podeWa, setPodeWa] = useState(unico?.podeDispararWhatsapp ?? false);

  useEffect(() => {
    listarFuncionarios()
      .then((l) => setFuncionarios(l.filter((f) => f.ativo)))
      .catch(() => setErro("Não foi possível carregar os funcionários."));
  }, []);

  const confirmar = (remover = false) => {
    setErro(null);
    if (!remover && !funcId) return setErro("Escolha um funcionário.");
    startTransition(async () => {
      try {
        await passarEmprestimos(emprestimos.map((e) => e.id), remover ? null : funcId, podeWa);
        const nome = funcionarios?.find((f) => f.id === funcId)?.nome;
        onSuccess(
          remover
            ? "Compartilhamento removido"
            : `${emprestimos.length} empréstimo(s) passado(s) para ${nome}`
        );
      } catch (e: any) {
        setErro(e?.message || "Erro ao passar empréstimo.");
      }
    });
  };

  const algumCompartilhado = emprestimos.some((e) => e.funcionario);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && !isPending && onClose()}
      className="fixed inset-0 z-[60] p-3 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm motion-modal-backdrop-in"
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden motion-modal-card-in">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900">Passar para funcionário</h3>
            <p className="text-xs text-slate-500 truncate">
              {unico ? unico.cliente.nome : `${emprestimos.length} empréstimos selecionados`}
            </p>
          </div>
          <button onClick={onClose} disabled={isPending} className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {erro && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3">{erro}</p>}

          {funcionarios === null ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
          ) : funcionarios.length === 0 ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-slate-600">Nenhum funcionário cadastrado.</p>
              <Link href="/configuracoes/funcionarios/criar" className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                <UserPlus className="w-4 h-4" /> Cadastrar funcionário
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {funcionarios.map((f) => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                      funcId === f.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input type="radio" name="func" checked={funcId === f.id} onChange={() => setFuncId(f.id)} className="accent-emerald-600" />
                    {f.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                        {f.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-bold text-slate-800 truncate">{f.nome}</span>
                    <span className="text-[10px] text-slate-400">{f._count.emprestimos} já</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPodeWa(!podeWa)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3 ${
                  podeWa ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className={`p-2 rounded-xl ${podeWa ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-black text-slate-800">Pode cobrar pelo WhatsApp</span>
                  <span className="block text-[11px] text-slate-500">Envia do seu número (o funcionário não vê o celular)</span>
                </span>
                <span className={`w-5 h-5 rounded-md border-2 ${podeWa ? "bg-emerald-600 border-emerald-600" : "border-slate-300 bg-white"}`} />
              </button>

              <div className="flex gap-2">
                {algumCompartilhado && (
                  <button
                    type="button"
                    onClick={() => confirmar(true)}
                    disabled={isPending}
                    className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => confirmar(false)}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Passar {emprestimos.length > 1 ? `${emprestimos.length} empréstimos` : "empréstimo"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
