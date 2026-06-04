"use client";

import { useState, useEffect } from "react";
import { User, QrCode, CheckCircle2, AlertCircle, Loader2, LogOut, RefreshCw } from "lucide-react";

export default function PerfilPage() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "qr" | "connected">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Poll status from the companion service
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatus(data.status || "disconnected");
      setQrCode(data.qr || null);
      if (data.error) setErrorMessage(`${data.error} (${data.url || ''})`);
    } catch (err: any) {
      console.error("WhatsApp companion service offline", err);
      setStatus("disconnected");
      setQrCode(null);
      setErrorMessage(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/logout", {
        method: "POST"
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error("Failed to disconnect", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Perfil Header */}
      <div>
        <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Perfil</h1>
        <p className="text-slate-500 dark:text-emerald-400/80">
          Gerencie suas informações de conta e conecte o WhatsApp para disparos de mensagens.
        </p>
      </div>

      {/* Card Info Perfil */}
      <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Administrador</h2>
            <p className="text-sm text-slate-500 dark:text-emerald-400/80">admin@solucoesfinanceiras.com.br</p>
          </div>
        </div>
      </div>

      {/* Card WhatsApp Connection */}
      <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-6 border border-slate-100 dark:border-emerald-950">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950/80 pb-3">
          <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Conexão WhatsApp (Disparador)</span>
          </h3>
          
          {/* Status Badge */}
          {status === "connected" && (
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-450 text-sm font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conectado</span>
            </span>
          )}
          {status === "connecting" && (
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-sm font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Conectando...</span>
            </span>
          )}
          {status === "qr" && (
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Aguardando Leitura QR</span>
            </span>
          )}
          {status === "disconnected" && (
            <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-sm font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Desconectado</span>
            </span>
          )}
        </div>

        {/* Content depending on status */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-8 space-y-2">
              <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <span className="text-sm text-slate-500">Verificando serviço do WhatsApp...</span>
            </div>
          ) : (
            <>
              {status === "connected" && (
                <div className="text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Seu WhatsApp está vinculado!</p>
                    <p className="text-sm text-slate-500 dark:text-emerald-400/80">
                      O sistema está pronto para realizar disparos automáticos em massa e individuais.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="flex items-center justify-center space-x-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-bold transition-all mx-auto"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isDisconnecting ? "Desconectando..." : "Desconectar WhatsApp"}</span>
                  </button>
                </div>
              )}

              {status === "qr" && qrCode && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-slate-650 dark:text-emerald-400 font-bold max-w-xs mx-auto">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados &gt; Conectar um Aparelho e aponte a câmera para o QR Code abaixo:
                  </p>
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 inline-block">
                    <img src={qrCode} alt="WhatsApp QR Code Connection" className="w-56 h-56" />
                  </div>
                  <p className="text-sm text-slate-400">O QR Code atualiza automaticamente.</p>
                </div>
              )}

              {status === "connecting" && (
                <div className="text-center py-8 space-y-2">
                  <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
                  <p className="text-sm font-bold">Autenticando sessão...</p>
                  <p className="text-sm text-slate-500">Isso pode levar alguns segundos.</p>
                </div>
              )}

              {status === "disconnected" && (
                <div className="text-center py-8 space-y-3 max-w-sm">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">O serviço local de WhatsApp está offline.</p>
                  <p className="text-sm text-slate-550 dark:text-emerald-400/80">
                    Certifique-se de que o companion runner está em execução ou reinicie as conexões locais.
                  </p>
                  {errorMessage && (
                    <p className="text-xs text-red-400 font-mono mt-2" id="whatsapp-error-msg">
                      {errorMessage}
                    </p>
                  )}
                  <button
                    onClick={fetchStatus}
                    className="flex items-center space-x-1.5 bg-emerald-50 text-[#064e3b] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250 dark:border-emerald-800/80 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verificar Conexão</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seção Email (Bloqueado) */}
      <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-4 border border-slate-100 dark:border-emerald-950 opacity-90">
        <h3 className="text-md font-bold text-slate-900 dark:text-white">Email da Conta</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-emerald-300 mb-1 ml-1">Email de acesso</label>
            <input 
              type="email" 
              name="email"
              value="ronigabrieloscar@hotmail.com" 
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-[#0b130e] border border-slate-200 dark:border-emerald-900/40 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
              disabled 
            />
            <p className="text-xs text-slate-500 mt-2 ml-1">
              O email de acesso não pode ser alterado por motivos de segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Seção Alterar Senha */}
      <div className="premium-card p-6 bg-white dark:bg-[#13221b] space-y-4 border border-slate-100 dark:border-emerald-950">
        <h3 className="text-md font-bold text-slate-900 dark:text-white">Alterar senha</h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const password = (form.elements.namedItem('password') as HTMLInputElement).value;
            const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
            
            if (password !== confirmPassword) {
              alert("As senhas não coincidem!");
              return;
            }
            if (password.length < 6) {
              alert("A senha deve ter pelo menos 6 caracteres.");
              return;
            }

            try {
              const res = await fetch('/api/perfil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
              });
              if (res.ok) {
                alert("Senha atualizada com sucesso!");
                form.reset();
              } else {
                alert("Erro ao atualizar senha.");
              }
            } catch (err) {
              alert("Erro ao atualizar senha.");
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-emerald-300 mb-1 ml-1">Nova senha</label>
            <input 
              type="password" 
              name="password"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1c14] border border-slate-200 dark:border-emerald-900/40 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-emerald-300 mb-1 ml-1">Confirmar senha</label>
            <input 
              type="password" 
              name="confirmPassword"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1c14] border border-slate-200 dark:border-emerald-900/40 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required 
            />
          </div>
          <button type="submit" className="bg-[#043e2f] hover:bg-[#065b45] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
            Atualizar senha
          </button>
        </form>
      </div>
    </div>
  );
}
