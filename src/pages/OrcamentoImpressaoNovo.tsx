import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQuoteByCode } from "@/integrations/supabase/quotes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import PrintLayout from "@/components/PrintLayout";
import { useAuth } from "@/components/AuthProvider";
import { parseISODateAsLocal } from "@/utils/dateOnly";
import { supabase } from "@/integrations/supabase/client";

// Função para formatar moeda
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
      
      // Buscar dados do cliente se existir
      if (result?.quote?.customer_name) {
        try {
          const empresa_id = empresa?.id;
          if (empresa_id) {
            const { data: customerData } = await supabase
              .from("customers")
              .select("address, phone, email, cpf_cnpj, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep")
              .eq("empresa_id", empresa_id)
              .ilike("name", result.quote.customer_name)
              .limit(1)
              .maybeSingle();
            
            if (customerData) {
              return { ...result, customerData };
            }
          }
        } catch (err) {
          console.warn("Erro ao buscar dados do cliente:", err);
        }
      }
      
      return result;
    },
    enabled: !!id && !!empresa?.id,
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
  console.log("Quote total_value:", (quote as any)?.total_value);
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
    total_value: Number((quote as any)?.total_value || 0),
    observations: String(quote?.observations || 'Sem observações'),
    date: String(quote?.date || new Date().toISOString().split('T')[0])
  };

  // Remover personalizações duplicadas
  const removeDuplicatePersonalizations = (personalizations: typeof quoteData.personalizations = []) => {
    if (!personalizations || personalizations.length === 0) return [];
    
    // Sempre usar conteúdo para verificar duplicatas, mesmo se houver ID
    const seenKeys = new Map<string, typeof personalizations[0]>();
    const uniqueItems: typeof personalizations = [];
    
    personalizations.forEach((item: any) => {
      // Criar chave baseada no conteúdo (normalizar para comparação)
      const personName = (item.person_name || '').trim().toLowerCase();
      const size = (item.size || '').trim().toLowerCase();
      const quantity = item.quantity || 1;
      const notes = (item.notes || '').trim().toLowerCase();
      
      const key = `${personName}_${size}_${quantity}_${notes}`;
      
      if (!seenKeys.has(key)) {
        seenKeys.set(key, item);
        uniqueItems.push(item);
      }
    });
    
    if (personalizations.length !== uniqueItems.length) {
      console.log(`✅ Removidas ${personalizations.length - uniqueItems.length} personalizações duplicadas do orçamento (impressão). Original: ${personalizations.length}, Único: ${uniqueItems.length}`);
    }
    
    return uniqueItems;
  };
  
  const personalizations = removeDuplicatePersonalizations(quoteData.personalizations || []);

  const safeItems = (items || []).map((item: any, index: number) => ({
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
            onClick={async () => {
              console.log("=== GERANDO PDF ORÇAMENTO PROFISSIONAL ===");
              console.log("Safe Quote:", safeQuote);
              console.log("Safe Items:", safeItems);
              console.log("Empresa:", empresa);

              // Calcular data de validade (7 dias a partir da data do orçamento)
              const quoteDate = parseISODateAsLocal(safeQuote.date);
              const validityDate = new Date(quoteDate);
              validityDate.setDate(validityDate.getDate() + 7);

              // Extrair dados "extras" das observações (sem mexer no layout do PDF)
              const extractPaymentMethod = (observations?: string | null): string | null => {
                if (!observations) return null;
                const match = observations.match(/Forma de pagamento:\s*([^\n\r]+)/i);
                return match?.[1]?.trim() || null;
              };

              const extractDeliveryDateBR = (observations?: string | null): string | null => {
                if (!observations) return null;
                // Tentar vários formatos
                const patterns = [
                  /Data de entrega[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
                  /Prazo de entrega[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
                  /Entrega[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
                  /Data de entrega estimada[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i
                ];
                
                for (const pattern of patterns) {
                  const match = observations.match(pattern);
                  if (match?.[1]) {
                    return match[1].trim();
                  }
                }
                return null;
              };

              const paymentMethodText = extractPaymentMethod(safeQuote.observations) ?? "A combinar";
              const deliveryDateText = extractDeliveryDateBR(safeQuote.observations) ?? "A combinar";

              // Buscar dados do cliente
              let customerAddress = "Não informado";
              let customerPhone = safeQuote.customer_phone || "Não informado";
              let customerCpfCnpj = "Não informado";
              
              if (empresa?.id && safeQuote.customer_name) {
                try {
                  const { data: customerData } = await supabase
                    .from("customers")
                    .select("address, phone, email, cpf_cnpj, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep")
                    .eq("empresa_id", empresa.id)
                    .ilike("name", safeQuote.customer_name)
                    .limit(1)
                    .maybeSingle();
                  
                  if (customerData) {
                    // Montar endereço completo
                    if (customerData.endereco_logradouro) {
                      const parts = [
                        customerData.endereco_logradouro,
                        customerData.endereco_numero,
                        customerData.endereco_complemento,
                        customerData.endereco_bairro,
                        customerData.endereco_cidade ? `${customerData.endereco_cidade}${customerData.endereco_uf ? '/' + customerData.endereco_uf : ''}` : '',
                        customerData.endereco_cep ? `CEP: ${customerData.endereco_cep}` : ''
                      ].filter(Boolean);
                      customerAddress = parts.join(', ');
                    } else if (customerData.address) {
                      customerAddress = customerData.address;
                    }
                    
                    customerPhone = customerData.phone || customerPhone;
                    customerCpfCnpj = customerData.cpf_cnpj || customerCpfCnpj;
                  }
                } catch (err) {
                  console.warn("Erro ao buscar dados do cliente:", err);
                }
              }

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
                      .cliente-titulo {
                        font-weight: bold;
                        font-size: 10px;
                        margin-bottom: 2px;
                        text-transform: uppercase;
                      }
                      .cliente-nome {
                        font-size: 11px;
                        font-weight: bold;
                        margin-bottom: 1px;
                      }
                      .cliente-endereco {
                        font-size: 10px;
                        margin-bottom: 1px;
                      }
                      .cliente-contato {
                        font-size: 10px;
                        margin-bottom: 1px;
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
                      .produtos-table .col-item { width: 4%; text-align: center; }
                      .produtos-table .col-desc { width: 40%; }
                      .produtos-table .col-qtd { width: 8%; text-align: center; }
                      .produtos-table .col-und { width: 6%; text-align: center; }
                      .produtos-table .col-valor { width: 12%; text-align: right; }
                      .produtos-table .col-total { width: 12%; text-align: right; font-weight: bold; }
                      .totalizadores-table {
                        width: 50%;
                        border-collapse: collapse;
                        font-size: 11px;
                      }
                      .totalizadores-table td {
                        padding: 3px 5px;
                        border: 1px solid #999;
                      }
                      .totalizadores-table .label { 
                        background: #f0f0f0; 
                        font-weight: bold; 
                      }
                      .totalizadores-table .valor { 
                        text-align: right; 
                        font-weight: bold;
                      }
                      .total-final {
                        background: #e0e0e0 !important;
                        font-weight: bold;
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
                      .assinatura-empresa {
                        font-weight: bold;
                        font-size: 12px;
                        margin-bottom: 15px;
                      }
                      .assinatura-cliente {
                        font-size: 11px;
                        margin-bottom: 15px;
                      }
                      .checkbox-line {
                        display: inline-block;
                        margin: 0 10px;
                        font-size: 11px;
                      }
                      .assinatura-linha {
                        margin-top: 15px;
                        border-top: 1px solid #000;
                        padding-top: 3px;
                        width: 300px;
                        display: inline-block;
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
                          <div>Endereço: ${customerAddress}</div>
                          <div>Telefone: ${customerPhone}</div>
                          <div>CPF/CNPJ: ${customerCpfCnpj}</div>
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
                          <td>${paymentMethodText}</td>
                          <td>-</td>
                          <td>${deliveryDateText}</td>
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
