"use client";

import { updateCliente } from "./actions";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  X, 
  Image as ImageIcon, 
  Paperclip, 
  Camera, 
  Loader2 
} from "lucide-react";
import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  documento: string;
  endereco: string | null;
  referencia: string | null;
  quem_indicou: string | null;
  email: string | null;
  observacoes: string | null;
  blacklist: boolean;
  foto_url: string | null;
  documentos_urls: string | null;
}

interface FormEditarClienteProps {
  cliente: Cliente;
}

export default function FormEditarCliente({ cliente }: FormEditarClienteProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Foto de Perfil
  const [fotoPreview, setFotoPreview] = useState<string | null>(cliente.foto_url);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [removeFoto, setRemoveFoto] = useState(false);

  // Documentos Mantidos (antigos)
  let documentosIniciais: string[] = [];
  if (cliente.documentos_urls) {
    try {
      documentosIniciais = JSON.parse(cliente.documentos_urls);
      if (!Array.isArray(documentosIniciais)) documentosIniciais = [];
    } catch {
      documentosIniciais = [];
    }
  }
  const [documentosMantidos, setDocumentosMantidos] = useState<string[]>(documentosIniciais);

  // Novos Documentos Selecionados
  const [novosDocumentos, setNovosDocumentos] = useState<{ id: string; base64: string; preview: string }[]>([]);

  // Referências para inputs de arquivos ocultos
  const fileInputFotoRef = useRef<HTMLInputElement>(null);
  const fileInputFotoAllRef = useRef<HTMLInputElement>(null);

  const fileInputDocsRef = useRef<HTMLInputElement>(null);
  const fileInputDocsAllRef = useRef<HTMLInputElement>(null);

  // Estado da Webcam Modal
  const [webcamTarget, setWebcamTarget] = useState<"foto" | "documento" | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Helper Compressão Base64 ---
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return reject();
        const dataUrl = e.target.result as string;
        
        if (file.type === "application/pdf") {
          return resolve(dataUrl);
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // --- Handlers de Foto ---
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRemoveFoto(false);
      try {
        const base64 = await fileToBase64(file);
        setFotoBase64(base64);
        setFotoPreview(base64);
      } catch (err) {
        console.error("Erro ao converter foto:", err);
      }
    }
  };

  const triggerFotoSelect = (acceptAll = false) => {
    if (acceptAll) {
      fileInputFotoAllRef.current?.click();
    } else {
      fileInputFotoRef.current?.click();
    }
  };

  // --- Handlers de Documentos ---
  const handleDocsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const novos = Array.from(files);
      const newDocsArray: { id: string; base64: string; preview: string }[] = [];
      
      for (const file of novos) {
        const id = Math.random().toString(36).substring(2, 9);
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        let preview = "";
        let base64 = "";
        
        try {
          base64 = await fileToBase64(file);
          preview = isPdf ? "pdf" : base64;
          newDocsArray.push({ id, base64, preview });
        } catch (err) {
          console.error("Erro ao converter documento:", err);
        }
      }
      setNovosDocumentos((prev) => [...prev, ...newDocsArray]);
    }
  };

  const triggerDocsSelect = (acceptAll = false) => {
    if (acceptAll) {
      fileInputDocsAllRef.current?.click();
    } else {
      fileInputDocsRef.current?.click();
    }
  };

  const removeNovoDoc = (id: string) => {
    setNovosDocumentos((prev) => prev.filter((doc) => doc.id !== id));
  };

  const removeMantidoDoc = (url: string) => {
    setDocumentosMantidos((prev) => prev.filter((d) => d !== url));
  };

  // --- Webcam Capture ---
  const startWebcam = async (target: "foto" | "documento") => {
    setWebcamTarget(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setWebcamTarget(null);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
    }
    setWebcamStream(null);
    setWebcamTarget(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const MAX_SIZE = 800;
      let width = canvas.width;
      let height = canvas.height;
      
      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
      
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const base64 = finalCanvas.toDataURL("image/jpeg", 0.7);
        
        if (webcamTarget === "foto") {
          setRemoveFoto(false);
          setFotoBase64(base64);
          setFotoPreview(base64);
        } else if (webcamTarget === "documento") {
          setNovosDocumentos((prev) => [
            ...prev,
            { id: Math.random().toString(36).substring(2, 9), base64, preview: base64 },
          ]);
        }
        stopWebcam();
      }
    }
  };

  // --- Submit ---
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    formData.set("id", cliente.id);
    if (removeFoto) {
      formData.set("removeFoto", "true");
    }
    formData.set("documentosMantidos", JSON.stringify(documentosMantidos));

    if (fotoBase64) {
      formData.set("fotoBase64", fotoBase64);
    }

    if (novosDocumentos.length > 0) {
      const docsBase64 = novosDocumentos.map(d => d.base64);
      formData.set("documentosBase64", JSON.stringify(docsBase64));
    }

    startTransition(async () => {
      try {
        const res = await updateCliente(formData);
        if (res && res.success && res.redirectUrl) {
          router.push(res.redirectUrl);
        } else {
          alert("Erro ao salvar alterações.");
        }
      } catch (err) {
        console.error("Erro ao atualizar cliente:", err);
        alert("Erro ao salvar alterações.");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Voltar */}
      <Link
        href={`/clientes/${cliente.id}`}
        className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 dark:text-emerald-400 dark:hover:text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Detalhes</span>
      </Link>

      <div>
        <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Editar cliente</h1>
        <p className="text-slate-500 dark:text-emerald-400/80">Altere os dados cadastrais deste cliente.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados pessoais */}
        <div className="premium-card p-6 space-y-4 bg-white dark:bg-[#13221b]">
          <h2 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-emerald-950 pb-2">
            Dados pessoais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="nome" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Nome completo *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                required
                defaultValue={cliente.nome}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label htmlFor="telefone" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Telefone (WhatsApp) *
              </label>
              <input
                type="text"
                id="telefone"
                name="telefone"
                required
                defaultValue={cliente.telefone}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1.5">
              <label htmlFor="cidade" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Cidade
              </label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                defaultValue={cliente.cidade}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Quem indicou */}
            <div className="space-y-1.5">
              <label htmlFor="quemIndicou" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Quem indicou
              </label>
              <input
                type="text"
                id="quemIndicou"
                name="quemIndicou"
                defaultValue={cliente.quem_indicou || ""}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* CPF / RG */}
            <div className="space-y-1.5">
              <label htmlFor="documento" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                CPF / RG
              </label>
              <input
                type="text"
                id="documento"
                name="documento"
                defaultValue={cliente.documento}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <label htmlFor="endereco" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Endereço
              </label>
              <input
                type="text"
                id="endereco"
                name="endereco"
                defaultValue={cliente.endereco || ""}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Referência */}
            <div className="space-y-1.5">
              <label htmlFor="referencia" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Referência
              </label>
              <input
                type="text"
                id="referencia"
                name="referencia"
                defaultValue={cliente.referencia || ""}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={cliente.email || ""}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Observações */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label htmlFor="observacoes" className="text-sm font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                Observações
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={3}
                defaultValue={cliente.observacoes || ""}
                className="w-full bg-slate-50 dark:bg-[#0b130e] border border-slate-800 dark:border-emerald-900/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Lista Negra */}
            <div className="flex items-center space-x-2.5 col-span-1 md:col-span-2 pt-2">
              <input
                type="checkbox"
                id="blacklist"
                name="blacklist"
                value="true"
                defaultChecked={cliente.blacklist}
                className="w-4.5 h-4.5 accent-red-650"
              />
              <label htmlFor="blacklist" className="text-sm font-bold text-red-500 uppercase tracking-wider cursor-pointer">
                Adicionar à Lista Negra (Bloqueado)
              </label>
            </div>
          </div>
        </div>

        {/* Foto do cliente */}
        <div className="premium-card p-6 space-y-4 bg-white dark:bg-[#13221b]">
          <div>
            <h2 className="text-md font-bold text-slate-900 dark:text-white">Foto do cliente</h2>
            <p className="text-sm text-slate-400 dark:text-emerald-500 mt-0.5">
              Tire uma foto ou selecione da galeria.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => triggerFotoSelect(false)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Galeria</span>
            </button>
            <button
              type="button"
              onClick={() => triggerFotoSelect(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Arquivo</span>
            </button>
            <button
              type="button"
              onClick={() => startWebcam("foto")}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>
          </div>

          {/* Input oculto de foto */}
          <input
            type="file"
            ref={fileInputFotoRef}
            onChange={handleFotoChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputFotoAllRef}
            onChange={handleFotoChange}
            className="hidden"
          />

          {fotoPreview && (
            <div className="relative w-44 aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-emerald-800 shadow-sm mt-2">
              <img
                src={fotoPreview}
                alt="Foto do cliente"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setFotoPreview(null);
                  setFotoFile(null);
                  setRemoveFoto(true);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-650 transition-colors shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Documentos */}
        <div className="premium-card p-6 space-y-4 bg-white dark:bg-[#13221b]">
          <div>
            <h2 className="text-md font-bold text-slate-900 dark:text-white">Documentos (RG, CPF, comprovantes...)</h2>
            <p className="text-sm text-slate-400 dark:text-emerald-500 mt-0.5">
              Aceita imagens (JPG/PNG) e PDFs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => triggerDocsSelect(false)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Galeria</span>
            </button>
            <button
              type="button"
              onClick={() => triggerDocsSelect(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Arquivo</span>
            </button>
            <button
              type="button"
              onClick={() => startWebcam("documento")}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>
          </div>

          {/* Inputs ocultos de documentos */}
          <input
            type="file"
            ref={fileInputDocsRef}
            onChange={handleDocsChange}
            accept="image/*"
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputDocsAllRef}
            onChange={handleDocsChange}
            multiple
            className="hidden"
          />

          {/* Visualização de Documentos */}
          {(documentosMantidos.length > 0 || novosDocumentos.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {/* Documentos Mantidos (Já existentes) */}
              {documentosMantidos.map((url, idx) => {
                const isPdf = url.toLowerCase().endsWith(".pdf");
                return (
                  <div key={`old-${idx}`} className="relative group border border-slate-200 dark:border-emerald-950 rounded-xl overflow-hidden aspect-video sm:aspect-square flex items-center justify-center bg-slate-50 dark:bg-[#0b130e]">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-red-500 font-bold">PDF</span>
                        <span className="text-sm text-slate-400 mt-1 truncate max-w-full">Documento</span>
                      </div>
                    ) : (
                      <img src={url} alt="Documento" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMantidoDoc(url)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-650 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Novos Documentos adicionados */}
              {novosDocumentos.map((doc) => {
                const isPdf = doc.preview === "pdf";
                return (
                  <div key={doc.id} className="relative group border border-emerald-500/30 rounded-xl overflow-hidden aspect-video sm:aspect-square flex items-center justify-center bg-slate-50 dark:bg-[#0b130e]">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-red-500 font-bold">PDF</span>
                        <span className="text-sm text-emerald-500 mt-1 font-semibold">Novo</span>
                      </div>
                    ) : (
                      <img src={doc.preview} alt="Novo Documento" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                      Novo
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNovoDoc(doc.id, doc.preview)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-650 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end space-x-3">
          <Link
            href={`/clientes/${cliente.id}`}
            className="px-5 py-2.5 bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-400 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center space-x-1.5 bg-[#064e3b] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-850 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isPending ? "Salvando..." : "Salvar alterações"}</span>
          </button>
        </div>
      </form>

      {/* Modal da Webcam */}
      {webcamTarget !== null && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Capturar foto com a câmera</h3>
              <button onClick={stopWebcam} className="p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative aspect-video sm:aspect-square bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 flex items-center justify-between bg-slate-900 border-t border-slate-800">
              <button
                type="button"
                onClick={stopWebcam}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center space-x-1"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
