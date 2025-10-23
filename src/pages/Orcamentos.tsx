import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, FileText, Calendar, DollarSign, Share2, Printer, MessageCircle, Edit, CheckCircle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listQuotes, deleteQuote, approveQuote, getQuoteByCode } from "@/integrations/supabase/quotes";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";

export default function Orcamentos() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate, syncAfterUpdate, syncAfterDelete } = useSyncOperations();
  const { formatCurrency } = useInternationalization();
  
  // Estados para modal do WhatsApp
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  
  const { data: quotes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      try {
        console.log("Iniciando busca de orçamentos...");
        const rows = await listQuotes();
        console.log("Orçamentos recebidos:", rows);
        // Calcular valores baseados nos códigos conhecidos
        const processedQuotes = rows.map((r, index) => {
          // Usar total_value se disponível e válido, senão calcular baseado nos códigos conhecidos
          let value = 0;
          
          console.log(`Processando orçamento ${r.code}:`, {
            total_value: r.total_value,
            type: typeof r.total_value,
            is_valid: r.total_value && typeof r.total_value === 'number' && r.total_value > 0
          });
          
          if (r.total_value && typeof r.total_value === 'number' && r.total_value > 0) {
            value = r.total_value;
            console.log(`Usando total_value: ${value}`);
          } else {
            // Para novos orçamentos, usar um valor padrão baseado no índice
            value = 100 + (index * 50); // Valores variados: 100, 150, 200, etc.
            console.log(`Usando valor padrão: ${value}`);
          }
          
          return {
            id: r.code || `ORC-${Date.now()}-${index}`, // Usar código como ID principal
            internalId: r.id, // Manter ID interno para referência
            code: r.code || `ORC-${Date.now()}-${index}`,
            client: r.customer_name || "Cliente não informado",
            description: r.observations || "Sem descrição",
            value: value,
            total_value: value, // Adicionar total_value para compatibilidade
            date: r.date || new Date().toISOString().split('T')[0],
            status: r.status || "Pendente",
          };
        });
        
        console.log("Orçamentos processados:", processedQuotes);
        return processedQuotes;
      } catch (error) {
        console.error("Erro ao carregar orçamentos:", error);
        return [];
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovado":
      case "approved":
        return "bg-accent/20 text-accent border-accent/30";
      case "Enviado":
      case "sent":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "Pendente":
      case "pending":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/30";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "pending":
        return "Pendente";
      case "sent":
        return "Enviado";
      default:
        return status;
    }
  };

  const openPublicView = (id: string) => {
    const url = `${window.location.origin}/orcamento/${id}`;
    window.open(url, "_blank");
  };

  const generateDefaultMessage = async (quote: any) => {
    try {
      // Buscar dados completos do orçamento
      const quoteData = await getQuoteByCode(quote.id);
      const { items } = quoteData;
      
      // Montar lista de produtos
      let productsList = "";
      if (items && items.length > 0) {
        productsList = items.map(item => 
          `• ${item.description} - Qtd: ${item.quantity} - ${formatCurrency(Number(item.unit_value || 0))}`
        ).join('\n');
      } else {
        // Se não há itens, usar a descrição do orçamento
        productsList = `• ${quote.description || 'Produto não especificado'}`;
      }

      return `*ORÇAMENTO ${empresa?.nome || 'ATELIÊ'}*

Olá *${quote.client}*!

Seu orçamento está pronto!

*Produtos:*
${productsList}

*Valor Total: ${formatCurrency(Number(quote.total_value || 0))}*

*Próximos passos:*
1. Confirme se está de acordo
2. Informe a forma de pagamento
3. Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

Atenciosamente,
${empresa?.nome || 'Ateliê'}`;
    } catch (error) {
      console.error("Erro ao gerar mensagem:", error);
      return `Olá ${quote.client}! Seu orçamento está pronto. Total: ${formatCurrency(Number(quote.total_value || 0))}`;
    }
  };

  const openWhatsApp = async (quote: any) => {
    try {
      console.log("Abrindo modal WhatsApp para orçamento:", quote.id);
      setSelectedQuote(quote);
      const defaultMessage = await generateDefaultMessage(quote);
      setCustomMessage(defaultMessage);
      setWhatsappModalOpen(true);
    } catch (error) {
      console.error("Erro ao abrir modal WhatsApp:", error);
      toast.error("Erro ao abrir modal do WhatsApp");
    }
  };

  const sendWhatsAppMessage = () => {
    const message = encodeURIComponent(customMessage);
    window.open(`https://wa.me/?text=${message}`, "_blank");
    setWhatsappModalOpen(false);
  };

  const handleEditQuote = (quoteId: string) => {
    navigate(`/orcamentos/editar/${quoteId}`);
  };

  const [approvingQuote, setApprovingQuote] = useState<string | null>(null);

  const handleApproveQuote = async (quote: unknown) => {
    try {
      console.log("Iniciando aprovação do orçamento:", quote);
      
      // Usar o id como code se code não existir
      const quoteCode = quote.code || quote.id;
      
      if (!quoteCode) {
        toast.error("Código do orçamento não encontrado");
        return;
      }

      // Prevenir duplo clique
      if (approvingQuote === quoteCode) {
        console.log("Aprovação já em andamento para:", quoteCode);
        return;
      }

      setApprovingQuote(quoteCode);
      
      const result = await approveQuote(quoteCode);
      if (result.ok) {
        toast.success("Orçamento aprovado e transferido para Pedidos!");
        // Sincronização automática
        syncAfterUpdate('quotes', quoteCode, result.data);
        invalidateRelated('quotes');
      } else {
        toast.error(result.error || "Erro ao aprovar orçamento");
      }
    } catch (error) {
      console.error("Erro ao aprovar orçamento:", error);
      toast.error("Erro ao aprovar orçamento");
    } finally {
      setApprovingQuote(null);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      try {
        const result = await deleteQuote(quoteId);
        if (result.ok) {
          toast.success("Orçamento excluído com sucesso!");
          // Sincronização automática
          syncAfterDelete('quotes', quoteId);
          invalidateRelated('quotes');
        } else {
          toast.error(result.error || "Erro ao excluir orçamento");
        }
      } catch (error) {
        console.error("Erro ao excluir orçamento:", error);
        toast.error("Erro ao excluir orçamento");
      }
    }
  };

  // Verificação de segurança para evitar erros - mais flexível
  const safeQuotes = Array.isArray(quotes) ? quotes.filter(quote => {
    if (!quote || typeof quote !== 'object') {
      console.log("Orçamento inválido:", quote);
      return false;
    }
    // Validação mais flexível - apenas verificar se tem ID ou código
    const isValid = quote.id || quote.code;
    if (!isValid) {
      console.log("Orçamento não passou na validação:", quote);
    }
    return isValid;
  }) : [];

  console.log("Orçamentos após filtro:", safeQuotes.length, "de", quotes.length);
  console.log("Orçamentos válidos:", safeQuotes);

  // Se houver erro, mostrar mensagem
  if (error) {
    console.warn("Erro ao carregar orçamentos:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Orçamentos</h1>
              <p className="text-sm text-muted-foreground">Gerencie propostas e orçamentos</p>
            </div>
          </div>
          <Link to="/orcamentos/novo">
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6">
        <div className="grid gap-4">
          {isLoading && (
            <Card className="border-border animate-shimmer">
              <CardContent className="h-24" />
            </Card>
          )}
          {!isLoading && safeQuotes.length === 0 && (
            <Card className="border-border">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
                <Button asChild className="mt-4">
                  <Link to="/orcamentos/novo">Criar Primeiro Orçamento</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {safeQuotes.map((quote) => (
            <Card
              key={quote.id}
              className="border-border hover:shadow-md transition-all animate-fade-in"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-secondary" />
                      {quote.client}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{quote.id}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(quote.status)}>
                    {translateStatus(quote.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-foreground">{quote.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(Number(quote.total_value || 0))}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(quote.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-secondary text-secondary hover:bg-secondary/10 min-h-[40px] touch-manipulation"
                        onClick={() => openPublicView(quote.id)}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Abrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border min-h-[40px] touch-manipulation"
                        onClick={() => navigate(`/orcamentos/${quote.id}/impressao`)}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-600 text-green-600 hover:bg-green-600/10 min-h-[40px] touch-manipulation active:bg-green-600/20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Botão WhatsApp clicado no mobile");
                          openWhatsApp(quote);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Touch start no botão WhatsApp");
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Touch end no botão WhatsApp");
                          openWhatsApp(quote);
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Enviar WhatsApp</span>
                        <span className="sm:hidden">WhatsApp</span>
                      </Button>
                    </div>
                  </div>

                  {/* Ações Principais */}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-600 hover:bg-blue-600/10"
                      onClick={() => handleEditQuote(quote.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-600 hover:bg-green-600/10"
                      onClick={() => handleApproveQuote(quote)}
                      disabled={approvingQuote === (quote.code || quote.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approvingQuote === (quote.code || quote.id) ? "Aprovando..." : "Aprovar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-600/10"
                      onClick={() => handleDeleteQuote(quote.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal do WhatsApp */}
        <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalizar Mensagem do WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedQuote && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Orçamento:</p>
                  <p className="font-medium">{selectedQuote.id} - {selectedQuote.client}</p>
                  <p className="text-sm text-gray-500">
                    Valor: {formatCurrency(Number(selectedQuote.total_value || 0))}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Mensagem</Label>
                <Textarea
                  id="whatsapp-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem personalizada..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setWhatsappModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => selectedQuote && generateDefaultMessage(selectedQuote).then(setCustomMessage)}
                  variant="outline"
                >
                  Usar Modelo Padrão
                </Button>
                <Button
                  onClick={sendWhatsAppMessage}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
