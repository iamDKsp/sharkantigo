"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Camera, Paperclip, Loader2 } from "lucide-react";
import { createCheque } from "@/app/cheques/actions";

interface ModalCadastrarChequeProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: any[];
  parceiros: any[];
}

export default function ModalCadastrarCheque({ isOpen, onClose, clientes, parceiros }: ModalCadastrarChequeProps) {
  const [selectedCliente, setSelectedCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selectedParceiro, setSelectedParceiro] = useState("");
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("");
  const [valorLiquido, setValorLiquido] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotoBase64, setFotoBase64] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Efeito para preencher o telefone e calcular o líquido automaticamente
  useEffect(() => {
    if (selectedCliente) {
      const cliente = clientes.find(c => c.id === selectedCliente);
      if (cliente) setTelefone(cliente.telefone || "");
    } else {
      setTelefone("");
    }
  }, [selectedCliente, clientes]);

  useEffect(() => {
    if (valor && taxa) {
      const v = parseFloat(valor);
      const t = parseFloat(taxa);
      if (!isNaN(v) && !isNaN(t)) {
        const liquido = v - (v * (t / 100));
        setValorLiquido(liquido.toFixed(2));
      }
    } else {
      setValorLiquido(valor || "");
    }
  }, [valor, taxa]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Converte para base64 com compressão bem básica usando canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setFotoBase64(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || !valor || !dataVencimento) {
      alert("Preencha todos os campos obrigatórios (*).");
      return;
    }
    
    setIsLoading(true);
    try {
      await createCheque({
        cliente_id: selectedCliente,
        parceiro_id: selectedParceiro || undefined,
        valor: parseFloat(valor),
        taxa_desconto: parseFloat(taxa || "0"),
        valor_liquido: parseFloat(valorLiquido || valor),
        data_compensacao: dataVencimento,
        observacoes,
        foto_url: fotoBase64 || undefined
      });
      onClose();
      // Reset form
      setSelectedCliente("");
      setSelectedParceiro("");
      setValor("");
      setTaxa("");
      setValorLiquido("");
      setDataVencimento("");
      setObservacoes("");
      setFotoBase64("");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar cheque.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Cadastrar cheque</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="cheque-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Nome do cliente *</label>
                <select
                  value={selectedCliente}
                  onChange={(e) => setSelectedCliente(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-900 cursor-pointer"
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Valor do cheque (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Taxa (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxa}
                  onChange={(e) => setTaxa(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Valor líquido pago</label>
                <input
                  type="text"
                  value={valorLiquido}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Data vencimento *</label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Parceiro (Opcional)</label>
                <select
                  value={selectedParceiro}
                  onChange={(e) => setSelectedParceiro(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 cursor-pointer"
                >
                  <option value="">Sem parceiro (Próprio)</option>
                  {parceiros.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 resize-none"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Foto do cheque</label>
                
                {fotoBase64 ? (
                  <div className="relative inline-block">
                    <img src={fotoBase64} alt="Preview" className="h-32 rounded-xl object-cover border border-emerald-200" />
                    <button type="button" onClick={() => setFotoBase64("")} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Galeria</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>Arquivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Webcam</span>
                    </button>
                    
                    {/* Inputs escondidos */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      ref={cameraInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cheque-form"
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isLoading ? "Salvando..." : "Salvar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
