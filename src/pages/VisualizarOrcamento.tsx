import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQuoteByCode } from "@/integrations/supabase/quotes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { useState } from "react";

export default function VisualizarOrcamento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { formatCurrency } = useInternationalization();
  const [imageError, setImageError] = useState(false);

  const { data: quoteData, isLoading, error } = useQuery({
    queryKey: ["quoteView", id],
    queryFn: async () => {
      if (!id) return null;
      return await getQuoteByCode(id);
    },
    enabled: !!id,
  });

  // Extrair URL do arquivo das observações
  const extractFileUrl = (observations?: string | null): string | null => {
    if (!observations) return null;
    
    // Procurar por padrões como "Arquivo/Arte: URL" ou "Arquivo: URL"
    const patterns = [
      /Arquivo\/Arte:\s*(https?:\/\/[^\s\n]+)/i,
      /Arquivo:\s*(https?:\/\/[^\s\n]+)/i,
      /file_url:\s*(https?:\/\/[^\s\n]+)/i,
      /(https?:\/\/[^\s\/]+\.supabase\.co\/storage\/[^\s\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = observations.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !quoteData || !quoteData.quote) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/orcamentos")}
              className="border-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </header>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Orçamento não encontrado</h2>
            <p className="text-gray-600 mb-4">O orçamento solicitado não foi encontrado.</p>
            <Button onClick={() => navigate("/orcamentos")}>
              Voltar para Orçamentos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const quote = quoteData.quote;
  const items = quoteData.items || [];
  const personalizations = quoteData.personalizations || [];
  const fileUrl = extractFileUrl(quote.observations);

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_value), 0);

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
                onClick={() => navigate(`/orcamentos/${quote.code}/impressao`)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Informações do Orçamento */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-semibold">{quote.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p>{new Date(quote.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p>{quote.customer_phone || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arte/Anexo */}
          {fileUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Arte / Anexo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                    <div className="space-y-3">
                      <div className="relative w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 flex items-center justify-center min-h-[300px] max-h-[600px] overflow-hidden">
                        {!imageError ? (
                          <img
                            src={fileUrl}
                            alt="Arte do orçamento"
                            className="max-w-full max-h-[550px] w-auto h-auto object-contain rounded-lg shadow-md"
                            onError={() => {
                              // Usar state do React ao invés de manipular DOM diretamente
                              setImageError(true);
                            }}
                          />
                        ) : (
                          <div className="p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-3">Arquivo não pode ser exibido como imagem</p>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Baixar arquivo
                            </a>
                          </div>
                        )}
                      </div>
                      {!imageError && (
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            Pré-visualização da arte anexada
                          </p>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Baixar arquivo completo
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                      <p className="text-sm text-muted-foreground mb-3">Arquivo anexado</p>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Baixar arquivo
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Produtos */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos e Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-left py-2 px-3">Descrição</th>
                      <th className="text-right py-2 px-3">Quantidade</th>
                      <th className="text-right py-2 px-3">Valor Unit.</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="border-b">
                        <td className="py-2 px-3">{index + 1}</td>
                        <td className="py-2 px-3">{item.description}</td>
                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.unit_value)}</td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {formatCurrency(item.quantity * item.unit_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted">
                      <td colSpan={4} className="py-3 px-3 text-right font-semibold">
                        Total
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-lg">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Personalizações */}
          {personalizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Personalizações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Nome</th>
                        <th className="text-center py-2 px-3">Tamanho</th>
                        <th className="text-right py-2 px-3">Quantidade</th>
                        <th className="text-left py-2 px-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personalizations.map((item, index) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-2 px-3 font-medium">{item.person_name}</td>
                          <td className="py-2 px-3 text-center">{item.size || "—"}</td>
                          <td className="py-2 px-3 text-right">{item.quantity}</td>
                          <td className="py-2 px-3">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {quote.observations && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {quote.observations.replace(/Arquivo\/Arte:\s*https?:\/\/[^\s\n]+/gi, '').trim()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

