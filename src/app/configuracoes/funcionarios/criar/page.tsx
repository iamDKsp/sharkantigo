import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { criarFuncionario } from "../actions";

export const dynamic = "force-dynamic";

const input = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default async function CriarFuncionarioPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;

  async function salvar(formData: FormData) {
    "use server";
    const r = await criarFuncionario({
      nome: String(formData.get("nome") || ""),
      slug: String(formData.get("slug") || ""),
      senha: String(formData.get("senha") || ""),
      telefone: String(formData.get("telefone") || ""),
      fotoUrl: String(formData.get("fotoUrl") || ""),
    });
    if (!r.ok) redirect(`/configuracoes/funcionarios/criar?erro=${encodeURIComponent(r.erro)}`);
    redirect("/configuracoes/funcionarios");
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <Link href="/configuracoes/funcionarios" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Funcionários
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Novo funcionário</h1>

      {erro && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl px-4 py-3">{erro}</p>}

      <form action={salvar} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <label className="block text-xs font-bold text-slate-500">Nome
          <input name="nome" required className={input} />
        </label>
        <label className="block text-xs font-bold text-slate-500">Link de acesso
          <input name="slug" required placeholder="ex: joao" pattern="[a-z0-9-]{3,40}" className={input} />
          <span className="font-normal text-slate-400">Ficará: seudominio.com.br/<b>joao</b>/cliente</span>
        </label>
        <label className="block text-xs font-bold text-slate-500">Senha
          <input name="senha" type="password" required minLength={4} className={input} />
        </label>
        <label className="block text-xs font-bold text-slate-500">Telefone (opcional)
          <input name="telefone" className={input} />
        </label>
        <label className="block text-xs font-bold text-slate-500">URL da foto (opcional)
          <input name="fotoUrl" type="url" className={input} />
        </label>
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl">Salvar</button>
      </form>
    </div>
  );
}
