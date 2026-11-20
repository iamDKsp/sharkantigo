"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  PhoneOff,
  Save,
  Shield,
  Trash2,
  Wallet,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import type { ModoBaixaFuncionario } from "@/lib/funcionarioSession";
import {
  criarFuncionario,
  editarFuncionario,
  excluirFuncionario,
} from "./actions";

interface FuncionarioInicial {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  foto_url: string | null;
  modo_baixa: ModoBaixaFuncionario;
  ocultar_telefone: boolean;
  pode_ver_documentos: boolean;
}

const inputCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all";

function gerarSlug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Comprime a imagem escolhida para JPEG leve (~280x280) em base64 para não pesar o banco. */
function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const size = 280;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível."));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function FormFuncionario({
  inicial,
}: {
  inicial?: FuncionarioInicial;
}) {
  const router = useRouter();
  const isEdicao = Boolean(inicial);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(isEdicao);
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string>(inicial?.foto_url ?? "");
  const [modoBaixa, setModoBaixa] = useState<ModoBaixaFuncionario>(
    inicial?.modo_baixa ?? "aprovacao"
  );
  const [ocultarTelefone, setOcultarTelefone] = useState(
    inicial?.ocultar_telefone ?? false
  );
  const [podeVerDocumentos, setPodeVerDocumentos] = useState(
    inicial?.pode_ver_documentos ?? false
  );
  const [erro, setErro] = useState<string | null>(null);

  const handleNomeChange = (valor: string) => {
    setNome(valor);
    if (!slugManual) {
      setSlug(gerarSlug(valor));
    }
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await comprimirFoto(file);
      setFotoUrl(dataUrl);
    } catch (err: any) {
      setErro(err?.message || "Não foi possível carregar a foto.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    startTransition(async () => {
      try {
        if (isEdicao && inicial) {
          const r = await editarFuncionario(inicial.id, {
            nome,
            slug,
            novaSenha: senha || undefined,
            telefone,
            fotoUrl: fotoUrl || null,
            modoBaixa,
            ocultarTelefone,
            podeVerDocumentos,
          });
          if (!r.ok) {
            setErro(r.erro);
            return;
          }
          router.push(`/configuracoes/funcionarios/${inicial.id}`);
          router.refresh();
        } else {
          const r = await criarFuncionario({
            nome,
            slug,
            senha,
            telefone,
            fotoUrl,
            modoBaixa,
            ocultarTelefone,
            podeVerDocumentos,
          });
          if (!r.ok) {
            setErro(r.erro);
            return;
          }
          router.push("/configuracoes/funcionarios");
          router.refresh();
        }
      } catch (err: any) {
        setErro(err?.message || "Erro ao salvar funcionário.");
      }
    });
  };

  const handleExcluir = () => {
    if (!inicial) return;
    const ok = confirm(
      `Excluir o funcionário "${inicial.nome}"?\n\nOs empréstimos vinculados a ele NÃO serão apagados — eles voltarão para o ADM.`
    );
    if (!ok) return;
    startTransition(async () => {
      await excluirFuncionario(inicial.id);
      router.push("/configuracoes/funcionarios");
      router.refresh();
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 motion-page-enter">
      <Link
        href={isEdicao && inicial ? `/configuracoes/funcionarios/${inicial.id}` : "/configuracoes/funcionarios"}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        {isEdicao ? "Voltar para o funcionário" : "Funcionários"}
      </Link>

      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isEdicao ? `Editar ${inicial?.nome}` : "Novo Funcionário"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure dados de acesso, foto e exatamente o que este cobrador pode ver e fazer.
        </p>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl px-4 py-3">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Foto + Dados Básicos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-slate-100">
            <div className="relative">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt={nome || "Foto"}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-2xl font-black flex items-center justify-center shadow-sm">
                  {(nome || "F").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5">
                <Tooltip content="Enviar ou trocar foto">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="btn-press p-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white shadow-md cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFoto}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left space-y-1">
              <p className="text-sm font-black text-slate-800">Foto do Funcionário</p>
              <p className="text-xs text-slate-500">
                Aparece na tela de login dele e nos selos da lista de Cobranças.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg cursor-pointer"
                >
                  {fotoUrl ? "Trocar foto" : "Enviar foto"}
                </button>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl("")}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Nome *
              </span>
              <input
                required
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: João Silva"
                className={inputCls}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Telefone / WhatsApp (opcional)
              </span>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className={inputCls}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Link de Acesso (slug) *
              </span>
              <input
                required
                pattern="[a-z0-9-]{3,40}"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="ex: joao"
                className={inputCls}
              />
              <span className="text-[11px] text-slate-400 block">
                Endereço: <strong className="text-emerald-700">/{slug || "slug"}/cliente</strong>
              </span>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                {isEdicao ? "Nova Senha (deixe em branco p/ manter)" : "Senha de Acesso *"}
              </span>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  required={!isEdicao}
                  minLength={senha ? 4 : undefined}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={isEdicao ? "•••••• (opcional)" : "Mínimo 4 caracteres"}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
          </div>
        </div>

        {/* Permissões */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">Permissões e Segurança</h2>
          </div>

          {/* Modo de Baixa */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              Registro de Pagamentos / Baixas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: "aprovacao",
                    titulo: "Com Aprovação",
                    desc: "Ele informa o recebimento e você aprova em 1 clique no painel.",
                  },
                  {
                    id: "direto",
                    titulo: "Baixa Direta",
                    desc: "Já dá baixa na hora e registra no extrato de prestação de contas.",
                  },
                  {
                    id: "nenhum",
                    titulo: "Não Pode Baixar",
                    desc: "Apenas cobra e registra relatos/promessas. Só o ADM dá baixa.",
                  },
                ] as const
              ).map((opt) => {
                const sel = modoBaixa === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setModoBaixa(opt.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      sel
                        ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black ${sel ? "text-emerald-900" : "text-slate-800"}`}>
                        {opt.titulo}
                      </span>
                      {sel && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacidade e Documentos */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
              <div className="flex items-start gap-2.5">
                <PhoneOff className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    Ocultar telefone dos clientes
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Esconde o número e bloqueia ligação/WhatsApp pessoal (ele só cobra pelo WhatsApp do sistema).
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={ocultarTelefone}
                onChange={(e) => setOcultarTelefone(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    Permitir ver CPF e documentos anexados
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Libera visualização do CPF/RG e fotos dos documentos dos clientes da carteira dele.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={podeVerDocumentos}
                onChange={(e) => setPodeVerDocumentos(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {isEdicao ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleExcluir}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Excluir Funcionário
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? "Salvando..." : isEdicao ? "Salvar Alterações" : "Cadastrar Funcionário"}
          </button>
        </div>
      </form>
    </div>
  );
}
