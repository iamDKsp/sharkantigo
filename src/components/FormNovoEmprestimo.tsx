"use client";

import { createEmprestimo } from "@/app/emprestimos/novo/actions";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Calendar, User, Wallet, Settings, FileText, CheckCircle2, ChevronRight, Calculator } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

interface Parceiro {
  id: string;
  nome: string;
}

interface FormNovoEmprestimoProps {
  clientes: Cliente[];
  parceiros: Parceiro[];
  clienteIdParam?: string;
}

type TipoPagamento = 
  | "a_vista" 
  | "a_vista_juros" 
  | "juros_compostos" 
  | "parcelado" 
  | "juros_mensais" 
  | "parcela_juros_mes";

type Frequencia = "diario" | "semanal" | "quinzenal" | "mensal";

// Evita que 31/05 + 1 mês pule para Julho 01, travando no último dia do mês esperado (30/06).
const addMonthsCapped = (date: Date, months: number) => {
  const d = new Date(date.valueOf());
  const expectedMonth = (d.getMonth() + months) % 12;
  d.setMonth(d.getMonth() + months);
  if (d.getMonth() !== (expectedMonth < 0 ? expectedMonth + 12 : expectedMonth)) {
    d.setDate(0);
  }
  return d;
};

export default function FormNovoEmprestimo({ clientes, parceiros, clienteIdParam }: FormNovoEmprestimoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Overlay Animado States
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStep, setOverlayStep] = useState(0);

  // Inputs Comuns
  const [clienteId, setClienteId] = useState(clienteIdParam || "");
  const [parceiroId, setParceiroId] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>("a_vista_juros");
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [taxaJuros, setTaxaJuros] = useState<number>(30); // default 30%
  const [periodos, setPeriodos] = useState<number>(3); // parcelas ou meses
  const [dataInicio, setDataInicio] = useState("");
  const [vencimentoPrimeira, setVencimentoPrimeira] = useState("");
  const [categoria, setCategoria] = useState("Sem categoria");
  const [cobrarAtraso, setCobrarAtraso] = useState(true);
  const [jurosAtraso, setJurosAtraso] = useState<number>(2); // default 2%
  const [observacoes, setObservacoes] = useState("");

  // Inicializar datas padrão
  useEffect(() => {
    const hoje = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    setDataInicio(`${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`);

    const umMesDepois = addMonthsCapped(new Date(), 1);
    setVencimentoPrimeira(`${umMesDepois.getFullYear()}-${pad(umMesDepois.getMonth() + 1)}-${pad(umMesDepois.getDate())}`);
  }, []);

  // Recalcular Vencimento Primeira Parcela quando muda dataInicio ou frequencia
  useEffect(() => {
    if (!dataInicio) return;
    const [year, month, day] = dataInicio.split("-").map(Number);
    let start = new Date(year, month - 1, day, 12, 0, 0); // meio-dia para evitar fuso
    if (frequencia === "diario") start.setDate(start.getDate() + 1);
    else if (frequencia === "semanal") start.setDate(start.getDate() + 7);
    else if (frequencia === "quinzenal") start.setDate(start.getDate() + 15);
    else if (frequencia === "mensal") start = addMonthsCapped(start, 1);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    setVencimentoPrimeira(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
  }, [dataInicio, frequencia]);

  // Função utilitária para adicionar períodos
  const addPeriod = (dateStr: string, index: number) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    let d = new Date(year, month - 1, day, 12, 0, 0); // meio-dia para evitar fuso
    if (frequencia === "diario") {
      d.setDate(d.getDate() + index);
    } else if (frequencia === "semanal") {
      d.setDate(d.getDate() + index * 7);
    } else if (frequencia === "quinzenal") {
      d.setDate(d.getDate() + index * 15);
    } else if (frequencia === "mensal") {
      d = addMonthsCapped(d, index);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Gerar lista de parcelas simuladas
  const gerarParcelas = () => {
    if (valor <= 0 || !dataInicio) return [];
    const list: { numero: number; valor: number; data_vencimento: string }[] = [];

    if (tipoPagamento === "a_vista") {
      const venc = addPeriod(dataInicio, 1);
      list.push({ numero: 1, valor, data_vencimento: venc });
    } 
    else if (tipoPagamento === "a_vista_juros") {
      const venc = addPeriod(dataInicio, 1);
      const total = valor * (1 + taxaJuros / 100);
      list.push({ numero: 1, valor: Number(total.toFixed(2)), data_vencimento: venc });
    } 
    else if (tipoPagamento === "juros_compostos") {
      const venc = addPeriod(dataInicio, periodos);
      const total = valor * Math.pow(1 + taxaJuros / 100, periodos);
      list.push({ numero: 1, valor: Number(total.toFixed(2)), data_vencimento: venc });
    } 
    else if (tipoPagamento === "parcelado") {
      const total = valor * (1 + taxaJuros / 100);
      const valorParcela = Number((total / periodos).toFixed(2));
      for (let i = 0; i < periodos; i++) {
        list.push({
          numero: i + 1,
          valor: valorParcela,
          data_vencimento: addPeriod(vencimentoPrimeira, i),
        });
      }
    } 
    else if (tipoPagamento === "juros_mensais") {
      const valorJuros = Number((valor * (taxaJuros / 100)).toFixed(2));
      for (let i = 0; i < periodos; i++) {
        const isLast = i === periodos - 1;
        list.push({
          numero: i + 1,
          valor: isLast ? Number((valor + valorJuros).toFixed(2)) : valorJuros,
          data_vencimento: addPeriod(vencimentoPrimeira, i),
        });
      }
    } 
    else if (tipoPagamento === "parcela_juros_mes") {
      const valorParcela = Number(((valor / periodos) + (valor * (taxaJuros / 100))).toFixed(2));
      for (let i = 0; i < periodos; i++) {
        list.push({
          numero: i + 1,
          valor: valorParcela,
          data_vencimento: addPeriod(vencimentoPrimeira, i),
        });
      }
    }

    return list;
  };

  const parcelasSimuladas = gerarParcelas();

  // Obter data final de vencimento do empréstimo
  const dataVencimentoFinal = parcelasSimuladas.length > 0 
    ? parcelasSimuladas[parcelasSimuladas.length - 1].data_vencimento 
    : vencimentoPrimeira;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDataBr = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getDescricaoTipo = () => {
    switch (tipoPagamento) {
      case "a_vista":
        return "Pagamento único na data de vencimento. Ex: emprestou R$ 500 → recebe R$ 500. Sem juros e sem parcelas.";
      case "a_vista_juros":
        return "Pagamento único com juros simples. Ex: R$ 500 a 10% → recebe R$ 550 no vencimento. Quando usar: quer cobrar juros só no final.";
      case "juros_compostos":
        return "Juros compostos por período. Ex: R$ 200.000 a 10% por 3 meses → R$ 266.200 no vencimento. Quando usar: juros capitalizados a cada período.";
      case "parcelado":
        return "Parcelado em parcelas iguais (juros opcional). Ex: R$ 600 em 3x mensais. Quando usar: deseja receber em parcelas fixas.";
      case "juros_mensais":
        return "Juros por período + principal no final. Ex: R$ 200 a 10% → R$ 20 no 1º e 2º mês; no 3º mês R$ 220. Quando usar: quer receber juros mensais e o principal no final.";
      case "parcela_juros_mes":
        return "Parcela mensal com juros por mês embutido em todas as parcelas. Ex: R$ 1.000 a 10% por 10 meses → 10x de R$ 200. Quando usar: quer receber principal + juros todo mês.";
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tipoPagamento", tipoPagamento);
    formData.set("frequencia", frequencia);
    formData.set("categoria", categoria);
    formData.set("dataVencimento", dataVencimentoFinal);
    formData.set("parcelasJson", JSON.stringify(parcelasSimuladas));

    setShowOverlay(true);
    setOverlayStep(0); // Passo 1: Validando

    setTimeout(() => {
      setOverlayStep(1); // Passo 2: Calculando
      setTimeout(() => {
        setOverlayStep(2); // Passo 3: Finalizado
        setTimeout(() => {
          startTransition(async () => {
            try {
              const res = await createEmprestimo(formData);
              if (res && res.success && res.redirectUrl) {
                router.push(res.redirectUrl);
              } else {
                alert("Erro ao criar empréstimo.");
                setShowOverlay(false);
              }
            } catch (err) {
              console.error("Erro ao salvar empréstimo:", err);
              alert("Erro ao salvar empréstimo.");
              setShowOverlay(false);
            }
          });
        }, 800); // tempo que o check fica na tela
      }, 900); // tempo de calcular
    }, 700); // tempo de validar
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Voltar */}
      <Link
        href="/emprestimos"
        className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 dark:text-emerald-400 dark:hover:text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Empréstimos</span>
      </Link>

      <div>
        <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Novo empréstimo</h1>
        <p className="text-slate-500 dark:text-emerald-400/80">Configure os parâmetros do novo empréstimo em dinheiro.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* Seção 1: Cliente */}
        <div className="premium-card bg-white dark:bg-[#13221b] border border-slate-300 dark:border-emerald-900 shadow-md rounded-2xl relative transition-shadow hover:shadow-lg z-10">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl"></div>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Dados do Cliente</h2>
                <p className="text-sm text-slate-500 dark:text-emerald-500/80 mt-0.5">Vincule o empréstimo a uma pessoa e parceiro.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="clienteId" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Pessoa <span className="text-rose-500">*</span>
                </label>
                <div className="bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 hover:border-emerald-400 transition-colors">
                  <SearchableSelect
                    name="clienteId"
                    value={clienteId}
                    onChange={setClienteId}
                    options={clientes}
                    placeholder="Selecione uma pessoa..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="parceiroId" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Quem Emprestou? <span className="text-rose-500">*</span>
                </label>
                <select
                  id="parceiroId"
                  name="parceiroId"
                  value={parceiroId}
                  onChange={(e) => setParceiroId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white font-medium hover:border-emerald-400 transition-colors cursor-pointer"
                >
                  <option value="">Eu (Administrador)</option>
                  {parceiros.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Parceiro)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Valores e Modalidade */}
        <div className="premium-card bg-white dark:bg-[#13221b] border border-slate-300 dark:border-emerald-900 shadow-md rounded-2xl relative overflow-hidden transition-shadow hover:shadow-lg mt-6">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Valores e Modalidade</h2>
                <p className="text-sm text-slate-500 dark:text-emerald-500/80 mt-0.5">Defina o montante e a forma como será pago.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="valorEmprestado" className="text-sm font-black text-slate-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Valor Principal <span className="text-rose-500">*</span>
                </label>
                <div className="relative group max-w-sm">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$</span>
                  </div>
                  <input
                    type="number"
                    id="valorEmprestado"
                    name="valorEmprestado"
                    required
                    min="1"
                    step="any"
                    placeholder="0,00"
                    value={valor || ""}
                    onChange={(e) => setValor(Number(e.target.value))}
                    className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-500/50 dark:border-emerald-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 dark:focus:border-emerald-400 text-emerald-700 dark:text-[#84cc16] font-black transition-all shadow-sm placeholder:text-emerald-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Tipo de Pagamento <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "a_vista", label: "À Vista" },
                    { id: "a_vista_juros", label: "À Vista + Juros" },
                    { id: "juros_compostos", label: "Juros Compostos" },
                    { id: "parcelado", label: "Parcelado" },
                    { id: "juros_mensais", label: "Juros Mensais" },
                    { id: "parcela_juros_mes", label: "Parcela + Juros/Mês" },
                  ].map((tipo) => (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setTipoPagamento(tipo.id as TipoPagamento)}
                      className={`relative py-3.5 px-4 rounded-xl border text-sm font-bold transition-all text-center overflow-hidden flex items-center justify-center gap-2 ${
                        tipoPagamento === tipo.id
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-md transform scale-[1.02]"
                          : "bg-white dark:bg-[#0b130e] text-slate-600 dark:text-emerald-300 border-slate-800 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400"
                      }`}
                    >
                      {tipoPagamento === tipo.id && <CheckCircle2 className="w-4 h-4 absolute left-3 opacity-50" />}
                      {tipo.label}
                    </button>
                  ))}
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-start gap-3 mt-2">
                  <Calculator className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300/80 font-medium leading-relaxed">
                    {getDescricaoTipo()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Categoria da Operação
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    "Sem categoria",
                    "Educação",
                    "Emergência",
                    "Família",
                    "Pessoal",
                    "Trabalho",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoria(cat)}
                      className={`py-2 px-4 rounded-full border text-sm font-bold transition-all ${
                        categoria === cat
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm transform scale-[1.05]"
                          : "bg-white dark:bg-[#0b130e] text-slate-600 dark:text-emerald-400 border-slate-800 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/20"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3: Datas e Detalhes */}
        <div className="premium-card bg-white dark:bg-[#13221b] border border-slate-300 dark:border-emerald-900 shadow-md rounded-2xl relative overflow-hidden transition-shadow hover:shadow-lg mt-6">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Datas e Detalhes</h2>
                <p className="text-sm text-slate-500 dark:text-emerald-500/80 mt-0.5">Determine os juros e os prazos.</p>
              </div>
            </div>

            {/* Dinâmico: Mostrar Vencimento Calculado Simples */}
            {(tipoPagamento === "a_vista" || tipoPagamento === "a_vista_juros") && (
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-sm mb-6 shadow-sm">
                <span className="text-amber-800 dark:text-amber-500 font-bold">Vencimento calculado automaticamente:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{formatDataBr(dataVencimentoFinal)}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Taxa de Juros */}
              {tipoPagamento !== "a_vista" && (
                <div className="space-y-2 col-span-1">
                  <label htmlFor="taxaJuros" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    {tipoPagamento === "juros_compostos" || tipoPagamento === "juros_mensais" || tipoPagamento === "parcela_juros_mes"
                      ? "Taxa de Juros por Período (%) *"
                      : "Taxa de Juros (%) - Opcional"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="taxaJuros"
                      name="taxaJuros"
                      required
                      min="0"
                      step="any"
                      value={taxaJuros}
                      onChange={(e) => setTaxaJuros(Number(e.target.value))}
                      placeholder="Ex: 5.5"
                      className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-900 dark:text-white font-semibold hover:border-amber-400 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
              )}

              {/* Número de parcelas */}
              {tipoPagamento !== "a_vista" && tipoPagamento !== "a_vista_juros" && (
                <div className="space-y-2 col-span-1">
                  <label htmlFor="periodos" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    {tipoPagamento === "juros_compostos"
                      ? "Número de Períodos *"
                      : tipoPagamento === "juros_mensais"
                      ? "Número de Meses *"
                      : "Número de Parcelas *"}
                  </label>
                  <input
                    type="number"
                    id="periodos"
                    required
                    min="1"
                    max="120"
                    value={periodos}
                    onChange={(e) => setPeriodos(Number(e.target.value))}
                    placeholder="Ex: 12"
                    className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-900 dark:text-white font-semibold hover:border-amber-400 transition-colors"
                  />
                </div>
              )}

              {/* Data de Início */}
              <div className="space-y-2">
                <label htmlFor="dataInicio" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Data de Início <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id="dataInicio"
                  name="dataInicio"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-900 dark:text-white font-semibold hover:border-amber-400 transition-colors cursor-pointer"
                />
              </div>

              {/* Vencimento 1ª Parcela */}
              {tipoPagamento !== "a_vista" && tipoPagamento !== "a_vista_juros" && tipoPagamento !== "juros_compostos" && (
                <div className="space-y-2">
                  <label htmlFor="vencimentoPrimeira" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    Vencimento da 1ª Parcela <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="vencimentoPrimeira"
                    required
                    value={vencimentoPrimeira}
                    onChange={(e) => setVencimentoPrimeira(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-900 dark:text-white font-semibold hover:border-amber-400 transition-colors cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-slate-100 dark:border-emerald-900/30">
              <label className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                Frequência de Cobrança <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: "diario", label: "Diário" },
                  { id: "semanal", label: "Semanal" },
                  { id: "quinzenal", label: "Quinzenal" },
                  { id: "mensal", label: "Mensal" },
                ].map((freq) => (
                  <button
                    key={freq.id}
                    type="button"
                    onClick={() => setFrequencia(freq.id as Frequencia)}
                    className={`py-2.5 px-2 rounded-xl border text-sm font-bold transition-all text-center ${
                      frequencia === freq.id
                        ? "bg-amber-500 text-white border-amber-500 shadow-md"
                        : "bg-white dark:bg-[#0b130e] text-slate-600 dark:text-emerald-300 border-slate-800 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/40 hover:border-slate-400"
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 4: Configurações Avançadas */}
        <div className="premium-card bg-white dark:bg-[#13221b] border border-slate-300 dark:border-emerald-900 shadow-md rounded-2xl relative overflow-hidden transition-shadow hover:shadow-lg mt-6">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-400 dark:bg-emerald-800"></div>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-slate-100 dark:bg-emerald-950/40 rounded-xl">
                <Settings className="w-5 h-5 text-slate-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Opções Avançadas</h2>
                <p className="text-sm text-slate-500 dark:text-emerald-500/80 mt-0.5">Juros de atraso e anotações extras.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-[#0b130e] rounded-xl border border-slate-800 dark:border-emerald-900">
                <div className="mb-4 sm:mb-0">
                  <span className="block text-sm font-bold text-slate-800 dark:text-white">
                    Cobrar juros automáticos por atraso
                  </span>
                  <span className="text-sm text-slate-500 dark:text-emerald-500/80 mt-1 block">
                    Quando ativado, é acrescida uma porcentagem ao valor das parcelas em atraso.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={cobrarAtraso}
                    onChange={(e) => setCobrarAtraso(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-emerald-950 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {cobrarAtraso && (
                <div className="space-y-2 max-w-xs animate-fade-in pl-1">
                  <label htmlFor="taxaMulta" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    Juros por atraso (%) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="taxaMulta"
                      name="taxaMulta"
                      required
                      min="0"
                      step="any"
                      value={jurosAtraso}
                      onChange={(e) => setJurosAtraso(Number(e.target.value))}
                      placeholder="Ex: 2"
                      className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white font-semibold hover:border-emerald-400 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label htmlFor="observacoes" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Observações
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-4 text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Notas sobre o empréstimo..."
                    className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white font-medium hover:border-emerald-400 transition-colors resize-y"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Simulação de Parcelas */}
        {parcelasSimuladas.length > 0 && (
          <div className="premium-card p-0 bg-white dark:bg-[#13221b] border border-slate-300 dark:border-emerald-900 shadow-lg rounded-2xl relative overflow-hidden transition-all transform scale-[1.01] mt-10">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
            <div className="p-6 border-b border-slate-100 dark:border-emerald-950/50 flex justify-between items-center bg-slate-50/50 dark:bg-[#0f1c14]">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  Cronograma de Recebimentos Simulado
                </h3>
                <p className="text-sm text-slate-500 dark:text-emerald-500/70 mt-1">Veja a projeção antes de confirmar.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-emerald-400">
                <thead className="text-sm text-slate-400 dark:text-emerald-500/80 uppercase font-black tracking-widest border-b border-slate-100 dark:border-emerald-950 bg-slate-50/30 dark:bg-[#0b130e]">
                  <tr>
                    <th className="py-3 px-6 w-24 text-center">Nº</th>
                    <th className="py-3 px-6">Vencimento</th>
                    <th className="py-3 px-6 text-right">Valor da Parcela</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/40">
                  {parcelasSimuladas.map((p) => (
                    <tr key={p.numero} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group">
                      <td className="py-3.5 px-6 font-black text-slate-800 dark:text-white text-center">
                        {p.numero}
                      </td>
                      <td className="py-3.5 px-6 font-semibold flex items-center space-x-2 text-slate-600 dark:text-emerald-300">
                        <Calendar className="w-4 h-4 text-slate-300 dark:text-emerald-500/50 group-hover:text-emerald-500 transition-colors" />
                        <span>{formatDataBr(p.data_vencimento)}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatBRL(p.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totalizador */}
            <div className="flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-100 dark:border-emerald-900/50">
              <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">
                Total Estimado
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-[#84cc16]">
                {formatBRL(parcelasSimuladas.reduce((acc, p) => acc + p.valor, 0))}
              </span>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-end space-x-4 pt-6 mt-8 border-t border-slate-200 dark:border-emerald-950/50">
          <Link
            href="/emprestimos"
            className="px-6 py-3.5 bg-white dark:bg-[#13221b] text-slate-600 dark:text-emerald-400 border border-slate-800 dark:border-emerald-900/80 rounded-xl text-sm font-black tracking-wide hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-emerald-900 dark:hover:text-white transition-all shadow-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center space-x-2 bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-sm font-black tracking-wide hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:hover:shadow-none shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>{isPending ? "Processando..." : "Criar Empréstimo"}</span>
          </button>
        </div>
      </form>

      {/* Overlay Animado de Criação */}
      {showOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#13221b] p-8 rounded-3xl max-w-sm w-full mx-4 shadow-2xl border border-slate-200 dark:border-emerald-900/50 flex flex-col items-center justify-center space-y-6 text-center transform animate-in zoom-in-95 duration-300">
            {/* Ícone dinâmico dependendo do step */}
            <div className="relative flex items-center justify-center w-28 h-28 bg-emerald-50 dark:bg-emerald-950/40 rounded-full overflow-hidden">
               {overlayStep === 2 ? (
                 <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-300">
                   <CheckCircle2 className="w-16 h-16 text-emerald-500 drop-shadow-md" />
                 </div>
               ) : (
                 <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
               )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                {overlayStep === 0 && "Validando dados..."}
                {overlayStep === 1 && "Calculando parcelas..."}
                {overlayStep === 2 && "Contrato gerado!"}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-emerald-500/70">
                {overlayStep === 0 && "Verificando informações do cliente e parceiro."}
                {overlayStep === 1 && "Projetando recebimentos e juros."}
                {overlayStep === 2 && "Tudo pronto! Redirecionando..."}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-emerald-950/50 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-700 ease-in-out"
                 style={{ width: overlayStep === 0 ? "33%" : overlayStep === 1 ? "66%" : "100%" }}
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
