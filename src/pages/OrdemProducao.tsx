import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Download, Package, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getOrderByCode } from "@/integrations/supabase/orders";
import { toast } from "sonner";
import PrintLayout from "@/components/PrintLayout";

// Função para formatar moeda
const formatCurrency = (value: number) => {
  try {
    // Verificar se o valor é válido
    if (value === null || value === undefined || isNaN(value)) {
      console.warn("formatCurrency: valor inválido:", value);
      return "R$ 0,00";
    }
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.warn("formatCurrency: conversão falhou:", value);
      return "R$ 0,00";
    }
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
    
    console.log("formatCurrency: input:", value, "output:", formatted);
    return formatted;
  } catch (error) {
    console.error("formatCurrency error:", error, "value:", value);
    return "R$ 0,00";
  }
};

export default function OrdemProducao() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Buscar dados do pedido
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderByCode(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando ordem de produção...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    console.error("Order is null or undefined");
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Pedido não encontrado</h2>
          <p className="text-gray-600 mb-4">O pedido solicitado não foi encontrado.</p>
          <Button onClick={() => navigate('/pedidos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Pedidos
          </Button>
        </div>
      </div>
    );
  }

  // Preparar dados seguros para evitar [object Object]
  const safeOrder = {
    code: String(order?.code || 'N/A'),
    type: String(order?.type || 'Não informado'),
    status: String(order?.status || 'Pendente'),
    customer_name: String(order?.customer_name || 'Cliente não informado'),
    customer_phone: String(order?.customer_phone || 'Não informado'),
    customer_email: String(order?.customer_email || 'Não informado'),
    description: String(order?.description || 'Sem descrição'),
    value: (() => {
      const val = order?.value;
      if (val === null || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    })(),
    paid: (() => {
      const val = order?.paid;
      if (val === null || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    })(),
    delivery_date: String(order?.delivery_date || 'Não definido'),
    observations: String(order?.observations || 'Sem observações'),
    file_url: String(order?.file_url || '')
  };

  console.log("=== ORDEM DE PRODUÇÃO - DADOS SEGUROS ===");
  console.log("Order original:", order);
  console.log("Order keys:", Object.keys(order || {}));
  console.log("Order value field:", order?.value, "type:", typeof order?.value);
  console.log("Order paid field:", order?.paid, "type:", typeof order?.paid);
  console.log("Safe Order:", safeOrder);
  console.log("Safe Order value:", safeOrder.value, "type:", typeof safeOrder.value);
  console.log("Safe Order paid:", safeOrder.paid, "type:", typeof safeOrder.paid);
  console.log("formatCurrency test:", formatCurrency(safeOrder.value));
  console.log("formatCurrency test paid:", formatCurrency(safeOrder.paid));

  // Função para gerar PDF (reutilizável)
  const generatePDF = () => {
    console.log("=== GERANDO PDF ORDEM DE PRODUÇÃO ===");
    console.log("Safe Order:", safeOrder);
    
    // Gerar HTML completo do PDF
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Produção - ${safeOrder.code}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white; 
              padding: 20px; 
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 20px; 
            }
            .header h1 { font-size: 28px; font-weight: bold; margin: 0; margin-bottom: 10px; color: #1e40af; }
            .header .subtitle { font-size: 16px; color: #6b7280; }
            .section { 
              margin-bottom: 30px; 
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .section h2 { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #1e40af; 
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .item { 
              display: flex; 
              flex-direction: column; 
            }
            .label { 
              font-size: 12px; 
              color: #6b7280; 
              font-weight: bold; 
              text-transform: uppercase; 
              margin-bottom: 5px; 
            }
            .value { 
              font-size: 16px; 
              color: #1f2937; 
              font-weight: 500; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #f3f4f6; 
              color: #374151; 
            }
            .logo-section { 
              text-align: center; 
              margin: 20px 0; 
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px dashed #d1d5db;
            }
            .logo-section img { 
              max-width: 300px; 
              max-height: 200px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .checklist { 
              background: #fef3c7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .checklist h3 { 
              margin-bottom: 15px; 
              color: #92400e; 
              font-size: 18px; 
            }
            .checklist ul { 
              list-style: none; 
              padding: 0; 
            }
            .checklist li { 
              margin-bottom: 10px; 
              display: flex; 
              align-items: center; 
              font-size: 14px;
            }
            .checklist li span { 
              color: #059669; 
              margin-right: 10px; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            @media print {
              body { padding: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ORDEM DE PRODUÇÃO</h1>
              <div class="subtitle">Código: ${safeOrder.code}</div>
              <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="section">
              <h2>📋 Informações do Pedido</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Código</div>
                  <div class="value">${safeOrder.code}</div>
                </div>
                <div class="item">
                  <div class="label">Tipo</div>
                  <div class="value">${safeOrder.type}</div>
                </div>
                <div class="item">
                  <div class="label">Status</div>
                  <div class="value">
                    <span class="status-badge">${safeOrder.status}</span>
                  </div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${safeOrder.delivery_date}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>👤 Informações do Cliente</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Nome</div>
                  <div class="value">${safeOrder.customer_name}</div>
                </div>
                <div class="item">
                  <div class="label">Telefone</div>
                  <div class="value">${safeOrder.customer_phone}</div>
                </div>
                <div class="item">
                  <div class="label">Email</div>
                  <div class="value">${safeOrder.customer_email}</div>
                </div>
              </div>
            </div>
            
            ${safeOrder.file_url ? `
            <div class="section">
              <h2>🎨 Logo/Arte do Pedido</h2>
              <div class="logo-section">
                <img src="${safeOrder.file_url}" alt="Logo/Arte do Pedido" />
                <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <h2>📦 Detalhes do Pedido</h2>
              <div class="item">
                <div class="label">Descrição</div>
                <div class="value">${safeOrder.description}</div>
              </div>
              <div class="grid">
                <div class="item">
                  <div class="label">Valor Total</div>
                  <div class="value"><strong style="color: #059669; font-size: 18px;">${formatCurrency(safeOrder.value)}</strong></div>
                </div>
                <div class="item">
                  <div class="label">Valor Pago</div>
                  <div class="value"><strong style="color: #2563eb; font-size: 18px;">${formatCurrency(safeOrder.paid)}</strong></div>
                </div>
              </div>
              ${safeOrder.observations && safeOrder.observations !== 'Sem observações' ? `
              <div class="item">
                <div class="label">Observações</div>
                <div class="value">${safeOrder.observations}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <h2>⚙️ Instruções de Produção</h2>
              <div class="checklist">
                <h3>Checklist de Produção</h3>
                <ul>
                  <li><span>✓</span> Verificar especificações técnicas antes de iniciar</li>
                  <li><span>✓</span> Confirmar materiais e insumos necessários</li>
                  <li><span>✓</span> Seguir cronograma de produção estabelecido</li>
                  <li><span>✓</span> Manter controle de qualidade durante o processo</li>
                  <li><span>✓</span> Comunicar eventuais problemas ou atrasos</li>
                  <li><span>✓</span> Finalizar com inspeção final de qualidade</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Abrir nova janela com o PDF
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfHtml);
      newWindow.document.close();
      
      // Aguardar carregamento
      newWindow.onload = () => {
        console.log("PDF carregado com sucesso!");
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

  // Função específica para imprimir (abre diálogo de impressão)
  const handlePrint = () => {
    console.log("=== IMPRIMINDO ORDEM DE PRODUÇÃO ===");
    console.log("Safe Order:", safeOrder);
    
    // Gerar HTML completo do PDF
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Produção - ${safeOrder.code}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white; 
              padding: 20px; 
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 20px; 
            }
            .header h1 { font-size: 28px; font-weight: bold; margin: 0; margin-bottom: 10px; color: #1e40af; }
            .header .subtitle { font-size: 16px; color: #6b7280; }
            .section { 
              margin-bottom: 30px; 
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .section h2 { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #1e40af; 
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .item { 
              display: flex; 
              flex-direction: column; 
            }
            .label { 
              font-size: 12px; 
              color: #6b7280; 
              font-weight: bold; 
              text-transform: uppercase; 
              margin-bottom: 5px; 
            }
            .value { 
              font-size: 16px; 
              color: #1f2937; 
              font-weight: 500; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #f3f4f6; 
              color: #374151; 
            }
            .logo-section { 
              text-align: center; 
              margin: 20px 0; 
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px dashed #d1d5db;
            }
            .logo-section img { 
              max-width: 300px; 
              max-height: 200px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .checklist { 
              background: #fef3c7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .checklist h3 { 
              margin-bottom: 15px; 
              color: #92400e; 
              font-size: 18px; 
            }
            .checklist ul { 
              list-style: none; 
              padding: 0; 
            }
            .checklist li { 
              margin-bottom: 10px; 
              display: flex; 
              align-items: center; 
              font-size: 14px;
            }
            .checklist li span { 
              color: #059669; 
              margin-right: 10px; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            @media print {
              body { padding: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ORDEM DE PRODUÇÃO</h1>
              <div class="subtitle">Código: ${safeOrder.code}</div>
              <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="section">
              <h2>📋 Informações do Pedido</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Código</div>
                  <div class="value">${safeOrder.code}</div>
                </div>
                <div class="item">
                  <div class="label">Tipo</div>
                  <div class="value">${safeOrder.type}</div>
                </div>
                <div class="item">
                  <div class="label">Status</div>
                  <div class="value">
                    <span class="status-badge">${safeOrder.status}</span>
                  </div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${safeOrder.delivery_date}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>👤 Informações do Cliente</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Nome</div>
                  <div class="value">${safeOrder.customer_name}</div>
                </div>
                <div class="item">
                  <div class="label">Telefone</div>
                  <div class="value">${safeOrder.customer_phone}</div>
                </div>
                <div class="item">
                  <div class="label">Email</div>
                  <div class="value">${safeOrder.customer_email}</div>
                </div>
              </div>
            </div>
            
            ${safeOrder.file_url ? `
            <div class="section">
              <h2>🎨 Logo/Arte do Pedido</h2>
              <div class="logo-section">
                <img src="${safeOrder.file_url}" alt="Logo/Arte do Pedido" />
                <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <h2>📦 Detalhes do Pedido</h2>
              <div class="item">
                <div class="label">Descrição</div>
                <div class="value">${safeOrder.description}</div>
              </div>
              <div class="grid">
                <div class="item">
                  <div class="label">Valor Total</div>
                  <div class="value"><strong style="color: #059669; font-size: 18px;">${formatCurrency(safeOrder.value)}</strong></div>
                </div>
                <div class="item">
                  <div class="label">Valor Pago</div>
                  <div class="value"><strong style="color: #2563eb; font-size: 18px;">${formatCurrency(safeOrder.paid)}</strong></div>
                </div>
              </div>
              ${safeOrder.observations && safeOrder.observations !== 'Sem observações' ? `
              <div class="item">
                <div class="label">Observações</div>
                <div class="value">${safeOrder.observations}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <h2>⚙️ Instruções de Produção</h2>
              <div class="checklist">
                <h3>Checklist de Produção</h3>
                <ul>
                  <li><span>✓</span> Verificar especificações técnicas antes de iniciar</li>
                  <li><span>✓</span> Confirmar materiais e insumos necessários</li>
                  <li><span>✓</span> Seguir cronograma de produção estabelecido</li>
                  <li><span>✓</span> Manter controle de qualidade durante o processo</li>
                  <li><span>✓</span> Comunicar eventuais problemas ou atrasos</li>
                  <li><span>✓</span> Finalizar com inspeção final de qualidade</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Abrir nova janela e forçar impressão
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfHtml);
      newWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      newWindow.onload = () => {
        console.log("Conteúdo carregado, abrindo diálogo de impressão...");
        newWindow.print();
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

  const printContent = `
    <div class="print-section">
      <h2>📋 Informações do Pedido</h2>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Código</div>
          <div class="value">${safeOrder.code}</div>
        </div>
        <div class="print-item">
          <div class="label">Tipo</div>
          <div class="value">${safeOrder.type}</div>
        </div>
        <div class="print-item">
          <div class="label">Status</div>
          <div class="value">${safeOrder.status}</div>
        </div>
        <div class="print-item">
          <div class="label">Data de Entrega</div>
          <div class="value">${safeOrder.delivery_date}</div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <h2>👤 Informações do Cliente</h2>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Nome</div>
          <div class="value">${safeOrder.customer_name}</div>
        </div>
        <div class="print-item">
          <div class="label">Telefone</div>
          <div class="value">${safeOrder.customer_phone}</div>
        </div>
        <div class="print-item">
          <div class="label">Email</div>
          <div class="value">${safeOrder.customer_email}</div>
        </div>
      </div>
    </div>

    ${safeOrder.file_url ? `
    <div class="section">
      <h2>🎨 Logo/Arte do Pedido</h2>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${safeOrder.file_url}" alt="Logo/Arte do Pedido" style="max-width: 100%; max-height: 300px; border: 2px solid #e5e7eb; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
      </div>
    </div>
    ` : ''}

    <div class="print-section">
      <h2>📦 Detalhes do Pedido</h2>
      <div class="print-item">
        <div class="label">Descrição</div>
        <div class="value">${safeOrder.description}</div>
      </div>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Valor Total</div>
          <div class="value">${formatCurrency(safeOrder.value)}</div>
        </div>
        <div class="print-item">
          <div class="label">Valor Pago</div>
          <div class="value">${formatCurrency(safeOrder.paid)}</div>
        </div>
      </div>
      ${safeOrder.observations && safeOrder.observations !== 'Sem observações' ? `
      <div class="print-item">
        <div class="label">Observações</div>
        <div class="value">${safeOrder.observations}</div>
      </div>
      ` : ''}
    </div>

    <div class="print-section">
      <h2>⚙️ Instruções de Produção</h2>
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <h3 style="margin-bottom: 10px; color: #92400e;">Checklist de Produção</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Verificar especificações técnicas antes de iniciar
          </li>
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Confirmar materiais e insumos necessários
          </li>
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Seguir cronograma de produção estabelecido
          </li>
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Manter controle de qualidade durante o processo
          </li>
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Comunicar eventuais problemas ou atrasos
          </li>
          <li style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="color: #059669; margin-right: 8px;">✓</span>
            Finalizar com inspeção final de qualidade
          </li>
        </ul>
      </div>
    </div>
  `;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pedidos')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Ordem de Produção</h1>
                <p className="text-sm text-muted-foreground">Código: {safeOrder.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                onClick={generatePDF}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">

        {/* Conteúdo Principal */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informações do Pedido */}
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Código:</span>
                  <p className="text-lg font-semibold">{safeOrder.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Tipo:</span>
                  <p className="text-lg font-semibold">{safeOrder.type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <Badge variant="outline" className="mt-1">
                    {safeOrder.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Data de Entrega:</span>
                  <p className="text-lg font-semibold">{safeOrder.delivery_date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Cliente */}
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-600 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Nome:</span>
                <p className="text-lg font-semibold">{safeOrder.customer_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Telefone:</span>
                <p className="text-lg font-semibold">{safeOrder.customer_phone}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <p className="text-lg font-semibold">{safeOrder.customer_email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logo/Arte do Pedido */}
        {safeOrder.file_url && (
          <Card className="bg-white border border-gray-200/50 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-purple-600 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Logo/Arte do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <img 
                  src={safeOrder.file_url} 
                  alt="Logo/Arte do Pedido" 
                  className="max-w-full max-h-64 mx-auto border-2 border-gray-200 rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-600 mt-2">Arte anexada pelo cliente</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhes do Pedido */}
        <Card className="bg-white border border-gray-200/50 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-orange-600 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Descrição:</span>
              <p className="mt-1">{safeOrder.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Valor Total:</span>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(safeOrder.value)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Valor Pago:</span>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(safeOrder.paid)}</p>
              </div>
            </div>
            {safeOrder.observations && safeOrder.observations !== 'Sem observações' && (
              <div>
                <span className="text-sm font-medium text-gray-600">Observações:</span>
                <p className="mt-1">{safeOrder.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções de Produção */}
        <Card className="bg-yellow-50 border border-yellow-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-yellow-800 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Instruções de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-100 p-4 rounded-lg border-l-4 border-yellow-400">
              <h3 className="font-semibold text-yellow-800 mb-3">Checklist de Produção</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Verificar especificações técnicas antes de iniciar
                </li>
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Confirmar materiais e insumos necessários
                </li>
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Seguir cronograma de produção estabelecido
                </li>
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Manter controle de qualidade durante o processo
                </li>
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Comunicar eventuais problemas ou atrasos
                </li>
                <li className="flex items-center text-yellow-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Finalizar com inspeção final de qualidade
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Layout */}
      <PrintLayout content={printContent} />
    </div>
  );
}