"use client";

import { useState } from "react";
import { compare } from "bcryptjs";

export default function FuncionarioDashboardClient({ funcionario }: { funcionario: any }) {
  const [senha, setSenha] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  async function checkSenha() {
    if (await compare(senha, funcionario.senha)) {
      setAutenticado(true);
    } else {
      alert("Senha incorreta");
    }
  }

  if (!autenticado) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <img src={funcionario.foto_url || "/avatar.png"} alt={funcionario.nome} className="w-24 h-24 rounded-full mb-4 shadow" />
        <h1 className="text-xl font-bold mb-4">ACESSO - {funcionario.nome}</h1>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className="border p-2 rounded mb-4 w-64" placeholder="Senha" />
        <button onClick={checkSenha} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Entrar</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bem-vindo, {funcionario.nome}</h1>
      <div className="grid gap-4">
        {funcionario.emprestimos.map((emp: any) => (
          <div key={emp.id} className="bg-white p-4 shadow rounded-lg border">
            <h2 className="font-bold text-lg">{emp.cliente.nome}</h2>
            <p>Saldo: {emp.valor_emprestado.toString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
