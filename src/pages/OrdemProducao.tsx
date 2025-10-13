import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Printer, Download, FileText, Calendar, User, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOrderByCode } from "@/integrations/supabase/orders";
import { toast } from "sonner";
import PrintLayout from "@/components/PrintLayout";

// Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function OrdemProducao() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderByCode(id as string),
    enabled: Boolean(id),
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Aguardando aprovação":
        return "status-pending";
      case "Em produção":
        return "status-production";
      case "Pronto":
        return "status-ready";
      case "Aguardando retirada":
        return "status-waiting";
      default:
        return "status-pending";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Não definido";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 p-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pedidos")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pedido não encontrado</h1>
              <p className="text-sm text-muted-foreground">Verifique o código e tente novamente</p>
            </div>
          </div>
        </header>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pedido não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                O pedido com código {id} não foi encontrado.
              </p>
              <Button onClick={() => navigate("/pedidos")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Pedidos
              </Button>
            </CardContent>
          </Card>
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
    description: String(order?.description || 'Sem descrição'),
    value: Number(order?.value || 0),
    paid: Number(order?.paid || 0),
    delivery_date: String(order?.delivery_date || 'Não definido'),
    observations: String(order?.observations || 'Sem observações')
  };

  console.log("=== ORDEM DE PRODUÇÃO - DADOS SEGUROS ===");
  console.log("Order original:", order);
  console.log("Safe Order:", safeOrder);

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
          <div class="value">
            <span class="print-status ${getStatusClass(safeOrder.status)}">${safeOrder.status}</span>
          </div>
        </div>
        <div class="print-item">
          <div class="label">Data de Criação</div>
          <div class="value">${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <h2>👤 Informações do Cliente</h2>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Cliente</div>
          <div class="value">${safeOrder.customer_name}</div>
        </div>
        <div class="print-item">
          <div class="label">Valor Total</div>
          <div class="value">R$ ${Number(safeOrder.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="print-item">
          <div class="label">Valor Pago</div>
          <div class="value">R$ ${Number(safeOrder.paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="print-item">
          <div class="label">Saldo Restante</div>
          <div class="value">R$ ${(Number(safeOrder.value || 0) - Number(safeOrder.paid || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <h2>📅 Prazo de Entrega</h2>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Data de Entrega</div>
          <div class="value">${formatDate(safeOrder.delivery_date || '')}</div>
        </div>
        <div class="print-item">
          <div class="label">Dias Restantes</div>
          <div class="value">
            ${safeOrder.delivery_date && safeOrder.delivery_date !== 'Não definido' ? 
              Math.ceil((new Date(safeOrder.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' dias' : 
              'Não definido'
            }
          </div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <h2>📝 Descrição do Trabalho</h2>
      <div class="print-item">
        <div class="label">Descrição</div>
        <div class="value">${safeOrder.description || 'Orçamento aprovado - Aguardando detalhes específicos'}</div>
      </div>
    </div>

    <div class="print-section">
      <h2>⚙️ Instruções de Produção</h2>
      <div class="print-instructions">
        <h4>📋 Checklist de Produção</h4>
        <ul>
          <li>✅ Verificar especificações do cliente</li>
          <li>✅ Conferir arquivo/arte anexado</li>
          <li>✅ Confirmar cores e tamanhos</li>
          <li>✅ Verificar materiais necessários</li>
          <li>✅ Manter qualidade do trabalho</li>
          <li>✅ Entregar dentro do prazo estabelecido</li>
        </ul>
      </div>
    </div>

    <div class="print-section">
      <h2>👥 Controle de Qualidade</h2>
      <div class="print-grid">
        <div class="print-item">
          <div class="label">Responsável pela Produção</div>
          <div class="value">_________________________</div>
        </div>
        <div class="print-item">
          <div class="label">Data de Início</div>
          <div class="value">_________________________</div>
        </div>
        <div class="print-item">
          <div class="label">Data de Conclusão</div>
          <div class="value">_________________________</div>
        </div>
        <div class="print-item">
          <div class="label">Controle de Qualidade</div>
          <div class="value">_________________________</div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <h2>📋 Observações</h2>
      <div class="print-item">
        <div class="label">Observações Gerais</div>
        <div class="value">
          <p>• Manter comunicação com o cliente durante a produção</p>
          <p>• Documentar qualquer alteração ou problema</p>
          <p>• Confirmar entrega com o cliente</p>
          <p>• Manter arquivo de arte para futuras referências</p>
        </div>
      </div>
    </div>
  `;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Ordem de Produção</h1>
            <p className="text-sm text-muted-foreground">Pedido #{safeOrder.code}</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Botões de Ação */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => {
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
                        gap: 15px; 
                      }
                      .item { margin-bottom: 10px; }
                      .label { 
                        font-size: 12px; 
                        font-weight: bold; 
                        color: #6b7280; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px; 
                      }
                      .value { 
                        font-size: 14px; 
                        color: #1f2937; 
                        margin-top: 2px; 
                      }
                      .instructions { 
                        background: #fef3c7; 
                        border: 1px solid #f59e0b; 
                        border-radius: 6px; 
                        padding: 15px; 
                        margin: 20px 0; 
                      }
                      .instructions h4 { 
                        color: #92400e; 
                        margin-bottom: 10px; 
                        font-size: 14px; 
                      }
                      .instructions ul { 
                        margin-left: 20px; 
                        color: #92400e; 
                      }
                      .instructions li { 
                        margin-bottom: 5px; 
                        font-size: 13px; 
                      }
                      .footer { 
                        margin-top: 40px; 
                        text-align: center; 
                        font-size: 12px; 
                        color: #6b7280; 
                        border-top: 1px solid #e5e7eb; 
                        padding-top: 20px; 
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Ordem de Produção</h1>
                        <div class="subtitle">Código: ${safeOrder.code} | Ateliê Pro - Sistema de Gestão</div>
                      </div>
                      
                      <div class="section">
                        <h2>📋 Informações do Pedido</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Código</div>
                            <div class="value"><strong>${safeOrder.code}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Tipo</div>
                            <div class="value">${safeOrder.type}</div>
                          </div>
                          <div class="item">
                            <div class="label">Status</div>
                            <div class="value"><span style="color: #059669; font-weight: bold;">${safeOrder.status}</span></div>
                          </div>
                          <div class="item">
                            <div class="label">Data de Criação</div>
                            <div class="value">${new Date().toLocaleDateString('pt-BR')}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>👤 Informações do Cliente</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Nome do Cliente</div>
                            <div class="value"><strong>${safeOrder.customer_name}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Telefone/WhatsApp</div>
                            <div class="value">${safeOrder.customer_phone}</div>
                          </div>
                          <div class="item">
                            <div class="label">Email</div>
                            <div class="value">${safeOrder.customer_email}</div>
                          </div>
                          <div class="item">
                            <div class="label">Data de Entrega</div>
                            <div class="value">${safeOrder.delivery_date}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>📦 Detalhes do Pedido</h2>
                        <div class="item">
                          <div class="label">Descrição</div>
                          <div class="value">${safeOrder.description}</div>
                        </div>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Valor Total</div>
                            <div class="value"><strong style="color: #059669; font-size: 16px;">${formatCurrency(safeOrder.value)}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Valor Pago</div>
                            <div class="value"><strong style="color: #2563eb; font-size: 16px;">${formatCurrency(safeOrder.paid)}</strong></div>
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
                        <div class="instructions">
                          <h4>📋 Checklist de Produção</h4>
                          <ul>
                            <li>✅ Verificar especificações técnicas antes de iniciar</li>
                            <li>✅ Confirmar materiais e insumos necessários</li>
                            <li>✅ Seguir cronograma de produção estabelecido</li>
                            <li>✅ Manter controle de qualidade durante o processo</li>
                            <li>✅ Comunicar eventuais problemas ou atrasos</li>
                            <li>✅ Finalizar com inspeção final de qualidade</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div class="footer">
                        <p><strong>Documento gerado automaticamente pelo Ateliê Pro</strong></p>
                        <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                        <p>Esta ordem de produção é válida até a data de entrega especificada</p>
                      </div>
                    </div>
                  </body>
                </html>
              `;

              console.log("HTML gerado:", pdfHtml.substring(0, 500) + "...");
              
              // Abrir nova janela e escrever o HTML
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(pdfHtml);
                printWindow.document.close();
                
                console.log("PDF HTML gerado e janela aberta");
                
                // Aguardar o conteúdo carregar completamente
                printWindow.onload = () => {
                  console.log("Conteúdo carregado, iniciando impressão");
                  setTimeout(() => {
                    printWindow.print();
                    console.log("Impressão iniciada");
                  }, 1000);
                };
                
                // Fallback caso onload não funcione
                setTimeout(() => {
                  if (!printWindow.closed) {
                    console.log("Fallback: iniciando impressão");
                    printWindow.print();
                  }
                }, 2000);
              }
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          
          <Button
            onClick={() => {
              console.log("=== BAIXANDO PDF ORDEM DE PRODUÇÃO ===");
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
                        gap: 15px; 
                      }
                      .item { margin-bottom: 10px; }
                      .label { 
                        font-size: 12px; 
                        font-weight: bold; 
                        color: #6b7280; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px; 
                      }
                      .value { 
                        font-size: 14px; 
                        color: #1f2937; 
                        margin-top: 2px; 
                      }
                      .instructions { 
                        background: #fef3c7; 
                        border: 1px solid #f59e0b; 
                        border-radius: 6px; 
                        padding: 15px; 
                        margin: 20px 0; 
                      }
                      .instructions h4 { 
                        color: #92400e; 
                        margin-bottom: 10px; 
                        font-size: 14px; 
                      }
                      .instructions ul { 
                        margin-left: 20px; 
                        color: #92400e; 
                      }
                      .instructions li { 
                        margin-bottom: 5px; 
                        font-size: 13px; 
                      }
                      .footer { 
                        margin-top: 40px; 
                        text-align: center; 
                        font-size: 12px; 
                        color: #6b7280; 
                        border-top: 1px solid #e5e7eb; 
                        padding-top: 20px; 
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Ordem de Produção</h1>
                        <div class="subtitle">Código: ${safeOrder.code} | Ateliê Pro - Sistema de Gestão</div>
                      </div>
                      
                      <div class="section">
                        <h2>📋 Informações do Pedido</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Código</div>
                            <div class="value"><strong>${safeOrder.code}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Tipo</div>
                            <div class="value">${safeOrder.type}</div>
                          </div>
                          <div class="item">
                            <div class="label">Status</div>
                            <div class="value"><span style="color: #059669; font-weight: bold;">${safeOrder.status}</span></div>
                          </div>
                          <div class="item">
                            <div class="label">Data de Criação</div>
                            <div class="value">${new Date().toLocaleDateString('pt-BR')}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>👤 Informações do Cliente</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Nome do Cliente</div>
                            <div class="value"><strong>${safeOrder.customer_name}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Telefone/WhatsApp</div>
                            <div class="value">${safeOrder.customer_phone}</div>
                          </div>
                          <div class="item">
                            <div class="label">Email</div>
                            <div class="value">${safeOrder.customer_email}</div>
                          </div>
                          <div class="item">
                            <div class="label">Data de Entrega</div>
                            <div class="value">${safeOrder.delivery_date}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>📦 Detalhes do Pedido</h2>
                        <div class="item">
                          <div class="label">Descrição</div>
                          <div class="value">${safeOrder.description}</div>
                        </div>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Valor Total</div>
                            <div class="value"><strong style="color: #059669; font-size: 16px;">${formatCurrency(safeOrder.value)}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Valor Pago</div>
                            <div class="value"><strong style="color: #2563eb; font-size: 16px;">${formatCurrency(safeOrder.paid)}</strong></div>
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
                        <div class="instructions">
                          <h4>📋 Checklist de Produção</h4>
                          <ul>
                            <li>✅ Verificar especificações técnicas antes de iniciar</li>
                            <li>✅ Confirmar materiais e insumos necessários</li>
                            <li>✅ Seguir cronograma de produção estabelecido</li>
                            <li>✅ Manter controle de qualidade durante o processo</li>
                            <li>✅ Comunicar eventuais problemas ou atrasos</li>
                            <li>✅ Finalizar com inspeção final de qualidade</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div class="footer">
                        <p><strong>Documento gerado automaticamente pelo Ateliê Pro</strong></p>
                        <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                        <p>Esta ordem de produção é válida até a data de entrega especificada</p>
                      </div>
                    </div>
                  </body>
                </html>
              `;

              console.log("HTML gerado:", pdfHtml.substring(0, 500) + "...");
              
              // Abrir nova janela e escrever o HTML
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(pdfHtml);
                printWindow.document.close();
                
                console.log("PDF HTML gerado e janela aberta");
                
                // Aguardar o conteúdo carregar completamente
                printWindow.onload = () => {
                  console.log("Conteúdo carregado, iniciando impressão");
                  setTimeout(() => {
                    printWindow.print();
                    console.log("Impressão iniciada");
                  }, 1000);
                };
                
                // Fallback caso onload não funcione
                setTimeout(() => {
                  if (!printWindow.closed) {
                    console.log("Fallback: iniciando impressão");
                    printWindow.print();
                  }
                }, 2000);
              }
            }}
            className="px-6 py-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            {/* Informações do Pedido */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">📋 Informações do Pedido</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Código:</span>
                  <p className="font-semibold">{safeOrder.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Tipo:</span>
                  <p>{safeOrder.type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className={`font-semibold ${getStatusClass(safeOrder.status)}`}>{safeOrder.status}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Data:</span>
                  <p>{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">👤 Informações do Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Nome:</span>
                  <p className="font-semibold">{safeOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Telefone:</span>
                  <p>{safeOrder.customer_phone}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p>{safeOrder.customer_email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Data de Entrega:</span>
                  <p>{safeOrder.delivery_date ? new Date(safeOrder.delivery_date).toLocaleDateString('pt-BR') : 'Não definida'}</p>
                </div>
              </div>
            </div>

            {/* Detalhes do Pedido */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">📦 Detalhes do Pedido</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Descrição:</span>
                  <p className="mt-1">{safeOrder.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Valor Total:</span>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(safeOrder.value)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Valor Pago:</span>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(safeOrder.paid || 0)}</p>
                  </div>
                </div>
                {safeOrder.observations && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Observações:</span>
                    <p className="mt-1 text-gray-700 whitespace-pre-line">{safeOrder.observations}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Instruções de Produção */}
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-yellow-800">🏭 Instruções de Produção</h2>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>✅ Verificar especificações técnicas antes de iniciar</li>
                <li>✅ Confirmar materiais e insumos necessários</li>
                <li>✅ Seguir cronograma de produção estabelecido</li>
                <li>✅ Manter controle de qualidade durante o processo</li>
                <li>✅ Comunicar eventuais problemas ou atrasos</li>
                <li>✅ Finalizar com inspeção final de qualidade</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}