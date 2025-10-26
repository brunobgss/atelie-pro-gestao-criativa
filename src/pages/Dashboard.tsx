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
      return today > deliveryDate && order.status !== "Entregue" && order.status !== "Cancelado"; // Excluir pedidos cancelados
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
      return totalValue > paidAmount && order.status !== "Cancelado"; // Excluir pedidos cancelados
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
      return diffDays <= 3 && diffDays >= 0 && order.status !== "Entregue" && order.status !== "Cancelado"; // Excluir pedidos cancelados
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
    <PageTransition className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      {/* Header */}
      <FadeIn className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
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

      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
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
              <Card className="bg-gradient-to-br from-white via-purple-50/30 to-white border border-purple-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pedidos em Andamento
                  </CardTitle>
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-md">
                    <Package className="h-7 w-7 text-purple-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="text-5xl font-bold text-gray-900 mb-3">{orders.length}</div>
                  <div className="flex items-center gap-2 mt-3">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-gray-600 font-medium">
                      {orders.filter(o => o.status === "Em produção" && o.status !== "Cancelado").length} em produção
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white via-blue-50/30 to-white border border-blue-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Em Producao
                  </CardTitle>
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-md">
                    <Clock className="h-7 w-7 text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="text-5xl font-bold text-gray-900 mb-3">
                    {orders.filter(o => o.status === "Em produção" && o.status !== "Cancelado").length}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-sm text-gray-600 font-medium">
                      {orders.filter(o => {
                        if (!o.delivery_date) return false;
                        const deliveryDate = new Date(o.delivery_date);
                        const today = new Date();
                        const diffTime = deliveryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 3 && diffDays >= 0 && o.status !== "Cancelado"; // Excluir pedidos cancelados
                      }).length} com prazo proximo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white via-green-50/30 to-white border border-green-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Concluidos Hoje
                  </CardTitle>
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-md">
                    <CheckCircle className="h-7 w-7 text-green-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="text-5xl font-bold text-gray-900 mb-3">
                    {orders.filter(o => o.status === "Pronto" && o.status !== "Cancelado").length}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-sm text-gray-600 font-medium">
                      {orders.filter(o => o.status === "Aguardando retirada" && o.status !== "Cancelado").length} aguardando retirada
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-white border border-purple-300/50 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                  <CardTitle className="text-sm font-medium text-purple-700">
                    Receita do Mes
                  </CardTitle>
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-7 w-7 text-purple-800" />
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="text-5xl font-bold text-purple-700 mb-3">
                    {formatCurrency(orders.filter(o => o.status !== "Cancelado").reduce((sum, order) => sum + (Number(order.value) || 0), 0))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-purple-700 font-semibold">
                      {formatCurrency(orders.filter(o => o.status !== "Cancelado").reduce((sum, order) => sum + (Number(order.paid) || 0), 0))} recebido
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Acoes Rapidass */}
        <FadeIn>
          <Card className="bg-white border border-gray-200/50 shadow-md">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <MobileGrid cols={2} className="gap-5">
                <MobileCard 
                  onClick={() => navigate("/calculadora")}
                  interactive
                  className="h-28 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 border-2 border-blue-300/40 hover:border-blue-400 hover:shadow-xl hover:scale-105 rounded-3xl transition-all animate-fade-in-up"
                >
                  <div className="w-12 h-12 rounded-3xl bg-blue-200 flex items-center justify-center">
                    <Calculator className="w-7 h-7 text-blue-700" />
                  </div>
                  <span className="text-blue-800 font-bold text-sm text-center">Calculadora de Preços</span>
                </MobileCard>
                
                <MobileCard 
                  onClick={() => navigate("/catalogo")}
                  interactive
                  className="h-28 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-green-100 via-green-50 to-green-100 border-2 border-green-300/40 hover:border-green-400 hover:shadow-xl hover:scale-105 rounded-3xl transition-all animate-fade-in-up"
                >
                  <div className="w-12 h-12 rounded-3xl bg-green-200 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-green-700" />
                  </div>
                  <span className="text-green-800 font-bold text-sm text-center">Catálogo de Produtos</span>
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
                  className="h-28 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-100 border-2 border-emerald-300/40 hover:border-emerald-400 hover:shadow-xl hover:scale-105 rounded-3xl transition-all animate-fade-in-up"
                >
                  <div className="w-12 h-12 rounded-3xl bg-emerald-200 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-emerald-700" />
                  </div>
                  <span className="text-emerald-800 font-bold text-sm text-center">Template WhatsApp</span>
                </MobileCard>
                
                <MobileCard 
                  onClick={() => navigate("/relatorios")}
                  interactive
                  className="h-28 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 border-2 border-purple-300/40 hover:border-purple-400 hover:shadow-xl hover:scale-105 rounded-3xl transition-all animate-fade-in-up"
                >
                  <div className="w-12 h-12 rounded-3xl bg-purple-200 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-purple-700" />
                  </div>
                  <span className="text-purple-800 font-bold text-sm text-center">Relatórios</span>
                </MobileCard>
              </MobileGrid>
          </CardContent>
        </Card>
        </FadeIn>

        {/* Centro de Alertas Inteligentes */}
        <FadeIn>
          <Card className="bg-gradient-to-br from-white via-purple-50/20 to-white border border-purple-200/50 shadow-xl">
          <CardHeader className="border-b border-purple-100 px-6 pt-6 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-md">
                  <Bell className="w-7 h-7 text-purple-700" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    Centro de Alertas Inteligentes
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-0.5">Acompanhe o status do seu negócio</p>
                </div>
                {intelligentAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs font-bold px-3 py-1">
                    {intelligentAlerts.length}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/agenda")}
                  className="text-blue-700 border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-400 font-semibold"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Ver Agenda
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/financeiro")}
                  className="text-green-700 border-green-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 hover:border-green-400 font-semibold"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Ver Financeiro
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {intelligentAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <CheckCircle className="w-12 h-12 text-green-700" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Tudo em ordem! 🎉</h3>
                <p className="text-gray-600 text-lg">Nenhum alerta crítico no momento</p>
              </div>
            ) : (
              <div className="space-y-5">
                {intelligentAlerts.map((alert) => {
                  const IconComponent = alert.icon;
                  
                  return (
                    <div
                      key={alert.id}
                      className={`p-6 rounded-2xl border-2 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                        alert.color === 'red' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300 hover:border-red-400' :
                        alert.color === 'orange' ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-300 hover:border-orange-400' :
                        alert.color === 'blue' ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 hover:border-blue-400' :
                        'bg-gradient-to-br from-green-50 to-green-100/50 border-green-300 hover:border-green-400'
                      }`}
                      onClick={alert.action}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${
                            alert.color === 'red' ? 'bg-gradient-to-br from-red-100 to-red-200' :
                            alert.color === 'orange' ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
                            alert.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                            'bg-gradient-to-br from-green-100 to-green-200'
                          }`}>
                            <IconComponent className={`w-8 h-8 ${
                              alert.color === 'red' ? 'text-red-700' :
                              alert.color === 'orange' ? 'text-orange-700' :
                              alert.color === 'blue' ? 'text-blue-700' :
                              'text-green-700'
                            }`} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-lg text-gray-900">{alert.title}</h3>
                              <Badge 
                                variant="outline" 
                                className={`font-bold text-xs ${
                                  alert.priority === 'high' ? 'bg-red-100 text-red-800 border-red-400' :
                                  alert.priority === 'medium' ? 'bg-orange-100 text-orange-800 border-orange-400' :
                                  'bg-blue-100 text-blue-800 border-blue-400'
                                }`}
                              >
                                {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baixa'}
                              </Badge>
                            </div>
                            <p className={`text-sm font-medium ${
                              alert.color === 'red' ? 'text-red-700' :
                              alert.color === 'orange' ? 'text-orange-700' :
                              alert.color === 'blue' ? 'text-blue-700' :
                              'text-green-700'
                            }`}>{alert.message}</p>
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
                            className="text-green-700 border-green-400 hover:bg-gradient-to-r hover:from-green-100 hover:to-green-50 hover:border-green-500 font-semibold shadow-sm hover:shadow-md transition-all"
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
