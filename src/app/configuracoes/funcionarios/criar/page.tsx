import { criarFuncionario } from "../actions";
import { redirect } from "next/navigation";

export default function CriarFuncionarioPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    await criarFuncionario({
      nome: formData.get("nome") as string,
      slug: formData.get("slug") as string,
      senha: formData.get("senha") as string,
    });
    redirect("/configuracoes/funcionarios");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Novo Funcionário</h1>
      <form action={handleSubmit} className="bg-white p-4 shadow rounded-lg space-y-4">
        <input name="nome" placeholder="Nome" className="border p-2 w-full" required />
        <input name="slug" placeholder="Slug (URL única)" className="border p-2 w-full" required />
        <input name="senha" type="password" placeholder="Senha" className="border p-2 w-full" required />
        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Salvar</button>
      </form>
    </div>
  );
}
