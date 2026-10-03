"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  User, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  RefreshCw, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  Save 
} from "lucide-react";

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  criado_em?: string;
}

export default function PerfilPage() {
  // WhatsApp States
  const [status, setStatus] = useState<"disconnected" | "connecting" | "qr" | "connected">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Profile States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Password States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch logged user profile on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/perfil")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.user) {
          setProfile(data.user);
          setNome(data.user.nome || "");
          setEmail(data.user.email || "");
        }
      })
      .catch((err) => {
        console.error("Falha na requisição de perfil:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Poll status from the WhatsApp companion service
  const fetchStatus = useCallback(() => {
    fetch("/api/whatsapp/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status || "disconnected");
        setQrCode(data.qr || null);
        if (data.error) setErrorMessage(`${data.error} (${data.url || ''})`);
        else setErrorMessage("");
      })
      .catch((err: unknown) => {
        console.error("WhatsApp companion service offline", err);
        setStatus("disconnected");
        setQrCode(null);
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setErrorMessage(msg);
      })
      .finally(() => {
        setLoadingWhatsApp(false);
      });
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Continuous polling while not connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status !== "connected") {
      interval = setInterval(fetchStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, fetchStatus]);

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

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    setAccountFeedback(null);

    try {
      const res = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setProfile(data.user);
        setNome(data.user.nome);
        setEmail(data.user.email);
        setAccountFeedback({ type: "success", message: "Dados da conta atualizados com sucesso!" });
      } else {
        setAccountFeedback({ type: "error", message: data.error || "Erro ao atualizar dados da conta." });
      }
    } catch {
      setAccountFeedback({ type: "error", message: "Erro de conexão ao salvar dados." });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (password !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "As senhas não coincidem!" });
      return;
    }

    if (password.length < 6) {
      setPasswordFeedback({ type: "error", message: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordFeedback({ type: "success", message: "Senha atualizada com sucesso!" });
        setPassword("");
        setConfirmPassword("");
      } else {
        setPasswordFeedback({ type: "error", message: data.error || "Erro ao atualizar senha." });
      }
    } catch {
      setPasswordFeedback({ type: "error", message: "Erro ao atualizar senha." });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return "U";
    const parts = nameStr.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Perfil Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfil</h1>
        <p className="text-slate-500">
          Gerencie suas informações de conta, login desta base e conexão do WhatsApp.
        </p>
      </div>

      {/* Card Info Perfil Dinâmico */}
      <div className="premium-card p-6 bg-white space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl shadow-inner">
              {loadingProfile ? (
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
              ) : (
                <span>{getInitials(profile?.nome)}</span>
              )}
            </div>
            <div>
              {loadingProfile ? (
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-slate-200 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {profile?.nome || "Administrador"}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    {profile?.email || "Sem e-mail cadastrado"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Base Conectada</span>
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
          {loadingWhatsApp ? (
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

      {/* Seção Dados de Identificação e Login (Editável) */}
      <div className="premium-card p-6 bg-white space-y-4 border border-slate-100">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-md font-bold text-slate-900 flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-600" />
            <span>Dados da Conta & Login</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Personalize o nome e o e-mail que identificam o acesso a este sistema/base.
          </p>
        </div>

        {accountFeedback && (
          <div
            className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              accountFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {accountFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{accountFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">
              Nome do Responsável / Usuário
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Ronivaldo Gabriel"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Nome exibido no painel e na identificação deste usuário.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">
              E-mail de Acesso (Login)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Este é o e-mail utilizado para fazer login nesta base do sistema.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSavingAccount || loadingProfile}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSavingAccount ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Informações da Conta</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Seção Alterar Senha */}
      <div className="premium-card p-6 bg-white space-y-4 border border-slate-100">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-md font-bold text-slate-900 flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <span>Alterar Senha</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Defina uma nova senha para acessar esta base.
          </p>
        </div>

        {passwordFeedback && (
          <div
            className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              passwordFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {passwordFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Nova senha</label>
            <input 
              type="password" 
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Confirmar senha</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSavingPassword}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSavingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <span>Atualizar Senha</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
