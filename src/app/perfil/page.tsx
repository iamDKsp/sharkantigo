"use client";

import { useState, useEffect } from "react";
import { User, QrCode, CheckCircle2, AlertCircle, Loader2, LogOut, RefreshCw } from "lucide-react";

export default function PerfilPage() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "qr" | "connected">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPollingQr, setIsPollingQr] = useState(false);

  // Poll status from the companion service
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatus(data.status || "disconnected");
      setQrCode(data.qr || null);
      if (data.error) setErrorMessage(`${data.error} (${data.url || ''})`);
      else setErrorMessage("");
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
  }, []);

  // Continuous polling while not connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status !== "connected") {
      interval = setInterval(fetchStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar/resetar o WhatsApp?")) return;
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfil</h1>
        <p className="text-slate-500">
          Gerencie suas informações de conta e conecte o WhatsApp para disparos de mensagens.
        </p>
      </div>

      {/* Card Info Perfil */}
      <div className="premium-card p-6 bg-white space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Administrador</h2>
            <p className="text-sm text-slate-500">admin@solucoesfinanceiras.com.br</p>
          </div>
        </div>
      </div>

      {/* Card WhatsApp Connection */}
      <div className="premium-card p-6 bg-white space-y-6 border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-md font-bold text-slate-900 flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>Conexão WhatsApp (Disparador)</span>
          </h3>
          
          {/* Status Badge */}
          {status === "connected" && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conectado</span>
            </span>
          )}
          {status === "connecting" && !qrCode && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Conectando...</span>
            </span>
          )}
          {(status === "qr" || qrCode) && status !== "connected" && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Aguardando Leitura QR</span>
            </span>
          )}
          {status === "disconnected" && !qrCode && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Desconectado</span>
            </span>
          )}
        </div>

        {/* Content depending on status */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-8 space-y-2">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <span className="text-sm text-slate-500">Verificando serviço do WhatsApp...</span>
            </div>
          ) : (
            <>
              {status === "connected" && (
                <div className="text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Seu WhatsApp está vinculado!</p>
                    <p className="text-sm text-slate-500">
                      O sistema está pronto para realizar disparos automáticos em massa e individuais.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="flex items-center justify-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-bold transition-all mx-auto cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isDisconnecting ? "Desconectando..." : "Desconectar WhatsApp"}</span>
                  </button>
                </div>
              )}

              {/* Show QR code if present and not connected */}
              {qrCode && status !== "connected" && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-slate-700 font-bold max-w-xs mx-auto">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados &gt; Conectar um Aparelho e aponte a câmera para o QR Code abaixo:
                  </p>
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 inline-block">
                    <img src={qrCode} alt="WhatsApp QR Code Connection" className="w-56 h-56" />
                  </div>
                  <p className="text-sm text-slate-400 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aguardando leitura do QR Code...</span>
                  </p>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
                  >
                    {isDisconnecting ? "Resetando..." : "Resetar Sessão / Gerar Novo QR Code"}
                  </button>
                </div>
              )}

              {/* Show Connecting state ONLY if no QR code is available */}
              {status === "connecting" && !qrCode && (
                <div className="text-center py-8 space-y-4">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Autenticando sessão...</p>
                    <p className="text-sm text-slate-500">Isso pode levar alguns segundos.</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 underline block mx-auto cursor-pointer"
                  >
                    {isDisconnecting ? "Resetando..." : "Resetar Sessão Presa"}
                  </button>
                </div>
              )}

              {/* Show Disconnected state if no QR code is available */}
              {status === "disconnected" && !qrCode && (
                <div className="text-center py-8 space-y-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Conexão Inativa</p>
                    <p className="text-sm text-slate-500">
                      O WhatsApp não está conectado no momento.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors mx-auto cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{isDisconnecting ? "Gerando..." : "Gerar QR Code / Reiniciar"}</span>
                  </button>
                  {errorMessage && (
                    <p className="text-xs text-red-500 font-mono mt-4">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seção Email (Bloqueado) */}
      <div className="premium-card p-6 bg-white space-y-4 border border-slate-100 opacity-90">
        <h3 className="text-md font-bold text-slate-900">Email da Conta</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Email de acesso</label>
            <input 
              type="email" 
              name="email"
              value="ronigabrieloscar@hotmail.com" 
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              disabled 
            />
            <p className="text-xs text-slate-500 mt-2 ml-1">
              O email de acesso não pode ser alterado por motivos de segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Seção Alterar Senha */}
      <div className="premium-card p-6 bg-white space-y-4 border border-slate-100">
        <h3 className="text-md font-bold text-slate-900">Alterar senha</h3>
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
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Nova senha</label>
            <input 
              type="password" 
              name="password"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Confirmar senha</label>
            <input 
              type="password" 
              name="confirmPassword"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required 
            />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer">
            Atualizar senha
          </button>
        </form>
      </div>
    </div>
  );
}
