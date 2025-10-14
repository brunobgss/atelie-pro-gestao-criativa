import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQuoteByCode } from "@/integrations/supabase/quotes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import PrintLayout from "@/components/PrintLayout";
import { useAuth } from "@/components/AuthProvider";

// Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function OrcamentoImpressaoNovo() {
  console.log("🚀 OrcamentoImpressaoNovo component executando!");
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa } = useAuth();
  
  console.log("📋 Parâmetros recebidos:", { id, empresa: empresa?.nome });

  const { data: quoteData, isLoading, error } = useQuery({
    queryKey: ["quotePrint", id],
    queryFn: async () => {
      console.log("Iniciando busca de orçamento para impressão:", id);
      const result = await getQuoteByCode(id!);
      console.log("Resultado da busca:", result);
      return result;
    },
    enabled: !!id,
    retry: 3,
    staleTime: 0
  });

  console.log("Estado da impressão:", { id, isLoading, error, quoteData });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !quoteData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/orcamentos")}
              className="border-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Erro ao carregar orçamento
              </h1>
              <p className="text-gray-600 text-sm">
                Não foi possível carregar os dados do orçamento
              </p>
            </div>
          </div>
        </header>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Orçamento não encontrado</h2>
            <p className="text-gray-600 mb-4">O orçamento solicitado não foi encontrado.</p>
            <button 
              onClick={() => navigate("/orcamentos")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar para Orçamentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const quote = quoteData.quote;
  const items = quoteData.items || [];

  console.log("Dados do orçamento para impressão:", { quote, items });
  console.log("Items length:", items.length);
  console.log("Quote total_value:", quote?.total_value);
  console.log("Quote customer_name:", quote?.customer_name);
  console.log("Items details:", items);
  
  // Log detalhado para debug
  console.log("=== DEBUG PDF ORÇAMENTO ===");
  console.log("Quote type:", typeof quote);
  console.log("Quote keys:", quote ? Object.keys(quote) : "null");
  console.log("Items type:", typeof items);
  console.log("Items is array:", Array.isArray(items));
  if (items && items.length > 0) {
    console.log("First item:", items[0]);
    console.log("First item keys:", Object.keys(items[0]));
  }
  
  // Validação adicional para garantir que temos dados válidos
  if (!quote || !quote.customer_name) {
    console.error("Dados do orçamento inválidos:", { quote, items });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro nos Dados</h2>
          <p className="text-gray-600">Não foi possível carregar os dados do orçamento.</p>
          <p className="text-sm text-gray-500 mt-2">Quote: {JSON.stringify(quote)}</p>
          <p className="text-sm text-gray-500">Items: {JSON.stringify(items)}</p>
        </div>
      </div>
    );
  }

  // FORÇAR SERIALIZAÇÃO CORRETA DOS DADOS - ESTRUTURA EXATA DA ORDEM DE PRODUÇÃO
  const safeQuote = {
    code: String(quote?.code || 'N/A'),
    customer_name: String(quote?.customer_name || 'Cliente não informado'),
    customer_phone: String(quote?.customer_phone || 'Não informado'),
    total_value: Number(quote?.total_value || 0),
    observations: String(quote?.observations || 'Sem observações'),
    date: String(quote?.date || new Date().toISOString().split('T')[0])
  };

  const safeItems = (items || []).map((item: unknown, index: number) => ({
    index: index + 1,
    description: String(item?.description || 'Produto personalizado'),
    quantity: Number(item?.quantity || 1),
    unit_value: Number(item?.unit_value || 0),
    total: Number(item?.quantity || 1) * Number(item?.unit_value || 0)
  }));

  console.log("=== DADOS FINAIS SERIALIZADOS ===");
  console.log("Safe Quote:", safeQuote);
  console.log("Safe Items:", safeItems);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/orcamentos")}
            className="border-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Orçamento para Impressão
            </h1>
            <p className="text-gray-600 text-sm">
              Código: {safeQuote.code} | Cliente: {safeQuote.customer_name}
            </p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                📄 Orçamento {safeQuote.code}
              </h2>
              <p className="text-gray-600">
                Cliente: {safeQuote.customer_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Valor Total
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(safeQuote.total_value)}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Telefone:</span>
                <p className="text-gray-600">{safeQuote.customer_phone}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Data:</span>
                <p className="text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            {safeQuote.observations && safeQuote.observations !== 'Sem observações' && (
              <div>
                <span className="font-medium text-gray-700">Observações:</span>
                <p className="text-gray-600 mt-1">{safeQuote.observations}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              console.log("=== GERANDO PDF ORÇAMENTO ===");
              console.log("Safe Quote:", safeQuote);
              console.log("Safe Items:", safeItems);

              // Gerar HTML completo do PDF - ESTRUTURA EXATA DA ORDEM DE PRODUÇÃO
              const pdfHtml = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Orçamento - ${safeQuote.code}</title>
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
                      .table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px; 
                        background: white;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                      }
                      .table th { 
                        background: #2563eb; 
                        color: white; 
                        padding: 12px; 
                        text-align: left; 
                        font-weight: bold; 
                      }
                      .table td { 
                        padding: 12px; 
                        border-bottom: 1px solid #e5e7eb; 
                      }
                      .table tbody tr:hover { background: #f9fafb; }
                      .total-row { 
                        background: #1e40af; 
                        color: white;
                        font-weight: bold;
                      }
                      .total-row td { border-bottom: none; }
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
                        <h1>Orçamento Profissional</h1>
                        <div class="subtitle">Código: ${safeQuote.code} | Ateliê Pro - Sistema de Gestão</div>
                      </div>
                      
                      <div class="section">
                        <h2>📋 Informações do Orçamento</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Código</div>
                            <div class="value"><strong>${safeQuote.code}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Data de Criação</div>
                            <div class="value">${new Date().toLocaleDateString('pt-BR')}</div>
                          </div>
                          <div class="item">
                            <div class="label">Status</div>
                            <div class="value"><span style="color: #059669; font-weight: bold;">Pendente</span></div>
                          </div>
                          <div class="item">
                            <div class="label">Validade</div>
                            <div class="value">7 dias corridos</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>👤 Informações do Cliente</h2>
                        <div class="grid">
                          <div class="item">
                            <div class="label">Nome do Cliente</div>
                            <div class="value"><strong>${safeQuote.customer_name}</strong></div>
                          </div>
                          <div class="item">
                            <div class="label">Telefone/WhatsApp</div>
                            <div class="value">${safeQuote.customer_phone}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <h2>📦 Produtos e Serviços</h2>
                        <table class="table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Descrição</th>
                              <th>Quantidade</th>
                              <th>Valor Unitário</th>
                              <th>Valor Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${safeItems.length > 0 ? safeItems.map(item => `
                              <tr>
                                <td><strong>${item.index}</strong></td>
                                <td>${item.description}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCurrency(item.unit_value)}</td>
                                <td><strong>${formatCurrency(item.total)}</strong></td>
                              </tr>
                            `).join('') : `
                              <tr>
                                <td colspan="5" style="text-align: center; padding: 20px; color: #6b7280;">
                                  Nenhum item encontrado
                                </td>
                              </tr>
                            `}
                          </tbody>
                          <tfoot>
                            <tr class="total-row">
                              <th colspan="4">VALOR TOTAL DO ORÇAMENTO</th>
                              <th>${formatCurrency(safeQuote.total_value)}</th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      
                      ${safeQuote.observations && safeQuote.observations !== 'Sem observações' ? `
                      <div class="section">
                        <h2>📝 Observações</h2>
                        <div class="item">
                          <div class="label">Detalhes do Trabalho</div>
                          <div class="value">${safeQuote.observations}</div>
                        </div>
                      </div>
                      ` : ''}
                      
                      <div class="footer">
                        <p><strong>Documento gerado automaticamente pelo Ateliê Pro</strong></p>
                        <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                        <p>Este orçamento é válido por 7 dias corridos a partir da data de emissão</p>
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
        </div>
      </div>
    </div>
  );
}
