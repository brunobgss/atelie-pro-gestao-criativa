import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQuoteByCode } from "@/integrations/supabase/quotes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import PrintLayout from "@/components/PrintLayout";
import { useAuth } from "@/components/AuthProvider";

export default function OrcamentoImpressao() {
  console.log("🚀 OrcamentoImpressao component executando!");
  
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
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
                  Orçamento - {quote.code}
                </h1>
                <p className="text-gray-600 text-sm">
                  Cliente: {quote.customer_name} | {quote.customer_phone}
                </p>
            </div>
            </div>
            
            <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                  console.log("=== INICIANDO IMPRESSÃO ===");
                  console.log("Quote original:", quote);
                  console.log("Items original:", items);
                  
                  // Preparar dados seguros para evitar [object Object]
                  const safeQuote = {
                    code: String(quote?.code || 'N/A'),
                    customer_name: String(quote?.customer_name || 'Cliente não informado'),
                    customer_phone: String(quote?.customer_phone || 'Não informado'),
                    total_value: Number(quote?.total_value || 0),
                    observations: String(quote?.observations || 'Sem observações'),
                    date: String(quote?.date || new Date().toISOString().split('T')[0])
                  };

                  console.log("=== SERIALIZAÇÃO SEGURA ===");
                  console.log("Quote original:", quote);
                  console.log("Safe quote:", safeQuote);

                  const safeItems = (items || []).map((item: unknown, index: number) => {
                    const safeItem = {
                      index: index + 1,
                      description: String(item?.description || 'Produto personalizado'),
                      quantity: Number(item?.quantity || 1),
                      unit_value: Number(item?.unit_value || 0),
                      total: Number(item?.quantity || 1) * Number(item?.unit_value || 0)
                    };
                    console.log(`Item ${index + 1}:`, { original: item, safe: safeItem });
                    return safeItem;
                  });

                  console.log("Safe items final:", safeItems);

                  console.log("Safe Quote:", safeQuote);
                  console.log("Safe Items:", safeItems);

                  // Função formatCurrency segura
                  const formatCurrency = (value: number) => {
                    try {
                      const numValue = Number(value) || 0;
                      const formatted = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(numValue);
                      console.log(`formatCurrency(${value}) = ${formatted}`);
                      return formatted;
                    } catch (e) {
                      const fallback = `R$ ${(Number(value) || 0).toFixed(2).replace('.', ',')}`;
                      console.log(`formatCurrency fallback(${value}) = ${fallback}`);
                      return fallback;
                    }
                  };

                  // Verificação final antes de gerar HTML
                  console.log("=== VERIFICAÇÃO FINAL ===");
                  console.log("Safe quote final:", JSON.stringify(safeQuote, null, 2));
                  console.log("Safe items final:", JSON.stringify(safeItems, null, 2));
                  
                  // Verificar se há objetos não serializados
                  const hasObjectObjects = JSON.stringify(safeQuote).includes('[object Object]') || 
                                         JSON.stringify(safeItems).includes('[object Object]');
                  if (hasObjectObjects) {
                    console.error("❌ OBJETOS NÃO SERIALIZADOS DETECTADOS!");
                    console.error("Quote com [object Object]:", JSON.stringify(safeQuote).includes('[object Object]'));
                    console.error("Items com [object Object]:", JSON.stringify(safeItems).includes('[object Object]'));
                  } else {
                    console.log("✅ Dados serializados corretamente!");
                  }

                  // Gerar HTML do PDF
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
                                <div class="label">Código do Orçamento</div>
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
                                  <th>Descrição do Produto/Serviço</th>
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
                            <h2>📝 Observações e Especificações</h2>
                            <div class="item">
                              <div class="label">Detalhes do Trabalho</div>
                              <div class="value">
                                <p>${safeQuote.observations}</p>
                              </div>
                            </div>
                          </div>
                          ` : ''}
                          
                          <div class="section">
                            <h2>📋 Condições Comerciais</h2>
                            <div style="background: white; padding: 15px; border-radius: 6px;">
                              <h4 style="margin-bottom: 10px; color: #1e40af;">📋 Termos e Condições do Orçamento</h4>
                              <ul style="padding-left: 20px;">
                                <li>✅ Orçamento válido por 7 dias corridos a partir da data de emissão</li>
                                <li>✅ Preços incluem mão de obra, materiais básicos e acabamento</li>
                                <li>✅ Alterações após aprovação podem gerar custos adicionais</li>
                                <li>✅ Pagamento conforme acordado no momento da aprovação</li>
                                <li>✅ Prazo de entrega pode variar conforme complexidade do trabalho</li>
                                <li>✅ Qualidade garantida conforme especificações técnicas</li>
                                <li>✅ Garantia de 30 dias para defeitos de fabricação</li>
                              </ul>
                            </div>
                          </div>
                          
                          <div class="footer">
                            <p><strong>Documento gerado automaticamente pelo Ateliê Pro</strong></p>
                            <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                            <p>Este orçamento é válido por 7 dias a partir da data de emissão</p>
                          </div>
                        </div>
                      </body>
                    </html>
                  `;

                  // Debug: verificar se o HTML está correto
                  console.log("HTML gerado:", pdfHtml.substring(0, 500) + "...");
                  console.log("Safe Items no HTML:", safeItems);
                  console.log("Safe Quote no HTML:", safeQuote);
                  
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
                        // Não fechar automaticamente - deixar o usuário controlar
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
      </header>

      <div className="p-8">
        <PrintLayout title={`Orçamento - ${quote.code}`}>
          <div className="space-y-6">
            {/* Informações do Orçamento */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">📋 Informações do Orçamento</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Código:</span>
                  <p className="font-semibold">{quote.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Data:</span>
                  <p>{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className="text-green-600 font-semibold">{quote.status || 'Pendente'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Validade:</span>
                  <p>7 dias corridos</p>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">👤 Informações do Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Nome:</span>
                  <p className="font-semibold">{quote.customer_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Telefone:</span>
                  <p>{quote.customer_phone}</p>
                </div>
              </div>
            </div>

            {/* Produtos e Serviços */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">📦 Produtos e Serviços</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Descrição</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Quantidade</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Valor Unitário</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: unknown, index: number) => (
                      <tr key={item.id || index}>
                        <td className="border border-gray-300 px-3 py-2 text-center font-medium">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.description || 'Produto personalizado'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity || 1}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(Number(item.unit_value || 0))}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                          {formatCurrency(Number(item.unit_value || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-600 text-white font-bold">
                      <td className="border border-gray-300 px-3 py-2" colSpan={4}>
                        VALOR TOTAL DO ORÇAMENTO
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                        {formatCurrency(Number(quote.total_value || 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Observações */}
            {quote.observations && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-blue-600">📝 Observações</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.observations}</p>
              </div>
            )}

            {/* Condições Comerciais */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">📋 Condições Comerciais</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ Orçamento válido por 7 dias corridos a partir da data de emissão</p>
                <p>✅ Preços incluem mão de obra, materiais básicos e acabamento</p>
                <p>✅ Alterações após aprovação podem gerar custos adicionais</p>
                <p>✅ Pagamento conforme acordado no momento da aprovação</p>
                <p>✅ Prazo de entrega pode variar conforme complexidade do trabalho</p>
                <p>✅ Qualidade garantida conforme especificações técnicas</p>
                <p>✅ Garantia de 30 dias para defeitos de fabricação</p>
              </div>
            </div>
          </div>
        </PrintLayout>
      </div>
    </div>
  );
}