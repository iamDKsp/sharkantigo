import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { lerSessaoFuncionario } from "@/lib/funcionarioSession";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import AcessoLogin from "./AcessoLogin";
import { BotaoCobrar, BotaoSair } from "./Acoes";
import { Phone, MapPin, AlertCircle, Clock, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const data = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);

export default async function PainelFuncionarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Só dados públicos (nome/foto) antes do login — a senha nunca sai do servidor.
  const funcionario = await prisma.funcionario.findUnique({
    where: { slug },
    select: { id: true, nome: true, foto_url: true, ativo: true },
  });
  if (!funcionario || !funcionario.ativo) notFound();

  const sessao = await lerSessaoFuncionario();
  if (!sessao || sessao.fid !== funcionario.id) {
    return <AcessoLogin slug={slug} nome={funcionario.nome} foto={funcionario.foto_url} />;
  }

  // Apenas os empréstimos compartilhados com ESTE funcionário
  const emprestimos = await prisma.emprestimo.findMany({
    where: { funcionario_id: funcionario.id, status: "ativo" },
    include: {
      cliente: { select: { nome: true, telefone: true, cidade: true, endereco: true } },
      parcelas: { where: { status: "aberto" }, orderBy: { numero: "asc" } },
    },
  });

  const hoje = hojeEmBrasilia();
  const diasAtraso = (d: Date) => {
    const v = new Date(d);
    const vu = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
    return Math.floor((hoje.getTime() - vu) / 86_400_000);
  };

  const cards = emprestimos
    .map((e) => {
      const parcelas = e.parcelas.map((p) => ({
        id: p.id,
        numero: p.numero,
        valor: Number(p.valor),
        vencimento: p.data_vencimento,
        dias: diasAtraso(p.data_vencimento),
      }));
      return {
        id: e.id,
        cliente: e.cliente,
        podeWa: e.podeDispararWhatsapp,
        saldo: parcelas.reduce((a, p) => a + p.valor, 0),
        maiorAtraso: parcelas.reduce((m, p) => Math.max(m, p.dias), -9999),
        parcelas,
      };
    })
    .sort((a, b) => b.maiorAtraso - a.maiorAtraso);

  const atrasados = cards.filter((c) => c.maiorAtraso > 0).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {funcionario.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={funcionario.foto_url} alt={funcionario.nome} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center">
              {funcionario.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-black text-slate-900 leading-tight">{funcionario.nome}</p>
            <p className="text-xs text-slate-500">
              {cards.length} cobrança{cards.length === 1 ? "" : "s"} · {atrasados} em atraso
            </p>
          </div>
        </div>
        <BotaoSair />
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {cards.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
            Nenhuma cobrança compartilhada com você no momento.
          </div>
        )}

        {cards.map((c) => {
          const atrasado = c.maiorAtraso > 0;
          return (
            <div
              key={c.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${atrasado ? "border-rose-300" : "border-slate-200"}`}
            >
              <div className={`px-4 py-3 flex items-start justify-between gap-3 ${atrasado ? "bg-rose-50" : ""}`}>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{c.cliente.nome}</p>
                  <a href={`tel:${c.cliente.telefone}`} className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {c.cliente.telefone}
                  </a>
                  {(c.cliente.endereco || c.cliente.cidade) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {[c.cliente.endereco, c.cliente.cidade].filter(Boolean).join(" — ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo</p>
                  <p className="font-black text-slate-900">{brl(c.saldo)}</p>
                  {atrasado && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2 py-0.5 mt-1">
                      <AlertCircle className="w-3 h-3" /> {c.maiorAtraso}d em atraso
                    </span>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {c.parcelas.map((p) => (
                  <li key={p.id} className="px-4 py-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      {p.dias > 0 ? (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      ) : p.dias === 0 ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                      )}
                      Parcela {p.numero} · {data(p.vencimento)}
                    </span>
                    <span className={`font-bold ${p.dias > 0 ? "text-rose-600" : "text-slate-800"}`}>{brl(p.valor)}</span>
                  </li>
                ))}
              </ul>

              {c.podeWa && (
                <div className="px-4 py-3 border-t border-slate-100">
                  <BotaoCobrar emprestimoId={c.id} clienteNome={c.cliente.nome} />
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
