import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Plus, TrendingUp, MessageCircle, Calculator, BookOpen, AlertTriangle, Bell, DollarSign, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import { TrialBannerSmall } from "@/components/TrialBannerSmall";
import { PaymentExpirationWarning } from "@/components/PaymentExpirationWarning";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";
import { listReceitas } from "@/integrations/supabase/receitas";
import { listInventory } from "@/integrations/supabase/inventory";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { startStockAlerts, checkStockNow } from "@/utils/stockAlerts";
import { LoadingCard, SkeletonCard } from "@/components/ui/loading";
import { PageTransition, StaggeredAnimation, FadeIn } from "@/components/ui/page-transition";
import { MobileCard, MobileGrid } from "@/components/ui/mobile-form";
import React from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { formatCurrency } = useInternationalization();
  
  // Iniciar sistema de alertas de estoque
  React.useEffect(() => {
    startStockAlerts();
    return () => {
      // Cleanup sera feito pelo proprio sistema
    };
  }, []);
  
  // Buscar dados reais das APIs com loading states
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
  });

  const { data: receitas = [], isLoading: receitasLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: listReceitas,
  });

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  const isLoading = ordersLoading || quotesLoading || receitasLoading || inventoryLoading;

  // Funcao para enviar WhatsApp
  const sendWhatsApp = (message: string) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Mensagem do WhatsApp preparada!");
  };

  // Processar alertas inteligentes
  const getIntelligentAlerts = () => {
    const alerts = [];

    // 1. Pedidos atrasados (da Agenda)
    const overdueOrders = orders.filter(order => {
      if (!order.delivery_date) return false;
      const deliveryDate = new Date(order.delivery_date);
      const today = new Date();
      return today > deliveryDate && order.status !== "Entregue";
    });

    overdueOrders.forEach(order => {
      alerts.push({
        id: `overdue-${order.id}`,
        type: "overdue",
        priority: "high",
        title: "Pedido Atrasado",
        message: `${order.code} - ${order.customer_name}`,
        icon: AlertTriangle,
        color: "red",
        action: () => {
          const message = `Olá ${order.customer_name}!

Lembramos que seu pedido ${order.code} estava previsto para entrega em ${new Date(order.delivery_date).toLocaleDateString('pt-BR')}.

*DETALHES:*
• Tipo: ${order.type}
• Status: ${order.status}
• Valor: R$ ${order.value?.toFixed(2) || '0,00'}

Por favor, entre em contato para agendarmos a entrega.

_${empresa?.nome || 'Atelie'}_`;
          sendWhatsApp(message);
        }
      });
    });

    // 2. Pagamentos pendentes (do Financeiro)
    const pendingPayments = orders.filter(order => {
      const totalValue = Number(order.value || 0);
      const paidAmount = Number(order.paid || 0);
      return totalValue > paidAmount;
    });

    pendingPayments.slice(0, 3).forEach(order => {
      const totalValue = Number(order.value || 0);
      const paidAmount = Number(order.paid || 0);
      const remaining = totalValue - paidAmount;
      
      alerts.push({
        id: `payment-${order.id}`,
        type: "payment",
        priority: "medium",
        title: "Pagamento Pendente",
        message: `${order.code} - R$ ${remaining.toFixed(2)} restante`,
        icon: DollarSign,
        color: "orange",
        action: () => {
          const message = `Olá ${order.customer_name}!

Lembramos sobre o pagamento do pedido ${order.code}.

*VALORES:*
• Total: R$ ${totalValue.toFixed(2)}
• Pago: R$ ${paidAmount.toFixed(2)}
• Restante: R$ ${remaining.toFixed(2)}

Por favor, entre em contato para quitar o saldo.

_${empresa?.nome || 'Atelie'}_`;
          sendWhatsApp(message);
        }
      });
    });

    // 3. Estoque crítico (do Estoque)
    const criticalItems = inventory.filter(item => item.status === "critical");
    
    criticalItems.slice(0, 2).forEach(item => {
      alerts.push({
        id: `stock-${item.id}`,
        type: "stock",
        priority: "high",
        title: "Estoque Critico",
        message: `${item.name} - ${item.quantity} ${item.unit}`,
        icon: Package,
        color: "red",
        action: () => {
          const message = `*ALERTA DE ESTOQUE*

Item: ${item.name}
Quantidade atual: ${item.quantity} ${item.unit}
Status: CRITICO

E necessario repor urgentemente este item!`;
          sendWhatsApp(message);
        }
      });
    });

    // 4. Orçamentos aguardando aprovação
    const pendingQuotes = quotes.filter(quote => quote.status === "pending");
    
    pendingQuotes.slice(0, 2).forEach(quote => {
      alerts.push({
        id: `quote-${quote.id}`,
        type: "quote",
        priority: "medium",
        title: "Orcamento Pendente",
        message: `${quote.code} - ${quote.customer_name}`,
        icon: Calendar,
        color: "blue",
        action: () => {
          const message = `Olá ${quote.customer_name}!

Seu orcamento ${quote.code} esta pronto e aguardando aprovacao.

*VALOR TOTAL: R$ ${quote.total_value?.toFixed(2) || '0,00'}*

Por favor, confirme se esta de acordo ou entre em contato para ajustes.

_${empresa?.nome || 'Atelie'}_`;
          sendWhatsApp(message);
        }
      });
    });

    // 5. Pedidos próximos do prazo (próximos 3 dias)
    const urgentOrders = orders.filter(order => {
      if (!order.delivery_date) return false;
      const deliveryDate = new Date(order.delivery_date);
      const today = new Date();
      const diffTime = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0 && order.status !== "Entregue";
    });

    urgentOrders.slice(0, 2).forEach(order => {
      const deliveryDate = new Date(order.delivery_date);
      const today = new Date();
      const diffTime = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      alerts.push({
        id: `urgent-${order.id}`,
        type: "urgent",
        priority: "high",
        title: "Prazo Proximo",
        message: `${order.code} - ${diffDays} dias restantes`,
        icon: Clock,
        color: "orange",
        action: () => {
          const message = `Olá ${order.customer_name}!

Seu pedido ${order.code} tem entrega prevista para ${deliveryDate.toLocaleDateString('pt-BR')} (${diffDays} dias).

*STATUS ATUAL: ${order.status}*

Em caso de duvidas sobre o andamento, entre em contato conosco!

_${empresa?.nome || 'Atelie'}_`;
          sendWhatsApp(message);
        }
      });
    });

    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const intelligentAlerts = getIntelligentAlerts();

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <FadeIn className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <MobileSidebarTrigger />
              <div className="text-center flex-1">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 text-xs">Visao geral do seu negocio</p>
              </div>
              <div className="w-12"></div> {/* Spacer */}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate("/orcamentos/novo")} 
                variant="outline" 
                size="sm"
                className="flex-1 bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-xs">Orcamento</span>
              </Button>
              <Button 
                onClick={() => navigate("/pedidos/novo")} 
                size="sm"
                className="flex-1 bg-gray-900 text-white hover:bg-gray-800 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-xs">Pedido</span>
              </Button>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 text-sm mt-0.5">Visao geral do seu negocio</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate("/orcamentos/novo")} 
                variant="outline" 
                size="lg"
                className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Orcamento
              </Button>
              <Button 
                onClick={() => navigate("/pedidos/novo")} 
                size="lg"
                className="bg-gray-900 text-white hover:bg-gray-800 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Pedido
              </Button>
            </div>
          </div>
        </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Banner de Trial */}
        <TrialBannerSmall />
        
        {/* Aviso de Vencimento de Pagamento */}
        <PaymentExpirationWarning />
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <Card className="bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pedidos em Andamento
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">{orders.length}</div>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-secondary" />
                    <p className="text-xs text-secondary font-medium">
                      {orders.filter(o => o.status === "Em produção").length} em produção
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Em Producao
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-secondary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">
                    {orders.filter(o => o.status === "Em produção").length}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {orders.filter(o => {
                        if (!o.delivery_date) return false;
                        const deliveryDate = new Date(o.delivery_date);
                        const today = new Date();
                        const diffTime = deliveryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 3 && diffDays >= 0;
                      }).length} com prazo proximo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Concluidos Hoje
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">
                    {orders.filter(o => o.status === "Pronto").length}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {orders.filter(o => o.status === "Aguardando retirada").length} aguardando retirada
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Receita do Mes
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">
                    {formatCurrency(orders.reduce((sum, order) => sum + (Number(order.value) || 0), 0))}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-secondary" />
                    <p className="text-xs text-secondary font-medium">
                      {formatCurrency(orders.reduce((sum, order) => sum + (Number(order.paid) || 0), 0))} recebido
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Acoes Rapidass */}
        <FadeIn>
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileGrid cols={2} className="gap-4">
                <MobileCard 
                  onClick={() => navigate("/calculadora")}
                  interactive
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 animate-fade-in-up"
                >
                  <Calculator className="w-6 h-6 text-blue-600" />
                  <span className="text-blue-700 font-medium text-sm text-center">Calculadora de Preços</span>
                </MobileCard>
                
                <MobileCard 
                  onClick={() => navigate("/catalogo")}
                  interactive
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200 animate-fade-in-up"
                >
                  <BookOpen className="w-6 h-6 text-green-600" />
                  <span className="text-green-700 font-medium text-sm text-center">Catálogo de Produtos</span>
                </MobileCard>
                
                <MobileCard 
                  onClick={() => {
                    const message = `Olá!

Sou do ${empresa?.nome || 'Atelie'} e gostaria de saber como posso ajudar voce hoje!

*NOSSOS SERVICOS:*
• Bordados computadorizados
• Uniformes personalizados  
• Camisetas estampadas
• Produtos personalizados

*Entre em contato conosco para um orcamento personalizado!*

_${empresa?.nome || 'Atelie'} - Qualidade e criatividade em cada peca_`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  interactive
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200 animate-fade-in-up"
                >
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-700 font-medium text-sm text-center">Template WhatsApp</span>
                </MobileCard>
                
                <MobileCard 
                  onClick={() => navigate("/relatorios")}
                  interactive
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200 animate-fade-in-up"
                >
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <span className="text-purple-700 font-medium text-sm text-center">Relatórios</span>
                </MobileCard>
              </MobileGrid>
          </CardContent>
        </Card>
        </FadeIn>

        {/* Centro de Alertas Inteligentes */}
        <FadeIn>
          <Card className="bg-white/95 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                Centro de Alertas Inteligentes
                {intelligentAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {intelligentAlerts.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/agenda")}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Ver Agenda
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/financeiro")}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Ver Financeiro
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {intelligentAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo em ordem! 🎉</h3>
                <p className="text-gray-600">Nenhum alerta crítico no momento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {intelligentAlerts.map((alert) => {
                  const IconComponent = alert.icon;
                  const colorClasses = {
                    red: "bg-red-50 border-red-200 text-red-800",
                    orange: "bg-orange-50 border-orange-200 text-orange-800", 
                    blue: "bg-blue-50 border-blue-200 text-blue-800",
                    green: "bg-green-50 border-green-200 text-green-800"
                  };
                  
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${colorClasses[alert.color]} hover:shadow-md transition-all cursor-pointer`}
                      onClick={alert.action}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            alert.color === 'red' ? 'bg-red-100 text-red-600' :
                            alert.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                            alert.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{alert.title}</h3>
                              <Badge 
                                variant="outline" 
                                className={
                                  alert.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                                  alert.priority === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                  'bg-blue-100 text-blue-700 border-blue-300'
                                }
                              >
                                {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baixa'}
                              </Badge>
                            </div>
                            <p className="text-sm opacity-80">{alert.message}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert.action();
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </FadeIn>
      </div>
      </FadeIn>
    </PageTransition>
  );
}
