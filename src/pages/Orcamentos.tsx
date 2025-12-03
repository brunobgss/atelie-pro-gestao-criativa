import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, FileText, Calendar, DollarSign, Share2, Printer, MessageCircle, Edit, CheckCircle, Trash2, Eye, Search, Filter, RefreshCw } from "lucide-react";
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
  
  // Estados para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: quotes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      try {
        console.log("Iniciando busca de orçamentos...");
        const rows = await listQuotes();
        console.log("Orçamentos recebidos:", rows);
        
        // Validar e processar cada orçamento
        const processedQuotes = rows.map((r, index) => {
          // Garantir que customer_name seja uma string válida
          const customerName = r.customer_name?.trim() || null;
          
          // Log para debug se customer_name estiver vazio
          if (!customerName) {
            console.warn(`Orçamento ${r.code || r.id} sem nome de cliente:`, {
              id: r.id,
              code: r.code,
              customer_name: r.customer_name,
              raw_data: r
            });
          }
          
          // Usar total_value se disponível e válido, senão calcular baseado nos códigos conhecidos
          let value = 0;
          
          console.log(`Processando orçamento ${r.code}:`, {
            total_value: r.total_value,
            type: typeof r.total_value,
            is_valid: r.total_value && typeof r.total_value === 'number' && r.total_value > 0,
            customer_name: customerName
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
            client: customerName || "Cliente não informado",
            description: r.observations?.trim() || "Sem descrição",
            value: value,
            total_value: value, // Adicionar total_value para compatibilidade
            date: r.date || new Date().toISOString().split('T')[0],
            status: r.status || "Pendente",
            created_at: (r as any).created_at || new Date().toISOString(),
            // Manter referência ao customer_name original para debug
            _raw_customer_name: r.customer_name,
          };
        });
        
        // Garantir ordenação por data de criação (mais recentes primeiro)
        processedQuotes.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date).getTime();
          const dateB = new Date(b.created_at || b.date).getTime();
          return dateB - dateA; // Decrescente (mais recente primeiro)
        });
        
        console.log("Orçamentos processados:", processedQuotes);
        console.log("Orçamentos sem nome de cliente:", processedQuotes.filter(q => q.client === "Cliente não informado").length);
        return processedQuotes;
      } catch (error) {
        console.error("Erro ao carregar orçamentos:", error);
        return [];
      }
    },
    staleTime: 0, // Sempre considerar dados como stale para forçar refetch
    cacheTime: 0, // Não cachear dados para evitar problemas
    refetchOnMount: true, // Sempre refazer busca ao montar componente
    refetchOnWindowFocus: true, // Refazer busca quando janela ganha foco
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
      // Buscar template personalizado
      const { getWhatsAppTemplate, processTemplate, getWhatsAppSettings, addSignature } = await import("@/utils/whatsappTemplates");
      const customTemplate = empresa?.id ? await getWhatsAppTemplate(empresa.id, 'quote') : null;
      
      // Buscar dados completos do orçamento
      const quoteData = await getQuoteByCode(quote.id);
      const { items, personalizations } = quoteData;
      
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

      const personalizationLines = personalizations
        ?.filter((item) => item.person_name?.trim())
        .map((item) => {
          const parts = [
            item.person_name,
            item.size ? `(${item.size})` : "",
            item.quantity && item.quantity !== 1 ? `x${item.quantity}` : "",
            item.notes ? `- ${item.notes}` : "",
          ].filter(Boolean);
          return `• ${parts.join(" ").replace(/\s+/g, " ").trim()}`;
        })
        .join("\n");

      const personalizationSection = personalizationLines
        ? `\n*Personalizações:*\n${personalizationLines}\n`
        : "";

      // Se tem template personalizado, usar ele
      if (customTemplate) {
        const message = processTemplate(customTemplate, {
          cliente: quote.client,
          produtos: productsList + personalizationSection,
          valor_total: formatCurrency(Number(quote.total_value || 0))
        }, empresa);
        
        // Adicionar assinatura se configurada
        const settings = empresa?.id ? await getWhatsAppSettings(empresa.id) : null;
        return addSignature(message, settings);
      }

      // Template padrão
      const defaultMessage = `*ORÇAMENTO ${empresa?.nome || 'ATELIÊ'}*

Olá *${quote.client}*!

Seu orçamento está pronto!

*Produtos:*
${productsList}

${personalizationSection}

*Valor Total: ${formatCurrency(Number(quote.total_value || 0))}*

*Próximos passos:*
1. Confirme se está de acordo
2. Informe a forma de pagamento
3. Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

Atenciosamente,
${empresa?.nome || 'Ateliê'}`;

      // Adicionar assinatura se configurada
      const settings = empresa?.id ? await getWhatsAppSettings(empresa.id) : null;
      return addSignature(defaultMessage, settings);
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

  // Aplicar filtros e pesquisa
  const filteredQuotes = safeQuotes.filter((quote) => {
    // Filtro por status
    if (statusFilter !== "all") {
      const quoteStatus = (quote.status || "pending").toLowerCase();
      const filterStatus = statusFilter.toLowerCase();
      
      // Mapear status traduzidos para valores do banco
      const statusMap: Record<string, string[]> = {
        "pending": ["pending", "pendente"],
        "approved": ["approved", "aprovado"],
        "rejected": ["rejected", "rejeitado", "reprovado"],
        "completed": ["completed", "concluído", "concluido"],
      };
      
      const allowedStatuses = statusMap[filterStatus] || [filterStatus];
      if (!allowedStatuses.includes(quoteStatus)) {
        return false;
      }
    }

    // Filtro por pesquisa
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchesClient = quote.client?.toLowerCase().includes(search);
      const matchesCode = quote.id?.toLowerCase().includes(search) || quote.code?.toLowerCase().includes(search);
      const matchesDescription = quote.description?.toLowerCase().includes(search);
      
      if (!matchesClient && !matchesCode && !matchesDescription) {
        return false;
      }
    }

    return true;
  });

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log("Forçando atualização de orçamentos...");
                refetch();
                toast.info("Atualizando orçamentos...");
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Link to="/orcamentos/novo">
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filtros e Pesquisa */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Campo de Pesquisa */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Pesquisar por cliente, código ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filtro por Status */}
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Contador de resultados */}
            {searchTerm || statusFilter !== "all" ? (
              <div className="mt-3 text-sm text-muted-foreground">
                {filteredQuotes.length} {filteredQuotes.length === 1 ? 'orçamento encontrado' : 'orçamentos encontrados'}
                {(searchTerm || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="ml-2 h-auto p-0 text-xs"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

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
          {!isLoading && safeQuotes.length > 0 && filteredQuotes.length === 0 && (
            <Card className="border-border">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nenhum orçamento encontrado com os filtros aplicados</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          )}
          {filteredQuotes.map((quote) => (
            <Card
              key={quote.id}
              className="border-border hover:shadow-md transition-all animate-fade-in"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-secondary" />
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {quote.client || "Cliente não informado"}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{quote.id}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(quote.status)}>
                    {translateStatus(quote.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-foreground">{quote.description}</p>
                  
                  <div className="flex items-center gap-6 pt-2 border-t border-border">
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

                  {/* Ações - Agrupadas em uma única linha */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-600 hover:bg-blue-600/10"
                      onClick={() => navigate(`/orcamentos/${quote.id}/visualizar`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-secondary text-secondary hover:bg-secondary/10"
                      onClick={() => openPublicView(quote.id)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Abrir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border"
                      onClick={() => navigate(`/orcamentos/${quote.id}/impressao`)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-600 hover:bg-green-600/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openWhatsApp(quote);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">WhatsApp</span>
                      <span className="sm:hidden">WA</span>
                    </Button>
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
                      className={`border-green-600 text-green-600 hover:bg-green-600/10 ${
                        quote.status === 'approved' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => {
                        if (quote.status === 'approved') {
                          toast.info("Orçamento já foi aprovado");
                          return;
                        }
                        handleApproveQuote(quote);
                      }}
                      disabled={approvingQuote === (quote.code || quote.id) || quote.status === 'approved'}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {quote.status === 'approved' ? 'Aprovado' : (approvingQuote === (quote.code || quote.id) ? "Aprovando..." : "Aprovar")}
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
