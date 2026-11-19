import { listarFuncionarios } from "./actions";
import { Plus } from "lucide-react";

export default async function FuncionariosPage() {
  const funcionarios = await listarFuncionarios();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Funcionários</h1>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Novo Funcionário
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2">Nome</th>
              <th className="py-2">Slug</th>
              <th className="py-2">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="py-2">{f.nome}</td>
                <td className="py-2">{f.slug}</td>
                <td className="py-2">{f.ativo ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
