import Link from "next/link";
import { ArrowLeft, Plus, ExternalLink } from "lucide-react";
import { listarFuncionarios, alternarAtivoFuncionario } from "./actions";

// Consulta o banco a cada acesso (não pode ser pré-renderizada no build)
export const dynamic = "force-dynamic";

export default async function FuncionariosPage() {
  const funcionarios = await listarFuncionarios();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link href="/configuracoes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Configurações
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funcionários</h1>
          <p className="text-xs text-slate-500">Cada funcionário acessa só as cobranças que você compartilhar com ele.</p>
        </div>
        <Link href="/configuracoes/funcionarios/criar" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {funcionarios.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhum funcionário cadastrado.</p>}
        {funcionarios.map((f) => (
          <div key={f.id} className="p-4 flex items-center gap-3">
            {f.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.foto_url} alt={f.nome} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center">
                {f.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {f.nome} {!f.ativo && <span className="text-xs text-rose-600 font-bold">(desativado)</span>}
              </p>
              <a href={`/${f.slug}/cliente`} target="_blank" className="text-xs text-emerald-700 flex items-center gap-1">
                /{f.slug}/cliente <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">{f._count.emprestimos} empréstimo(s)</span>
            <form action={alternarAtivoFuncionario.bind(null, f.id, !f.ativo)}>
              <button className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                {f.ativo ? "Desativar" : "Ativar"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
