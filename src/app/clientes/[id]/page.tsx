import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  MessageSquare, 
  User, 
  Calendar, 
  HandCoins, 
  Trash2, 
  Edit3,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Plus,
  Wallet
} from "lucide-react";
import { revalidatePath } from "next/cache";
import DeleteClientButton from "@/components/DeleteClientButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

// Action para deletar cliente
async function deleteCliente(id: string) {
  "use server";
  await prisma.cliente.delete({
    where: { id },
  });
  revalidatePath("/clientes");
  redirect("/clientes");
}

export default async function ClienteDetalhesPage({ params }: PageProps) {
  const { id } = await params;

  // Buscar cliente e todos os seus empréstimos
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      emprestimos: {
        orderBy: {
          data_vencimento: "asc",
        },
      },
      cheques: {
        orderBy: {
          data_compensacao: "asc",
        },
      },
    },
  });

  if (!cliente) {
    notFound();
  }

  // Obter data de hoje em UTC
  const hojeDate = new Date();
  const hojeUTC = new Date(Date.UTC(hojeDate.getFullYear(), hojeDate.getMonth(), hojeDate.getDate()));

  // Cálculos financeiros
  let totalEmprestadoAtivo = 0;
  let totalRecebido = 0;
  let totalAReceber = 0;
  let totalAtrasado = 0;
  let lucroCheques = 0;

  let countAbertos = 0;
  let countAtrasados = 0;

  cliente.emprestimos.forEach((emp) => {
    const principal = Number(emp.valor_emprestado);
    const juros = Number(emp.taxa_juros);
    const totalComJuros = principal * (1 + juros / 100);

    const vencObj = new Date(emp.data_vencimento);
    const vencimentoUTC = new Date(Date.UTC(vencObj.getUTCFullYear(), vencObj.getUTCMonth(), vencObj.getUTCDate()));

    const estaAtrasado = emp.status === "ativo" && vencimentoUTC < hojeUTC;

    if (emp.status === "quitado") {
      totalRecebido += totalComJuros;
    } else if (emp.status === "ativo") {
      totalEmprestadoAtivo += principal;
      totalAReceber += totalComJuros;
      countAbertos++;
      
      if (estaAtrasado) {
        totalAtrasado += totalComJuros;
        countAtrasados++;
      }
    }
  });

  cliente.cheques.forEach((cheque) => {
    const valor = Number(cheque.valor);
    const liquido = Number(cheque.valor_liquido || cheque.valor);
    const lucro = valor - liquido;
    lucroCheques += lucro;
  });

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
      timeZone: "UTC",
    }).format(new Date(date));
  };

  // Iniciais para o avatar
  const iniciais = cliente.nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const whatsappUrl = `https://wa.me/${cliente.telefone}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Botão Voltar & Ações Rápidas */}
      <div className="flex items-center justify-between">
        <Link
          href="/clientes"
          className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 dark:text-emerald-400 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Pessoas</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          <Link
            href={`/clientes/${cliente.id}/editar`}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-slate-700 dark:text-emerald-400 rounded-xl transition-colors flex items-center justify-center"
            title="Editar Pessoa"
          >
            <Edit3 className="w-5 h-5" />
          </Link>
          <DeleteClientButton clienteId={cliente.id} onDeleteAction={deleteCliente} />
        </div>
      </div>

      {/* Card Cabeçalho Perfil */}
      <div className="premium-card p-6 flex flex-col items-center text-center bg-white dark:bg-[#13221b]">
        {cliente.foto_url ? (
          <img 
            src={cliente.foto_url} 
            alt={cliente.nome} 
            className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-md"
          />
        ) : (
          <div className="w-24 h-24 bg-emerald-800 text-emerald-100 font-bold rounded-full flex items-center justify-center text-sm shadow-md">
            {iniciais}
          </div>
        )}

        <h1 className="text-sm font-bold text-slate-900 dark:text-white mt-4">{cliente.nome}</h1>
        <p className="text-sm text-slate-500 dark:text-emerald-400/80 mt-1">{cliente.telefone}</p>

        {cliente.blacklist && (
          <span className="mt-2 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Lista Negra (Bloqueado)
          </span>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center space-x-2 bg-[#075e54] text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-[#128c7e] transition-colors shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>
      </div>

      {/* Resumo Financeiro */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Resumo financeiro</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Emprestado (Ativo) */}
          <div className="premium-card p-4 bg-white dark:bg-[#13221b]">
            <div className="flex items-center space-x-2 text-slate-400 dark:text-emerald-600">
              <HandCoins className="w-4.5 h-4.5" />
              <span className="text-sm font-bold uppercase tracking-wider">Emprestado (ativo)</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
              {formatBRL(totalEmprestadoAtivo)}
            </div>
          </div>

          {/* Total Recebido */}
          <div className="premium-card p-4 bg-white dark:bg-[#13221b]">
            <div className="flex items-center space-x-2 text-emerald-500">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span className="text-sm font-bold uppercase tracking-wider">Total recebido</span>
            </div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {formatBRL(totalRecebido)}
            </div>
          </div>

          {/* A receber */}
          <div className="premium-card p-4 bg-white dark:bg-[#13221b]">
            <div className="flex items-center space-x-2 text-slate-400 dark:text-emerald-600">
              <TrendingUp className="w-4.5 h-4.5" />
              <span className="text-sm font-bold uppercase tracking-wider">A receber</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
              {formatBRL(totalAReceber)}
            </div>
          </div>

          {/* Total Atrasado */}
          <div className="premium-card p-4 bg-white dark:bg-[#13221b]">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertCircle className="w-4.5 h-4.5" />
              <span className="text-sm font-bold uppercase tracking-wider">Total Atrasado</span>
            </div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">
              {formatBRL(totalAtrasado)}
            </div>
          </div>

          {/* Lucro Cheques */}
          <div className="premium-card p-4 bg-white dark:bg-[#13221b] sm:col-span-2 md:col-span-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Lucro Gerado com Cheques</span>
              </div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatBRL(lucroCheques)}
              </div>
            </div>
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-4 premium-card p-4 bg-white dark:bg-[#13221b] text-center">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{countAbertos}</div>
            <div className="text-sm text-slate-400 dark:text-emerald-600 uppercase font-semibold">Abertos</div>
          </div>
          <div>
            <div className="text-sm font-bold text-red-500">{countAtrasados}</div>
            <div className="text-sm text-slate-400 dark:text-emerald-600 uppercase font-semibold">Atrasados</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{cliente.blacklist ? "Sim" : "Não"}</div>
            <div className="text-sm text-slate-400 dark:text-emerald-600 uppercase font-semibold">Lista Negra</div>
          </div>
        </div>
      </div>

      {/* Informações detalhadas */}
      <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-4">
        <h2 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-emerald-950 pb-2">
          Informações
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">CPF</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.documento || "Não cadastrado"}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">Email</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.email || "Não cadastrado"}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">Endereço</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.endereco || "Não cadastrado"}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">Cidade</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.cidade}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">Referência</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.referencia || "Não cadastrado"}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-450 dark:text-emerald-500 font-bold uppercase">Quem indicou</span>
            <span className="text-slate-900 dark:text-white font-medium">{cliente.quem_indicou || "Não indicado"}</span>
          </div>
        </div>
      </div>

      {/* Observações */}
      {cliente.observacoes && (
        <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-2">
          <h2 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-emerald-950 pb-2">
            Observações
          </h2>
          <p className="text-sm text-slate-700 dark:text-emerald-300 font-medium whitespace-pre-line leading-relaxed">
            {cliente.observacoes}
          </p>
        </div>
      )}

      {/* Documentos Anexados */}
      {(() => {
        let documentos: string[] = [];
        if (cliente.documentos_urls) {
          try {
            documentos = JSON.parse(cliente.documentos_urls);
            if (!Array.isArray(documentos)) documentos = [];
          } catch {
            documentos = [];
          }
        }

        if (documentos.length === 0) return null;

        return (
          <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-4">
            <h2 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-emerald-950 pb-2">
              Documentos Anexados
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {documentos.map((url, idx) => {
                const isPdf = url.toLowerCase().endsWith(".pdf");
                return (
                  <div key={idx} className="relative group border border-slate-200 dark:border-emerald-950 rounded-xl overflow-hidden bg-slate-50 dark:bg-[#0b130e] aspect-video sm:aspect-square flex items-center justify-center">
                    {isPdf ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 text-center hover:bg-slate-100 dark:hover:bg-emerald-900/40 w-full h-full transition-colors"
                      >
                        <span className="text-red-500 font-bold text-sm">PDF</span>
                        <span className="text-sm text-slate-500 dark:text-emerald-400 mt-1 truncate max-w-full">
                          Documento {idx + 1}
                        </span>
                      </a>
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block w-full h-full group"
                      >
                        <img
                          src={url}
                          alt={`Documento ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Empréstimos da Pessoa */}
      <div className="premium-card overflow-hidden bg-white dark:bg-[#13221b]">
        <div className="p-5 border-b border-slate-100 dark:border-emerald-950 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Empréstimos</h2>
          <Link
            href={`/emprestimos/novo?clienteId=${cliente.id}`}
            className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 p-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Empréstimo</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-emerald-950">
          {cliente.emprestimos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-emerald-400/60">
              Nenhum empréstimo cadastrado para esta pessoa.
            </div>
          ) : (
            cliente.emprestimos.map((emp) => {
              const principal = Number(emp.valor_emprestado);
              const juros = Number(emp.taxa_juros);
              const totalComJuros = principal * (1 + juros / 100);

              const vencObj = new Date(emp.data_vencimento);
              const vencimentoUTC = new Date(Date.UTC(vencObj.getUTCFullYear(), vencObj.getUTCMonth(), vencObj.getUTCDate()));

              const venceHoje = emp.status === "ativo" && vencimentoUTC.getTime() === hojeUTC.getTime();
              const estaAtrasado = emp.status === "ativo" && vencimentoUTC < hojeUTC;

              return (
                <Link 
                  key={emp.id} 
                  href={`/emprestimos/${emp.id}`}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-950 dark:text-white">
                        Vencimento: {formatData(emp.data_vencimento)}
                      </span>
                      {emp.status === "quitado" ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase">
                          Quitado
                        </span>
                      ) : estaAtrasado ? (
                        <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase">
                          Atrasado
                        </span>
                      ) : venceHoje ? (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-bold px-2 py-0.5 rounded-full uppercase">
                          Vencendo Hoje
                        </span>
                      ) : (
                        <span className="bg-emerald-55 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-sm font-bold px-2 py-0.5 rounded-full uppercase">
                          Em dia
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 dark:text-emerald-500 mt-1">
                      Taxa de juros: {juros}% | Multa: {Number(emp.taxa_multa)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-950 dark:text-white">
                      {formatBRL(principal)} → <span className="text-emerald-600 dark:text-emerald-400">{formatBRL(totalComJuros)}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Cheques da Pessoa */}
      <div className="premium-card overflow-hidden bg-white dark:bg-[#13221b]">
        <div className="p-5 border-b border-slate-100 dark:border-emerald-950 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Troca de Cheques</h2>
          <Link
            href={`/cheques`}
            className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 p-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors"
          >
            <span>Ir para Cheques</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-emerald-950">
          {cliente.cheques.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-emerald-400/60">
              Nenhum cheque vinculado a esta pessoa.
            </div>
          ) : (
            cliente.cheques.map((cheque) => {
              const valorBruto = Number(cheque.valor);
              const valorLiquido = Number(cheque.valor_liquido || cheque.valor);
              const taxa = Number(cheque.taxa_desconto || 0);

              return (
                <div key={cheque.id} className="p-4 flex flex-col space-y-3 hover:bg-slate-50/60 dark:hover:bg-emerald-950/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-950 dark:text-white">
                        Vencimento: {formatData(cheque.data_compensacao)}
                      </span>
                      {cheque.status === "compensado" ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                          Compensado
                        </span>
                      ) : cheque.status === "devolvido" ? (
                        <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                          Devolvido
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="border border-slate-200 dark:border-emerald-900 rounded-lg px-3 py-1.5 bg-white dark:bg-[#0b130e]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-emerald-500 block">Cheque</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatBRL(valorBruto)}</span>
                      </div>
                      <div className="border border-slate-200 dark:border-emerald-900 rounded-lg px-3 py-1.5 bg-white dark:bg-[#0b130e]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-emerald-500 block">Taxa {taxa}%</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatBRL(valorBruto - valorLiquido)}</span>
                      </div>
                    </div>
                    <div className="text-right border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Líquido</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatBRL(valorLiquido)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
