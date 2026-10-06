"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Settings, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck
} from "lucide-react";
import { salvarConfiguracaoSistema, type ConfiguracoesSistema } from "./actions";

interface Props {
  initialConfig: ConfiguracoesSistema;
}

export default function ConfiguracoesView({ initialConfig }: Props) {
  const [config, setConfig] = useState<ConfiguracoesSistema>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const handleToggle = (chave: keyof ConfiguracoesSistema) => {
    const novoValor = !config[chave];
    setConfig((prev) => ({ ...prev, [chave]: novoValor }));
    setFeedback(null);

    startTransition(async () => {
      const res = await salvarConfiguracaoSistema(chave, novoValor);
      if (res.ok) {
        setFeedback({
          tipo: "sucesso",
          msg: `Configuração atualizada com sucesso!`,
        });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        // Reverte se falhou
        setConfig((prev) => ({ ...prev, [chave]: !novoValor }));
        setFeedback({
          tipo: "erro",
          msg: res.erro || "Falha ao salvar a configuração.",
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header com Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/perfil"
          className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Perfil</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h1>
          <p className="text-sm text-slate-500">
            Ajuste as preferências globais de renovação, reprogramação e mensagens.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-medium animate-in fade-in duration-200 ${
            feedback.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.tipo === "sucesso" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Seção 1: Automação e Mensagens WhatsApp */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          WhatsApp & Mensagens
        </h2>

        {/* Card Toggle: Perguntar envio de WhatsApp na renovação */}
        <div className="premium-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <MessageSquare className="w-4.5 h-4.5" />
                </span>
                <span className="font-bold text-slate-900 text-base">
                  Perguntar se deseja enviar WhatsApp ao renovar
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    config.perguntar_whatsapp_renovacao
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {config.perguntar_whatsapp_renovacao ? "Habilitado" : "Desabilitado (Padrão)"}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed pt-1">
                <strong>Quando desabilitado:</strong> Ao clicar em <em>"Receber só os juros (renovar +30d)"</em>, o sistema renova a parcela e envia a confirmação no WhatsApp automaticamente.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                <strong>Quando habilitado:</strong> O sistema exibirá um diálogo perguntando se você deseja ou não disparar o comprovante para o WhatsApp do cliente antes de concluir a renovação.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={config.perguntar_whatsapp_renovacao}
              onClick={() => handleToggle("perguntar_whatsapp_renovacao")}
              disabled={isPending}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 mt-1 ${
                config.perguntar_whatsapp_renovacao ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.perguntar_whatsapp_renovacao ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Link para modelos de mensagens */}
        <Link
          href="/configuracoes/mensagens"
          className="premium-card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-between hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Modelos de Mensagem do WhatsApp</p>
              <p className="text-xs text-slate-500">Personalize os textos automáticos, lembretes de cobrança e chaves Pix.</p>
            </div>
          </div>
          <span className="text-emerald-600 font-semibold text-xs uppercase tracking-wider">Acessar</span>
        </Link>
      </div>

      {/* Seção 2: Regras de Negócio e Vencimentos */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Datas e Reprogramação
        </h2>

        {/* Card Toggle: Preservar dia fixo de vencimento */}
        <div className="premium-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Calendar className="w-4.5 h-4.5" />
                </span>
                <span className="font-bold text-slate-900 text-base">
                  Preservar dia fixo de vencimento na reprogramação
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    config.preservar_dia_base_reprogramacao
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {config.preservar_dia_base_reprogramacao ? "Habilitado" : "Desabilitado (Padrão)"}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed pt-1">
                <strong>Quando desabilitado:</strong> A reprogramação altera em definitivo a data de vencimento do contrato para o novo dia selecionado.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                <strong>Quando habilitado:</strong> A reprogramação é tratada como um atraso pontual acordado. O dia-base original do contrato (ex: todo dia 03) é preservado, fazendo com que na próxima renovação de juros (+30d) o vencimento retorne automaticamente para o dia base no mês seguinte (ex: 03/11).
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={config.preservar_dia_base_reprogramacao}
              onClick={() => handleToggle("preservar_dia_base_reprogramacao")}
              disabled={isPending}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 mt-1 ${
                config.preservar_dia_base_reprogramacao ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.preservar_dia_base_reprogramacao ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
