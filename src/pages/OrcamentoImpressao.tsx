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
  const personalizations = quoteData.personalizations || [];

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

  // FORÇAR SERIALIZAÇÃO CORRETA DOS DADOS
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

  const safePersonalizations = personalizations.map((item: any, index: number) => ({
    index: index + 1,
    person_name: String(item?.person_name || "Cliente"),
    size: item?.size ? String(item.size) : "—",
    quantity: Number(item?.quantity || 1),
    notes: item?.notes ? String(item.notes) : "",
  }));

  console.log("=== DADOS FINAIS SERIALIZADOS ===");
  console.log("Safe Quote:", safeQuote);
  console.log("Safe Items:", safeItems);
  console.log("Safe Personalizations:", safePersonalizations);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para remover URL do arquivo das observações
  const cleanObservations = (observations?: string | null): string => {
    if (!observations) return '';
    // Remove linhas que contenham "Arquivo/Arte:" seguido de URL
    return observations
      .split('\n')
      .filter(line => !line.match(/Arquivo\/Arte:\s*https?:\/\/[^\s\n]+/i))
      .filter(line => !line.match(/Arquivo:\s*https?:\/\/[^\s\n]+/i))
      .join('\n')
      .trim();
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
                  console.log("=== GERANDO PDF ORÇAMENTO ===");
                  console.log("Safe Quote:", safeQuote);
                  console.log("Safe Items:", safeItems);

                  // Calcular data de validade (7 dias a partir da data do orçamento)
                  const quoteDate = new Date(safeQuote.date);
                  const validityDate = new Date(quoteDate);
                  validityDate.setDate(validityDate.getDate() + 7);

                  // Dados da empresa
                  const empresaNome = empresa?.nome || "Empresa";
                  const empresaCNPJ = empresa?.cpf_cnpj || "Não informado";
                  const empresaTelefone = empresa?.telefone || "Não informado";
                  const empresaEndereco = empresa?.endereco || "Não informado";
                  const empresaResponsavel = empresa?.responsavel || "Não informado";

                  // Gerar HTML completo do PDF PROFISSIONAL (preto e branco)
                  const pdfHtml = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Orçamento ${safeQuote.code} - ${empresaNome}</title>
                        <meta charset="utf-8">
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          @page { margin: 1cm; }
                          body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.5; 
                            color: #000; 
                            background: white; 
                            padding: 15px; 
                            font-size: 12px;
                          }
                          .container { max-width: 100%; margin: 0 auto; }
                          .header { 
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 20px;
                            padding-bottom: 10px;
                            border-bottom: 1px solid #000;
                          }
                          .empresa-info {
                            flex: 1;
                          }
                          .empresa-info > div {
                            margin-bottom: 1px;
                          }
                          .empresa-nome { 
                            font-size: 17px; 
                            font-weight: bold;
                            color: #000;
                          }
                          .empresa-cnpj {
                            font-size: 9px;
                            color: #000;
                          }
                          .empresa-endereco {
                            font-size: 9px;
                            color: #000;
                          }
                          .empresa-contato {
                            font-size: 9px;
                            color: #000;
                          }
                          .orçamento-info {
                            text-align: left;
                            min-width: 180px;
                            padding-left: 10px;
                            border-left: 1px solid #000;
                          }
                          .orçamento-info > div {
                            margin-bottom: 1px;
                          }
                          .orçamento-titulo {
                            font-size: 9px;
                            font-weight: bold;
                            text-transform: uppercase;
                          }
                          .orçamento-numero {
                            font-size: 14px;
                            font-weight: bold;
                            margin-top: 2px;
                            margin-bottom: 3px;
                          }
                          .orçamento-data {
                            font-size: 9px;
                          }
                          .cliente-section {
                            margin-bottom: 12px;
                          }
                          .lista-produtos-title {
                            font-weight: bold;
                            font-size: 11px;
                            margin-bottom: 3px;
                            margin-top: 5px;
                            text-transform: uppercase;
                          }
                          .produtos-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-bottom: 10px;
                            font-size: 11px;
                          }
                          .produtos-table th { 
                            background: #f0f0f0; 
                            padding: 4px 3px; 
                            text-align: left; 
                            font-weight: bold;
                            border: 1px solid #000;
                            font-size: 10px;
                          }
                          .produtos-table td { 
                            padding: 4px 3px; 
                            border: 1px solid #999; 
                          }
                          .pagamento-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 15px;
                            font-size: 11px;
                          }
                          .pagamento-table th {
                            background: #f0f0f0;
                            font-weight: bold;
                            text-align: left;
                            padding: 4px;
                            border: 1px solid #000;
                            font-size: 10px;
                            text-transform: uppercase;
                          }
                          .pagamento-table td {
                            padding: 3px;
                            border: 1px solid #999;
                          }
                          .assinatura-section {
                            margin-top: 20px;
                            text-align: center;
                          }
                          .checkbox-line {
                            display: inline-block;
                            margin: 0 10px;
                            font-size: 11px;
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
                            <div class="empresa-info">
                              <div class="empresa-nome">${empresaNome}</div>
                              <div class="empresa-cnpj">CPF/CNPJ ${empresaCNPJ}</div>
                              <div class="empresa-endereco">${empresaEndereco}</div>
                              <div class="empresa-contato">Fone: ${empresaTelefone}</div>
                              <div class="empresa-contato">E-mail: ${(empresa as any)?.email || 'Não informado'}</div>
                            </div>
                            <div class="orçamento-info">
                              <div class="orçamento-titulo">ORÇAMENTO N°</div>
                              <div class="orçamento-numero">${safeQuote.code}</div>
                              <div class="orçamento-data">Data: ${quoteDate.toLocaleDateString('pt-BR')}</div>
                              <div class="orçamento-data">Validade: ${validityDate.toLocaleDateString('pt-BR')}</div>
                              <div class="orçamento-data">Vendedor: ${empresaResponsavel}</div>
                            </div>
                          </div>

                          <div class="cliente-section" style="border-bottom: 1px solid #ccc; padding-bottom: 3px;">
                            <div style="font-size: 10px; line-height: 1.4;">
                              <div><span style="font-weight: bold;">Cliente: </span>${safeQuote.customer_name}</div>
                              <div>Endereço: Não informado</div>
                              <div>Telefone: </div>
                              <div>CPF/CNPJ: Não informado</div>
                              <div>Celular: ${safeQuote.customer_phone}</div>
                            </div>
                          </div>

                          <div class="lista-produtos-title">Lista de Produtos</div>
                          <table class="produtos-table">
                            <thead>
                              <tr>
                                <th style="width: 6%;">Item</th>
                                <th style="width: 45%;">Descrição</th>
                                <th style="width: 8%; text-align: center;">Qtde</th>
                                <th style="width: 6%; text-align: center;">UND</th>
                                <th style="width: 10%; text-align: right;">Valor Unit.</th>
                                <th style="width: 10%; text-align: right;">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${safeItems.length > 0 ? safeItems.map(item => `
                                <tr>
                                  <td style="text-align: center;">${item.index}</td>
                                  <td>${item.description}</td>
                                  <td style="text-align: center;">${item.quantity}</td>
                                  <td style="text-align: center;">UN</td>
                                  <td style="text-align: right;">${formatCurrency(item.unit_value)}</td>
                                  <td style="text-align: right; font-weight: bold;">${formatCurrency(item.total)}</td>
                                </tr>
                              `).join('') : `
                                <tr>
                                  <td colspan="6" style="text-align: center; padding: 20px; color: #666;">
                                    Nenhum item encontrado
                                  </td>
                                </tr>
                              `}
                            </tbody>
                          </table>

                          ${safePersonalizations.length > 0 ? `
                          <div class="lista-produtos-title" style="margin-top: 16px;">Lista de Personalizações</div>
                          <table class="produtos-table">
                            <thead>
                              <tr>
                                <th style="width: 8%;">Item</th>
                                <th style="width: 40%;">Nome</th>
                                <th style="width: 15%; text-align: center;">Tamanho</th>
                                <th style="width: 15%; text-align: center;">Quantidade</th>
                                <th style="width: 22%;">Observações</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${safePersonalizations.map(item => `
                                <tr>
                                  <td style="text-align: center;">${item.index}</td>
                                  <td>${item.person_name}</td>
                                  <td style="text-align: center;">${item.size}</td>
                                  <td style="text-align: center;">${item.quantity}</td>
                                  <td>${item.notes || ""}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                          ` : ''}

                          <div style="margin-top: 0px; margin-bottom: 10px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                              <tr>
                                <td style="background: #f0f0f0; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">Frete:</td>
                                <td style="text-align: right; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">R$ 0,00</td>
                                <td style="background: #f0f0f0; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">Serviços:</td>
                                <td style="text-align: right; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">R$ 0,00</td>
                                <td style="background: #f0f0f0; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">Produtos à vista:</td>
                                <td style="text-align: right; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">${formatCurrency(safeQuote.total_value)}</td>
                                <td style="background: #f0f0f0; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">Descontos:</td>
                                <td style="text-align: right; font-weight: bold; padding: 3px 5px; border: 1px solid #999;">R$ 0,00</td>
                              </tr>
                              <tr style="background: #e0e0e0; font-weight: bold;">
                                <td colspan="7" style="padding: 4px 5px; border: 1px solid #999;">Total à vista:</td>
                                <td style="text-align: right; padding: 4px 5px; border: 1px solid #999; font-size: 13px;">${formatCurrency(safeQuote.total_value)}</td>
                              </tr>
                            </table>
                          </div>

                          <table class="pagamento-table">
                            <tr>
                              <th>Forma Pagamento</th>
                              <th>Obs. Forma Pagamento</th>
                              <th>Prazo de Entrega</th>
                              <th>Obs</th>
                              <th>Impostos inclusos</th>
                              <th>Responsável</th>
                            </tr>
                            <tr>
                              <td>A combinar</td>
                              <td>-</td>
                              <td>A combinar</td>
                              <td>-</td>
                              <td>Não</td>
                              <td>${empresaResponsavel}</td>
                            </tr>
                          </table>

                          ${safeQuote.observations && safeQuote.observations !== 'Sem observações' ? `
                          <div style="margin-bottom: 15px; font-size: 11px;">
                            <strong>Observações:</strong> ${cleanObservations(safeQuote.observations)}
                          </div>
                          ` : ''}

                          <div class="assinatura-section">
                            <div style="margin-bottom: 15px; font-weight: bold; font-size: 12px;">${empresaNome}</div>
                            <div style="margin-bottom: 15px; font-size: 11px;">Eu, ${safeQuote.customer_name}</div>
                            <div style="margin-bottom: 20px;">
                              <span class="checkbox-line">( ) Aprovado</span>
                              <span class="checkbox-line">( ) Reprovado</span>
                            </div>
                            <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; width: 300px; display: inline-block; font-size: 11px;">
                              Assinatura do Cliente: _______________
                            </div>
                            <div style="margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; width: 300px; display: inline-block; font-size: 11px;">
                              Data: __/__/____
                            </div>
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