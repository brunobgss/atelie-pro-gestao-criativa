import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import logoAteliePro from "@/assets/logo-atelie-pro.png";
import { getQuoteByCode } from "@/integrations/supabase/quotes";

type QuoteItem = { description: string; quantity: number; value: number };
type QuotePersonalization = { personName: string; size?: string; quantity: number; notes?: string };
type Quote = {
  id: string;
  client: string;
  date: string; // ISO
  items: QuoteItem[];
  personalizations: QuotePersonalization[];
  observations?: string;
};


export default function OrcamentoPublico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const code = id as string;
  const { data } = useQuery({
    queryKey: ["quote", code],
    queryFn: () => getQuoteByCode(code),
    enabled: Boolean(code),
  });
  const quote = useMemo(() => {
    if (data?.quote) {
      // Remover personalizações duplicadas
      const removeDuplicatePersonalizations = (personalizations: typeof data.personalizations = []) => {
        if (!personalizations || personalizations.length === 0) return [];
        
        // Sempre usar conteúdo para verificar duplicatas, mesmo se houver ID
        const seenKeys = new Map<string, typeof personalizations[0]>();
        const uniqueItems: typeof personalizations = [];
        
        personalizations.forEach((item) => {
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
          console.log(`✅ Removidas ${personalizations.length - uniqueItems.length} personalizações duplicadas do orçamento público. Original: ${personalizations.length}, Único: ${uniqueItems.length}`);
        }
        
        return uniqueItems;
      };
      
      const uniquePersonalizations = removeDuplicatePersonalizations(data.personalizations ?? []);
      
      return {
        id: data.quote.code,
        client: data.quote.customer_name,
        date: data.quote.date,
        items: (data.items ?? []).map((it) => ({ description: it.description, quantity: it.quantity, value: it.unit_value || 0 })),
        personalizations: uniquePersonalizations.map((person) => ({
          personName: person.person_name ?? "",
          size: person.size ?? "",
          quantity: person.quantity ?? 1,
          notes: person.notes ?? "",
        })),
        observations: data.quote.observations ?? undefined,
      } as Quote;
    }
    return null;
  }, [data]);

  const total = quote?.items.reduce((sum, item) => sum + item.quantity * item.value, 0) ?? 0;

  if (!quote) {
    return (
      <div className="min-h-screen bg-white text-black p-6">
        <div className="max-w-3xl mx-auto">
          <p>Orçamento não encontrado.</p>
          <button className="underline" onClick={() => navigate("/")}>Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <img src={logoAteliePro} alt="Ateliê Pro" className="h-8" />
          <div className="text-right">
            <p className="font-semibold">Orçamento {quote.id}</p>
            <p className="text-sm">Data: {new Date(quote.date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <Card className="shadow-none border">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{quote.client}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qtd</th>
                    <th className="text-right py-2">Valor (R$)</th>
                    <th className="text-right py-2">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 pr-4">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{item.value.toFixed(2)}</td>
                      <td className="py-2 text-right">{(item.quantity * item.value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-3 text-right font-semibold">Total</td>
                    <td className="py-3 text-right font-bold">R$ {total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {quote.personalizations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Personalizações</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Nome</th>
                        <th className="text-center py-2">Tamanho</th>
                        <th className="text-right py-2">Quantidade</th>
                        <th className="text-left py-2">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.personalizations.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 pr-4">{item.personName}</td>
                          <td className="py-2 text-center">{item.size || "—"}</td>
                          <td className="py-2 text-right">{item.quantity}</td>
                          <td className="py-2 text-left">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {quote.observations && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p>{quote.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 no-print">
          <button
            onClick={() => navigate("/orcamentos")}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Voltar aos Orçamentos
          </button>
          <button
            onClick={() => {
              console.log("=== GERANDO PDF ORÇAMENTO ===");
              
              // Função formatCurrency
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

              // Dados seguros
              const safeQuote = {
                code: String(quote.id || 'N/A'),
                customer_name: String(quote.client || 'Cliente não informado'),
                customer_phone: String('Não informado'),
                total_value: Number(total || 0),
                observations: String(quote.observations || 'Sem observações'),
                date: String(quote.date || new Date().toISOString().split('T')[0])
              };

              const safeItems = (quote.items || []).map((item, index) => ({
                index: index + 1,
                description: String(item.description || 'Produto personalizado'),
                quantity: Number(item.quantity || 1),
                unit_value: Number(item.value || 0),
                total: Number(item.quantity || 1) * Number(item.value || 0)
              }));

              const safePersonalizations = (quote.personalizations || []).map((item, index) => ({
                index: index + 1,
                person_name: String(item.personName || "Cliente"),
                size: item.size ? String(item.size) : "—",
                quantity: Number(item.quantity || 1),
                notes: item.notes ? String(item.notes) : "",
              }));

              // Calcular data de validade (7 dias a partir da data do orçamento)
              const quoteDate = new Date(safeQuote.date);
              const validityDate = new Date(quoteDate);
              validityDate.setDate(validityDate.getDate() + 7);

              // Dados da empresa (precisamos buscar do contexto)
              const empresaNome = "Empresa";
              const empresaCNPJ = "Não informado";
              const empresaTelefone = "Não informado";
              const empresaEndereco = "Não informado";
              const empresaResponsavel = "Não informado";

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

              // Abrir nova janela e escrever o HTML
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(pdfHtml);
                printWindow.document.close();
                
                // Aguardar o conteúdo carregar completamente
                printWindow.onload = () => {
                  setTimeout(() => {
                    printWindow.print();
                  }, 1000);
                };
                
                // Fallback caso onload não funcione
                setTimeout(() => {
                  if (!printWindow.closed) {
                    printWindow.print();
                  }
                }, 2000);
              }
            }}
            className="px-6 py-2 bg-black text-white rounded"
          >
            Imprimir
          </button>
          <button
            onClick={() => navigator.share?.({ title: `Orçamento ${quote.id}`, url: window.location.href }).catch(() => {})}
            className="px-4 py-2 rounded border"
          >
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}


