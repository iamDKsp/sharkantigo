"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ExportarEmprestimosButtonProps {
  emprestimos: any[];
}

export default function ExportarEmprestimosButton({ emprestimos }: ExportarEmprestimosButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      const rows = emprestimos.map(emp => {
        const principal = Number(emp.valor_emprestado) || 0;
        
        let totalEstimado = principal;
        if (emp.parcelas && emp.parcelas.length > 0) {
          totalEstimado = emp.parcelas.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
        } else {
          totalEstimado = principal * (1 + (Number(emp.taxa_juros) || 0) / 100);
        }

        const totalPago = emp.parcelas 
          ? emp.parcelas.reduce((acc: number, p: any) => acc + (p.valor_pago ? Number(p.valor_pago) : 0), 0) 
          : 0;
        
        const saldoDevedor = Math.max(0, totalEstimado - totalPago);

        const formatPhone = (phone: string) => {
          if (!phone) return "";
          const cleaned = phone.replace(/\D/g, "");
          if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
          } else if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
          } else if (cleaned.length === 12 || cleaned.length === 13) { // Com código do país
            const semDDI = cleaned.substring(cleaned.length === 13 ? 2 : 2); // Ex: 5514999... -> 14999...
             if(semDDI.length === 11) {
                 return `(${semDDI.substring(0, 2)}) ${semDDI.substring(2, 7)}-${semDDI.substring(7)}`;
             }
          }
          return phone;
        };

        const formatStatus = (status: string) => {
          if (!status) return "";
          return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        return {
          "ID Empréstimo": emp.id,
          "Nome do Cliente": emp.cliente?.nome || "",
          "Telefone do Cliente": formatPhone(emp.cliente?.telefone || ""),
          "Cidade do Cliente": emp.cliente?.cidade || "",
          "Valor Emprestado": principal,
          "Taxa Juros (%)": Number(emp.taxa_juros || 0) / 100, // Excel formata como porcentagem
          "Taxa Multa (%)": Number(emp.taxa_multa || 0) / 100,
          "Data de Vencimento": emp.data_vencimento ? new Date(emp.data_vencimento) : null,
          "Status": formatStatus(emp.status),
          "Tipo Pagamento": formatStatus(emp.tipo_pagamento),
          "Frequência": formatStatus(emp.frequencia),
          "Categoria": formatStatus(emp.categoria),
          "Parceiro": emp.parceiro?.nome || "Sem Parceiro",
          "Total Estimado": totalEstimado,
          "Total Pago": totalPago,
          "Saldo Devedor": saldoDevedor
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      
      const numFmtMoeda = '"R$" #,##0.00';
      const numFmtData = 'dd/mm/yyyy';
      const numFmtPorcentagem = '0.00%';

      // Aplica formatos numéricos nativos e de datas às células
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:P1');
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const formatCell = (colIdx: number, format: string, type: string) => {
          const cell = worksheet[XLSX.utils.encode_cell({r: R, c: colIdx})];
          if (cell && cell.t === type) cell.z = format;
        };

        formatCell(4, numFmtMoeda, 'n');         // E: Valor Emprestado
        formatCell(5, numFmtPorcentagem, 'n');   // F: Taxa Juros
        formatCell(6, numFmtPorcentagem, 'n');   // G: Taxa Multa
        formatCell(7, numFmtData, 'n');          // H: Data de Vencimento
        formatCell(13, numFmtMoeda, 'n');        // N: Total Estimado
        formatCell(14, numFmtMoeda, 'n');        // O: Total Pago
        formatCell(15, numFmtMoeda, 'n');        // P: Saldo Devedor
      }

      // Definir larguras de colunas automaticamente, o que evita o "########"
      worksheet['!cols'] = [
        { wch: 15 }, // ID
        { wch: 30 }, // Nome
        { wch: 18 }, // Telefone
        { wch: 20 }, // Cidade
        { wch: 20 }, // Valor Emprestado
        { wch: 15 }, // Taxa Juros
        { wch: 15 }, // Taxa Multa
        { wch: 20 }, // Data Vencimento
        { wch: 15 }, // Status
        { wch: 20 }, // Tipo Pagamento
        { wch: 15 }, // Frequência
        { wch: 20 }, // Categoria
        { wch: 20 }, // Parceiro
        { wch: 20 }, // Total Estimado
        { wch: 20 }, // Total Pago
        { wch: 20 }, // Saldo Devedor
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Emprestimos");
      
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `backup_emprestimos_${dateStr}.xlsx`);
      
    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      alert("Ocorreu um erro ao gerar o backup. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center space-x-1.5 bg-white dark:bg-[#13221b] text-slate-700 dark:text-emerald-400 border border-slate-200 dark:border-emerald-900/50 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-emerald-950/30 transition-colors shadow-sm disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      <span>{isExporting ? "Extraindo..." : "Extrair Backup (Excel)"}</span>
    </button>
  );
}
