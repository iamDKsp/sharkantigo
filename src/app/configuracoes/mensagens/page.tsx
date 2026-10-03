import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MENSAGENS } from "@/lib/mensagens/catalogo";
import {
  carregarConfiguracoes,
  carregarRespostasRapidas,
  carregarTemplates,
  resolverTemplateSync,
} from "@/lib/mensagens/servidor";
import EditorMensagens, { type MensagemEditavel } from "./EditorMensagens";

export const revalidate = 0;

export default async function ConfiguracoesMensagensPage() {
  const [templates, config, respostas] = await Promise.all([
    carregarTemplates(),
    carregarConfiguracoes(),
    carregarRespostasRapidas(),
  ]);

  const mensagens: MensagemEditavel[] = MENSAGENS.map((def) => {
    const r = resolverTemplateSync(def.chave, templates);
    return {
      chave: def.chave,
      grupo: def.grupo,
      titulo: def.titulo,
      descricao: def.descricao,
      textoPadrao: def.textoPadrao,
      variaveis: def.variaveis,
      padraoAtivo: def.padraoAtivo,
      podeDesativar: def.podeDesativar,
      texto: r.texto,
      ativo: r.ativo,
      personalizado: r.personalizado,
    };
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto px-1">
      <div>
        <Link
          href="/cobrancas"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Cobranças
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mensagens do WhatsApp</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Edite o texto de todas as mensagens que o sistema envia. As alterações valem para toda a base e são salvas no
          banco de dados.
        </p>
      </div>

      <EditorMensagens mensagens={mensagens} config={config} respostas={respostas} />
    </div>
  );
}
