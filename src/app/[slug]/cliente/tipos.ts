import type { ModoBaixaFuncionario } from "@/lib/funcionarioSession";

export interface FuncionarioPerfil {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
  modo_baixa: ModoBaixaFuncionario;
  ocultar_telefone: boolean;
  pode_ver_documentos: boolean;
}

export interface ParcelaFuncionario {
  id: string;
  numero: number;
  valor: number;
  valor_pago: number | null;
  data_vencimento: string; // ISO
  data_pagamento: string | null; // ISO
  status: string;
  diasAtraso: number;
  jurosAtraso: number;
  cobradaHoje: boolean;
  ultimaCobranca: string | null;
  mensagem: string | null;
}

export interface RelatoFuncionario {
  id: string;
  emprestimo_id: string;
  tipo: string;
  texto: string;
  data_prometida: string | null; // YYYY-MM-DD
  criado_em: string; // ISO
}

export interface BaixaItemFuncionario {
  id: string;
  emprestimo_id: string;
  clienteNome: string;
  parcela_id: string | null;
  tipo: string;
  valor: number;
  juros_atraso: number;
  forma_pagamento: string;
  observacao: string | null;
  status: string; // pendente | aprovada | recusada | direta
  motivo_recusa: string | null;
  criado_em: string;
  decidido_em: string | null;
}

export interface EmprestimoFuncionarioCard {
  id: string;
  status: string;
  tipo_pagamento: string;
  frequencia: string;
  valor_emprestado: number;
  taxa_juros: number;
  atraso_tipo: string | null;
  atraso_valor: number | null;
  observacoes: string | null;
  data_prevista_pagamento: string | null; // YYYY-MM-DD
  podeDispararWhatsapp: boolean;
  isAVista: boolean;
  podeRenovar: boolean;
  valorJurosRenovacao: number;
  saldoAberto: number;
  totalJurosAtraso: number;
  totalPago: number;
  maiorAtraso: number;
  proximoVencimento: string | null;
  cobradoHoje: boolean;
  ultimaCobranca: string | null;
  mensagemPadrao: string;
  temBaixaPendente: boolean;
  cliente: {
    id: string;
    nome: string;
    telefone: string | null; // null quando ocultar_telefone = true
    cidade: string;
    endereco: string | null;
    referencia: string | null;
    quem_indicou: string | null;
    documento: string | null; // null quando pode_ver_documentos = false
    temDocumentos: boolean;
    foto_src: string | null;
  };
  parcelas: ParcelaFuncionario[];
  relatos: RelatoFuncionario[];
}
