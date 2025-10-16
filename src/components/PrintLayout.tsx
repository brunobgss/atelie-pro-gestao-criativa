import React from 'react';

interface PrintLayoutProps {
  title: string;
  children: React.ReactNode;
  onPrint?: () => void;
  onDownload?: () => void;
}

export default function PrintLayout({ title, children, onPrint, onDownload }: PrintLayoutProps) {
  const handlePrint = () => {
    // Criar uma nova janela com o conteúdo formatado para impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 20px;
              }
              
              .print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
              }
              
              .print-header h1 {
                font-size: 28px;
                color: #1e40af;
                margin-bottom: 10px;
                font-weight: bold;
              }
              
              .print-header .company-info {
                font-size: 14px;
                color: #6b7280;
                margin-top: 10px;
              }
              
              .print-content {
                max-width: 800px;
                margin: 0 auto;
              }
              
              .print-section {
                margin-bottom: 25px;
                page-break-inside: avoid;
              }
              
              .print-section h2 {
                font-size: 18px;
                color: #374151;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              
              .print-section h3 {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 10px;
                margin-top: 15px;
              }
              
              .print-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
              }
              
              .print-item {
                background: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                border-left: 4px solid #2563eb;
              }
              
              .print-item .label {
                font-weight: bold;
                color: #374151;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              
              .print-item .value {
                color: #1f2937;
                font-size: 14px;
              }
              
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              
              .print-table th {
                background: #f3f4f6;
                color: #374151;
                font-weight: bold;
                padding: 12px;
                text-align: left;
                border: 1px solid #d1d5db;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .print-table td {
                padding: 12px;
                border: 1px solid #d1d5db;
                font-size: 14px;
                color: #1f2937;
              }
              
              .print-table tr:nth-child(even) {
                background: #f9fafb;
              }
              
              .print-table tr:hover {
                background: #f3f4f6;
              }
              
              .print-total {
                background: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 16px;
              }
              
              .print-total td {
                color: white;
                border-color: #1e40af;
              }
              
              .print-footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              
              .print-instructions {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
              }
              
              .print-instructions h4 {
                color: #92400e;
                margin-bottom: 10px;
                font-size: 14px;
              }
              
              .print-instructions ul {
                margin-left: 20px;
                color: #92400e;
              }
              
              .print-instructions li {
                margin-bottom: 5px;
                font-size: 13px;
              }
              
              .print-status {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .status-pending {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #f59e0b;
              }
              
              .status-production {
                background: #dbeafe;
                color: #1e40af;
                border: 1px solid #3b82f6;
              }
              
              .status-ready {
                background: #d1fae5;
                color: #065f46;
                border: 1px solid #10b981;
              }
              
              .status-waiting {
                background: #f3e8ff;
                color: #7c3aed;
                border: 1px solid #8b5cf6;
              }
              
              @media print {
                body {
                  padding: 0;
                }
                
                .print-header {
                  margin-bottom: 20px;
                }
                
                .print-content {
                  max-width: none;
                }
                
                .print-section {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              <div class="print-header">
                <h1>${title}</h1>
                <div class="company-info">
                  <strong>Ateliê Pro - Sistema de Gestão</strong><br>
                  Sistema profissional para gestão de ateliês e confecções
                </div>
              </div>
              ${children}
              <div class="print-footer">
                <p>Documento gerado automaticamente pelo Ateliê Pro - ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Aguardar o conteúdo carregar e então imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownload = () => {
    // Mesma lógica do print, mas com foco em PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 20px;
              }
              
              .print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
              }
              
              .print-header h1 {
                font-size: 28px;
                color: #1e40af;
                margin-bottom: 10px;
                font-weight: bold;
              }
              
              .print-header .company-info {
                font-size: 14px;
                color: #6b7280;
                margin-top: 10px;
              }
              
              .print-content {
                max-width: 800px;
                margin: 0 auto;
              }
              
              .print-section {
                margin-bottom: 25px;
                page-break-inside: avoid;
              }
              
              .print-section h2 {
                font-size: 18px;
                color: #374151;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              
              .print-section h3 {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 10px;
                margin-top: 15px;
              }
              
              .print-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
              }
              
              .print-item {
                background: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                border-left: 4px solid #2563eb;
              }
              
              .print-item .label {
                font-weight: bold;
                color: #374151;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              
              .print-item .value {
                color: #1f2937;
                font-size: 14px;
              }
              
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              
              .print-table th {
                background: #f3f4f6;
                color: #374151;
                font-weight: bold;
                padding: 12px;
                text-align: left;
                border: 1px solid #d1d5db;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .print-table td {
                padding: 12px;
                border: 1px solid #d1d5db;
                font-size: 14px;
                color: #1f2937;
              }
              
              .print-table tr:nth-child(even) {
                background: #f9fafb;
              }
              
              .print-table tr:hover {
                background: #f3f4f6;
              }
              
              .print-total {
                background: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 16px;
              }
              
              .print-total td {
                color: white;
                border-color: #1e40af;
              }
              
              .print-footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              
              .print-instructions {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
              }
              
              .print-instructions h4 {
                color: #92400e;
                margin-bottom: 10px;
                font-size: 14px;
              }
              
              .print-instructions ul {
                margin-left: 20px;
                color: #92400e;
              }
              
              .print-instructions li {
                margin-bottom: 5px;
                font-size: 13px;
              }
              
              .print-status {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .status-pending {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #f59e0b;
              }
              
              .status-production {
                background: #dbeafe;
                color: #1e40af;
                border: 1px solid #3b82f6;
              }
              
              .status-ready {
                background: #d1fae5;
                color: #065f46;
                border: 1px solid #10b981;
              }
              
              .status-waiting {
                background: #f3e8ff;
                color: #7c3aed;
                border: 1px solid #8b5cf6;
              }
              
              @media print {
                body {
                  padding: 0;
                }
                
                .print-header {
                  margin-bottom: 20px;
                }
                
                .print-content {
                  max-width: none;
                }
                
                .print-section {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              <div class="print-header">
                <h1>${title}</h1>
                <div class="company-info">
                  <strong>Ateliê Pro - Sistema de Gestão</strong><br>
                  Sistema profissional para gestão de ateliês e confecções
                </div>
              </div>
              ${children}
              <div class="print-footer">
                <p>Documento gerado automaticamente pelo Ateliê Pro - ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Aguardar o conteúdo carregar e então imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="print-layout">
      <div className="print-preview border border-white/20 rounded-2xl p-8 bg-white/90 backdrop-blur-sm shadow-2xl animate-scale-in">
        {children}
      </div>
    </div>
  );
}
