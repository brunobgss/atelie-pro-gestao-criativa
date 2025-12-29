import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Plus, TrendingUp, MessageCircle, Calculator, BookOpen, AlertTriangle, Bell, DollarSign, Users, Calendar, FileText } from "lucide-react";
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
import { DashboardControls, useDashboardControls } from "@/components/DashboardControls";
import { supabase } from "@/integrations/supabase/client";
import React, { useMemo, lazy, Suspense } from "react";

// Lazy loading de componentes pesados para melhorar performance
const ChatWidget = lazy(() => import("@/components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const OnboardingChecklist = lazy(() => import("@/components/OnboardingChecklist").then(m => ({ default: m.OnboardingChecklist })));
const ValueDashboard = lazy(() => import("@/components/ValueDashboard").then(m => ({ default: m.ValueDashboard })));
const AchievementsBadges = lazy(() => import("@/components/AchievementsBadges").then(m => ({ default: m.AchievementsBadges })));
const ReferralProgram = lazy(() => import("@/components/ReferralProgram").then(m => ({ default: m.ReferralProgram })));
const InAppMessages = lazy(() => import("@/components/InAppMessages").then(m => ({ default: m.InAppMessages })));

export default function Dashboard() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { formatCurrency } = useInternationalization();
  const { engagementVisible, compactMode, setEngagementVisible, setCompactMode } = useDashboardControls();
  
  // Iniciar sistema de alertas de estoque
  React.useEffect(() => {
    startStockAlerts();
    return () => {
      // Cleanup sera feito pelo proprio sistema
    };
  }, []);
  
  // Buscar dados com prioridade - carregar críticos primeiro, secundários depois
  // Prioridade 1: Orders (mais importante para o dashboard)
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    staleTime: 30000, // Cache por 30 segundos
    gcTime: 2 * 60 * 1000, // Manter cache por 2 minutos
  });

  // Prioridade 2: Quotes (importante mas pode esperar um pouco)
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
    staleTime: 30000,
    gcTime: 2 * 60 * 1000,
    // Carregar apenas se orders já carregou (para não bloquear)
    enabled: !ordersLoading,
  });

  // Prioridade 3: Receitas (pode carregar depois)
  const { data: receitas = [], isLoading: receitasLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: listReceitas,
    staleTime: 30000,
    gcTime: 2 * 60 * 1000,
    // Carregar apenas se orders já carregou
    enabled: !ordersLoading,
  });

  // Prioridade 4: Inventory (menos crítico, carregar por último)
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
    staleTime: 60000, // Cache por 1 minuto (inventory muda menos)
    gcTime: 5 * 60 * 1000, // Manter cache por 5 minutos
    // Carregar apenas se orders já carregou
    enabled: !ordersLoading,
  });

  // Buscar template WhatsApp personalizado
  const { data: whatsappTemplate } = useQuery({
    queryKey: ["whatsapp-templates", empresa?.id, "dashboard_intro"],
    queryFn: async () => {
      if (!empresa?.id) return null;

      const { getWhatsAppTemplate, processTemplate, getWhatsAppSettings, addSignature } = await import("@/utils/whatsappTemplates");
      const template = await getWhatsAppTemplate(empresa.id, 'dashboard_intro');
      
      if (template) {
        const processed = processTemplate(template, {}, empresa);
        const settings = await getWhatsAppSettings(empresa.id);
        return { message_text: addSignature(processed, settings) };
      }

      return null;
    },
    enabled: !!empresa?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Mostrar loading apenas se orders ainda estiver carregando (conteúdo crítico)
  const isCriticalLoading = ordersLoading;

  // Funcao para enviar WhatsApp (memoizada)
  const sendWhatsApp = React.useCallback((message: string) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Mensagem do WhatsApp preparada!");
  }, []);

  // Memoizar cálculos pesados para evitar recálculos desnecessários
  const ordersStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeOrders = orders.filter(o => o.status !== "Cancelado");
    const inProduction = activeOrders.filter(o => o.status === "Em produção");
    const ready = activeOrders.filter(o => o.status === "Pronto");
    const awaitingPickup = activeOrders.filter(o => o.status === "Aguardando retirada");
    
    const overdueOrders = activeOrders.filter(order => {
      if (!order.delivery_date) return false;
      const deliveryDate = new Date(order.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate < today && order.status !== "Entregue";
    });

    const urgentOrders = activeOrders.filter(order => {
      if (!order.delivery_date) return false;
      const deliveryDate = new Date(order.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      const diffTime = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0 && order.status !== "Entregue";
    });

    const pendingPayments = activeOrders.filter(order => {
      const totalValue = Number(order.value || 0);
      const paidAmount = Number(order.paid || 0);
      return totalValue > paidAmount;
    });

    const totalRevenue = activeOrders.reduce((sum, order) => sum + (Number(order.value) || 0), 0);

    return {
      total: activeOrders.length,
      inProduction: inProduction.length,
      ready: ready.length,
      awaitingPickup: awaitingPickup.length,
      overdue: overdueOrders,
      urgent: urgentOrders,
      pendingPayments: pendingPayments.slice(0, 3),
      totalRevenue
    };
  }, [orders]);

  // Memoizar receitas total
  const receitasTotal = useMemo(() => {
    return receitas.reduce((sum, receita) => sum + (Number(receita.amount) || 0), 0);
  }, [receitas]);

  // Memoizar estoque crítico
  const criticalItems = useMemo(() => {
    return inventoryLoading ? [] : inventory.filter(item => item.status === "critical").slice(0, 2);
  }, [inventory, inventoryLoading]);

  // Memoizar orçamentos pendentes
  const pendingQuotes = useMemo(() => {
    return quotesLoading ? [] : quotes.filter((quote: any) => quote.status === "pending").slice(0, 2);
  }, [quotes, quotesLoading]);

  // Processar alertas inteligentes (memoizado)
  const intelligentAlerts = useMemo(() => {
    const alerts = [];

    // 1. Pedidos atrasados
    ordersStats.overdue.forEach(order => {
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

    // 2. Pagamentos pendentes
    ordersStats.pendingPayments.forEach(order => {
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

    // 3. Estoque crítico
    criticalItems.forEach(item => {
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
    pendingQuotes.forEach((quote: any) => {
      alerts.push({
        id: `quote-${quote.id}`,
        type: "quote",
        priority: "medium",
        title: "Orcamento Pendente",
        message: `${quote.code} - ${quote.customer_name}`,
        icon: FileText,
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

    // 5. Pedidos próximos do prazo
    ordersStats.urgent.forEach(order => {
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
  }, [ordersStats, criticalItems, pendingQuotes, empresa?.nome, sendWhatsApp]);

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      {/* Chat Widget para Suporte Proativo - Lazy loaded */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
      
      {/* Header */}
      <FadeIn className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-30 shadow-lg">
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

      <div className="p-6 md:p-10 space-y-8 md:space-y-10">
        {/* Banner de Trial - Sticky no topo (abaixo do header) - Só aparece se não for premium */}
        {empresa?.is_premium !== true && (
          <div className="sticky top-[73px] md:top-[89px] z-20 -mx-6 md:-mx-10 px-6 md:px-10 pt-0 pb-4 bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
            <TrialBannerSmall />
          </div>
        )}

        {/* Controles do Dashboard */}
        <DashboardControls 
          compactMode={compactMode}
          engagementVisible={engagementVisible}
          onCompactChange={setCompactMode}
          onEngagementChange={setEngagementVisible}
        />

        {/* Onboarding Checklist - Lazy loaded */}
        <Suspense fallback={null}>
          <OnboardingChecklist />
        </Suspense>
        
        {/* In-App Messages e Notificações - Lazy loaded */}
        <Suspense fallback={null}>
          <InAppMessages />
        </Suspense>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {isCriticalLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-white via-purple-50/30 to-white border border-purple-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pedidos em Andamento
                  </CardTitle>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-md flex-shrink-0">
                    <Package className="h-6 w-6 md:h-7 md:w-7 text-purple-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">{ordersStats.total}</div>
                  <div className="flex items-center gap-2 mt-2 md:mt-3">
                    <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <p className="text-xs md:text-sm text-gray-600 font-medium truncate">
                      {ordersStats.inProduction} em produção
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white via-blue-50/30 to-white border border-blue-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Em Producao
                  </CardTitle>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-md flex-shrink-0">
                    <Clock className="h-6 w-6 md:h-7 md:w-7 text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">
                    {ordersStats.inProduction}
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-3">
                    <p className="text-xs md:text-sm text-gray-600 font-medium truncate">
                      {ordersStats.urgent.length} com prazo proximo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white via-green-50/30 to-white border border-green-200/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Concluidos Hoje
                  </CardTitle>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-md flex-shrink-0">
                    <CheckCircle className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">
                    {ordersStats.ready}
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-3">
                    <p className="text-xs md:text-sm text-gray-600 font-medium truncate">
                      {ordersStats.awaitingPickup} aguardando retirada
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-100 via-pink-50 to-white border-2 border-purple-400 shadow-2xl hover:shadow-3xl hover:scale-[1.03] ring-2 ring-purple-200/30 hover:ring-purple-300/50 transition-all duration-300 animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-sm font-medium text-purple-700">
                    Receita do Mes
                  </CardTitle>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center shadow-lg flex-shrink-0">
                    <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-purple-800" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                  <div className="text-3xl md:text-5xl font-bold text-purple-700 mb-2 md:mb-3 break-words">
                    {formatCurrency(ordersStats.totalRevenue)}
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-3">
                    <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <p className="text-xs md:text-sm text-purple-700 font-semibold truncate">
                      {receitasLoading ? (
                        <span className="text-gray-400">Carregando...</span>
                      ) : (
                        formatCurrency(receitasTotal) + " recebido"
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Seções de Engajamento - Controladas pelo toggle (entre Stats Cards e Ações Rápidas) - Lazy loaded */}
        {engagementVisible && (
          <Suspense fallback={<div className="h-32 bg-gray-100 rounded-lg animate-pulse" />}>
            <div className={compactMode ? "space-y-4 md:space-y-6" : "space-y-8 md:space-y-10"}>
              {/* Dashboard de Valor (ROI) */}
              <ValueDashboard />
              
              {/* Badges e Achievements */}
              <AchievementsBadges />
              
              {/* Programa de Referência */}
              <ReferralProgram />
            </div>
          </Suspense>
        )}

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
                  onClick={async () => {
                    // Usar template personalizado se existir, senão usar padrão
                    let message = whatsappTemplate?.message_text;
                    
                    if (!message) {
                      // Template padrão
                      message = `Olá!

Sou do ${empresa?.nome || 'Atelie'} e gostaria de saber como posso ajudar você hoje!

*NOSSOS SERVIÇOS:*
• Bordados computadorizados
• Uniformes personalizados  
• Camisetas estampadas
• Produtos personalizados

*Entre em contato conosco para um orçamento personalizado!*

_${empresa?.nome || 'Atelie'} - Qualidade e criatividade em cada peça_`;
                    }
                    
                    // Buscar configurações para número do WhatsApp
                    const { getWhatsAppSettings, generateWhatsAppUrl } = await import("@/utils/whatsappTemplates");
                    const settings = empresa?.id ? await getWhatsAppSettings(empresa.id) : null;
                    
                    const whatsappUrl = generateWhatsAppUrl(message, settings?.whatsapp_number);
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

        {/* Aviso de Vencimento de Pagamento */}
        <PaymentExpirationWarning />

        {/* Centro de Alertas Inteligentes */}
        <FadeIn>
          <Card className="bg-gradient-to-br from-white via-purple-50/20 to-white border border-purple-200/50 shadow-xl">
          <CardHeader className="border-b border-purple-100 px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-md flex-shrink-0">
                  <Bell className="w-6 h-6 md:w-7 md:h-7 text-purple-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg md:text-2xl font-bold text-gray-900">
                    Centro de Alertas Inteligentes
                  </CardTitle>
                  <p className="text-xs md:text-sm text-gray-600 mt-0.5">Acompanhe o status do seu negócio</p>
                </div>
                {intelligentAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs font-bold px-2 md:px-3 py-1 flex-shrink-0">
                    {intelligentAlerts.length}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/agenda")}
                  className="text-xs md:text-sm text-blue-700 border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-400 font-semibold flex-1 md:flex-none"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">Ver Agenda</span>
                  <span className="md:hidden">Agenda</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/financeiro")}
                  className="text-xs md:text-sm text-green-700 border-green-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 hover:border-green-400 font-semibold flex-1 md:flex-none"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">Ver Financeiro</span>
                  <span className="md:hidden">Financeiro</span>
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
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
                      className={`p-4 md:p-6 rounded-2xl border-2 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                        alert.color === 'red' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300 hover:border-red-400' :
                        alert.color === 'orange' ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-300 hover:border-orange-400' :
                        alert.color === 'blue' ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 hover:border-blue-400' :
                        'bg-gradient-to-br from-green-50 to-green-100/50 border-green-300 hover:border-green-400'
                      }`}
                      onClick={alert.action}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${
                            alert.color === 'red' ? 'bg-gradient-to-br from-red-100 to-red-200' :
                            alert.color === 'orange' ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
                            alert.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                            'bg-gradient-to-br from-green-100 to-green-200'
                          }`}>
                            <IconComponent className={`w-6 h-6 md:w-8 md:h-8 ${
                              alert.color === 'red' ? 'text-red-700' :
                              alert.color === 'orange' ? 'text-orange-700' :
                              alert.color === 'blue' ? 'text-blue-700' :
                              'text-green-700'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-bold text-base md:text-lg text-gray-900">{alert.title}</h3>
                              <Badge 
                                variant="outline" 
                                className={`font-bold text-xs flex-shrink-0 ${
                                  alert.priority === 'high' ? 'bg-red-100 text-red-800 border-red-400' :
                                  alert.priority === 'medium' ? 'bg-orange-100 text-orange-800 border-orange-400' :
                                  'bg-blue-100 text-blue-800 border-blue-400'
                                }`}
                              >
                                {alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Media' : 'Baixa'}
                              </Badge>
                            </div>
                            <p className={`text-sm font-medium truncate md:truncate-none ${
                              alert.color === 'red' ? 'text-red-700' :
                              alert.color === 'orange' ? 'text-orange-700' :
                              alert.color === 'blue' ? 'text-blue-700' :
                              'text-green-700'
                            }`}>{alert.message}</p>
                          </div>
                        </div>

                        <div className="flex justify-end md:block">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert.action();
                            }}
                            className="w-full md:w-auto text-green-700 border-green-400 hover:bg-gradient-to-r hover:from-green-100 hover:to-green-50 hover:border-green-500 font-semibold shadow-sm hover:shadow-md transition-all"
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
