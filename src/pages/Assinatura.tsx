import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Zap, Star, ArrowLeft, CreditCard, CheckCircle, User, MessageCircle, Mail } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { validateCpfCnpj, validatePhone, validateForm, cleanPhone } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { asaasService } from "@/integrations/asaas/service";
import { useInternationalization, useTranslations } from "@/contexts/InternationalizationContext";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  originalPrice?: number;
  discount?: string;
  features: string[];
  popular?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const plans: Plan[] = [
  {
    id: "monthly",
    name: "Mensal",
    price: 39.00,
    period: "mês",
    features: [
      "Gestão completa de pedidos",
      "Calculadora de preços profissional",
      "Catálogo de produtos",
      "Relatórios financeiros",
      "Integração WhatsApp",
      "Suporte por email",
      "Backup automático"
    ],
    icon: Zap,
    color: "blue"
  },
  {
    id: "yearly",
    name: "Anual",
    price: 390.00,
    period: "ano",
    originalPrice: 468.00,
    discount: "2 meses grátis",
    popular: true,
    features: [
      "Tudo do plano mensal",
      "2 meses grátis",
      "Suporte prioritário",
      "Recursos premium",
      "Integração avançada",
      "Relatórios detalhados",
      "Backup premium"
    ],
    icon: Crown,
    color: "purple"
  }
];

export default function Assinatura() {
  const navigate = useNavigate();
  const { user, empresa } = useAuth();
  const { formatCurrency, getPricing } = useInternationalization();
  const t = useTranslations();
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("PIX");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  // Verificar se o usuário já tem assinatura ativa
  const isPremium = empresa?.is_premium === true;
  
  // Detectar o plano baseado no valor pago (se disponível) ou usar padrão
  const detectPlan = () => {
    // Verificar se há informações de pagamento no localStorage
    const paymentInfo = localStorage.getItem('lastPaymentInfo');
    const pricing = getPricing();
    
    if (paymentInfo) {
      try {
        const payment = JSON.parse(paymentInfo);
        if (payment.value === pricing.monthly) {
          return {
            type: 'monthly',
            name: t.monthly,
            price: formatCurrency(pricing.monthly),
            period: t.perMonth
          };
        } else if (payment.value === pricing.yearly) {
          return {
            type: 'yearly',
            name: t.yearly,
            price: formatCurrency(pricing.yearly),
            period: t.perYear
          };
        }
      } catch (e) {
        console.log('Erro ao parsear informações de pagamento:', e);
      }
    }
    
    // Se não houver informações, assumir mensal como padrão
    return {
      type: 'monthly',
      name: t.monthly,
      price: formatCurrency(pricing.monthly),
      period: t.perMonth
    };
  };
  
  const planInfo = detectPlan();
  const currentPlan = planInfo.type;
  const planName = planInfo.name;
  const planPrice = planInfo.price;
  const planPeriod = planInfo.period;

  const handleSubscribe = async (planId: string) => {
    // Verificar se tem CPF/CNPJ e telefone salvos
    console.log('🔍 Dados da empresa:', empresa);
    console.log('🔍 CPF/CNPJ:', empresa?.cpf_cnpj);
    console.log('🔍 Telefone:', empresa?.telefone);
    console.log('🔍 Tipo do CPF/CNPJ:', typeof empresa?.cpf_cnpj);
    console.log('🔍 Tipo do Telefone:', typeof empresa?.telefone);
    
    if (!empresa?.cpf_cnpj || !empresa?.telefone) {
      console.error('❌ Dados faltando:');
      console.error('❌ CPF/CNPJ:', empresa?.cpf_cnpj);
      console.error('❌ Telefone:', empresa?.telefone);
      toast.error("Complete seus dados de CPF/CNPJ e telefone no cadastro primeiro!");
      return;
    }
    
    // Salvar informações do plano no localStorage para detecção posterior
    const planData = {
      planId,
      value: planId === 'monthly' ? 39.00 : 390.00,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('lastPaymentInfo', JSON.stringify(planData));
    
    // Abrir modal para escolher forma de pagamento
    setPendingPlanId(planId);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!pendingPlanId) return;
    
    setIsLoading(true);
    setIsPaymentModalOpen(false);
    
    try {
      const userName = empresa?.responsavel || empresa?.nome || user?.email || "Usuário";
      const userEmail = empresa?.email || user?.email || "";
      const cpfCnpj = empresa?.cpf_cnpj || "";
      const telefone = cleanPhone(empresa?.telefone || "");
      
      // Validação robusta dos dados necessários
      const validation = validateForm(
        { userEmail, cpfCnpj, telefone },
        {
          userEmail: (value) => value ? { isValid: true, errors: [] } : { isValid: false, errors: ['Email é obrigatório'] },
          cpfCnpj: (value) => value ? validateCpfCnpj(value) : { isValid: false, errors: ['CPF/CNPJ é obrigatório'] },
          telefone: (value) => value ? validatePhone(value) : { isValid: false, errors: ['Telefone é obrigatório'] }
        }
      );
      
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        setIsLoading(false);
        return;
      }

      // Medir performance da criação de assinatura
      const result = await performanceMonitor.measure(
        'createSubscription',
        async () => {
          if (pendingPlanId === 'monthly') {
            return await asaasService.createMonthlySubscription(
              userEmail, 
              userName, 
              empresa?.id, 
              cpfCnpj, 
              telefone,
              selectedPaymentMethod
            );
          } else {
            return await asaasService.createYearlySubscription(
              userEmail, 
              userName, 
              empresa?.id, 
              cpfCnpj, 
              telefone,
              selectedPaymentMethod
            );
          }
        },
        'Assinatura'
      );

      console.log('🔍 Resultado completo:', result);
      console.log('🔍 Result.data:', result?.data);
      console.log('🔍 Result.success:', result?.success);

      // Extrair os dados do pagamento se vier dentro de result.data
      const paymentData = result?.data || result;
      
      // Verificar se temos dados de pagamento válidos
      if (paymentData && (paymentData.id || paymentData.invoiceUrl)) {
        logger.userAction('subscription_created', 'ASSINATURA', { 
          planType: pendingPlanId, 
          paymentMethod: selectedPaymentMethod,
          userEmail,
          companyId: empresa?.id
        });
        
        toast.success("Pagamento criado com sucesso!");
        
        // Mostrar informações do pagamento
        console.log('✅ Pagamento criado:', paymentData);
        
        // Redirecionar para o link de pagamento do ASAAS
        if (paymentData.invoiceUrl) {
          // Tentar abrir em nova aba, se falhar, redirecionar na mesma aba
          const newWindow = window.open(paymentData.invoiceUrl, '_blank');
          
          // Verificar se a janela foi bloqueada (mobile)
          if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            // Se não conseguiu abrir nova aba, redirecionar na mesma aba
            window.location.href = paymentData.invoiceUrl;
            toast.success(`Pagamento ${pendingPlanId === 'monthly' ? 'Mensal' : 'Anual'} criado! Redirecionando para pagamento...`);
          } else {
            toast.success(`Pagamento ${pendingPlanId === 'monthly' ? 'Mensal' : 'Anual'} criado! Abra o link para pagar via ${selectedPaymentMethod === 'PIX' ? 'PIX' : 'cartão'}.`);
          }
        } else {
          toast.success(`Pagamento ${pendingPlanId === 'monthly' ? 'Mensal' : 'Anual'} criado! Verifique seu email para o ${selectedPaymentMethod === 'PIX' ? 'PIX' : 'pagamento'}.`);
        }
        
        // Aqui você pode redirecionar ou mostrar mais informações
        // Por enquanto, apenas mostra sucesso
      } else {
        const appError = errorHandler.handleSupabaseError(
          { message: 'Erro ao criar pagamento', code: 'CREATE_SUBSCRIPTION_ERROR' },
          'createSubscription'
        );
        logger.error('Falha ao criar assinatura', 'ASSINATURA', { 
          planType: pendingPlanId, 
          userEmail, 
          error: result 
        });
        toast.error(appError.message);
      }
      
    } catch (error: unknown) {
      const appError = errorHandler.handleSupabaseError(error, 'createSubscription');
      logger.error('Erro ao processar assinatura', 'ASSINATURA', { 
        planType: pendingPlanId, 
        userEmail, 
        error: error.message 
      });
      toast.error(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-gradient-to-br from-blue-50 to-blue-100",
          border: "border-blue-200",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
          icon: "text-blue-600"
        };
      case "purple":
        return {
          bg: "bg-gradient-to-br from-purple-50 to-purple-100",
          border: "border-purple-200",
          button: "bg-purple-600 hover:bg-purple-700 text-white",
          icon: "text-purple-600"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-gray-50 to-gray-100",
          border: "border-gray-200",
          button: "bg-gray-600 hover:bg-gray-700 text-white",
          icon: "text-gray-600"
        };
    }
  };

  // Se o usuário já tem premium, mostrar página de gerenciamento
  if (isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
          <div className="p-4 md:p-6">
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="text-gray-700 hover:bg-gray-100 p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-green-600" />
                    Minha Assinatura
                  </h1>
                  <p className="text-gray-600 text-xs">Gerencie sua conta premium</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden md:flex justify-between items-center">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Crown className="w-6 h-6 text-green-600" />
                    Minha Assinatura
                  </h1>
                  <p className="text-gray-600 text-sm mt-0.5">Gerencie sua conta premium do Ateliê Pro</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* Status da Assinatura */}
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-6 h-6" />
                Assinatura Ativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Plano Atual</p>
                  <p className="text-xl font-bold text-green-800">{planName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="text-xl font-bold text-green-800">{planPrice}/{planPeriod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recursos Premium */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-600" />
                Recursos Premium Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Gestão completa de pedidos",
                  "Calculadora de preços profissional",
                  "Catálogo de produtos",
                  "Relatórios financeiros",
                  "Integração WhatsApp",
                  "Suporte prioritário",
                  "Recursos premium",
                  "Relatórios detalhados",
                  "Backup premium"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/minha-conta")}
                >
                  <User className="w-4 h-4 mr-2" />
                  Ver Dados da Conta
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://www.asaas.com', '_blank')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Portal de Pagamentos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('mailto:suporte@ateliepro.online', '_blank')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contatar Suporte
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://wa.me/5535998498798', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Suporte
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Informações Importantes */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 space-y-2">
              <p>• Sua assinatura é renovada automaticamente</p>
              <p>• Você pode cancelar a qualquer momento sem taxas</p>
              <p>• Suporte prioritário disponível para assinantes</p>
              <p>• Backup automático dos seus dados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Página original para usuários sem assinatura
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-700 hover:bg-gray-100 p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  Escolha seu Plano
                </h1>
                <p className="text-gray-600 text-xs">Desbloqueie todo o potencial</p>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-purple-600" />
                  Escolha seu Plano
                </h1>
                <p className="text-gray-600 text-sm mt-0.5">Desbloqueie todo o potencial do Ateliê Pro</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transforme seu Ateliê em um Negócio Próspero
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Acesse todas as ferramentas profissionais para organizar pedidos, calcular preços corretamente 
            e aumentar sua lucratividade com bordados e personalizados.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
            {plans.map((plan) => {
              const colors = getColorClasses(plan.color);
              const IconComponent = plan.icon;
              const isSelected = selectedPlan === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-purple-500 shadow-lg scale-105' 
                      : 'hover:shadow-md'
                  } ${colors.bg} ${colors.border}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
                      <IconComponent className={`w-8 h-8 ${colors.icon}`} />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          R$ {plan.price.toFixed(2)}
                        </span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </div>
                      {plan.originalPrice && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-lg text-gray-500 line-through">
                            R$ {plan.originalPrice.toFixed(2)}
                          </span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {plan.discount}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading}
                      className={`w-full h-12 text-lg font-semibold ${colors.button}`}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Assinar Agora
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Comparison */}
        <div className="max-w-4xl mx-auto mt-16">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-gray-900">
                Comparação de Recursos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-semibold text-gray-900">Recursos</th>
                      <th className="text-center p-4 font-semibold text-gray-900">Mensal</th>
                      <th className="text-center p-4 font-semibold text-gray-900">Anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "Gestão de Pedidos", monthly: true, yearly: true },
                      { feature: "Calculadora de Preços", monthly: true, yearly: true },
                      { feature: "Catálogo de Produtos", monthly: true, yearly: true },
                      { feature: "Relatórios Básicos", monthly: true, yearly: true },
                      { feature: "Integração WhatsApp", monthly: true, yearly: true },
                      { feature: "Suporte por Email", monthly: true, yearly: true },
                      { feature: "Backup Automático", monthly: true, yearly: true },
                      { feature: "Suporte Prioritário", monthly: false, yearly: true },
                      { feature: "Recursos Premium", monthly: false, yearly: true },
                      { feature: "Relatórios Detalhados", monthly: false, yearly: true },
                      { feature: "Backup Premium", monthly: false, yearly: true }
                    ].map((row, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="p-4 text-gray-700">{row.feature}</td>
                        <td className="p-4 text-center">
                          {row.monthly ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.yearly ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto mt-16">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-gray-900">
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Posso cancelar a qualquer momento?</h3>
                <p className="text-gray-600">Sim, você pode cancelar sua assinatura a qualquer momento. Não há taxas de cancelamento.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Como funciona o período de teste?</h3>
                <p className="text-gray-600">Você tem 7 dias grátis para testar todas as funcionalidades. Após esse período, escolha um plano para continuar.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quais formas de pagamento são aceitas?</h3>
                <p className="text-gray-600">Aceitamos cartão de crédito, débito e PIX através do ASAAS, nosso parceiro de pagamentos.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Há suporte técnico?</h3>
                <p className="text-gray-600">Sim, oferecemos suporte por email para todos os usuários e suporte prioritário para assinantes anuais.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Seleção de Forma de Pagamento */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Escolha a Forma de Pagamento
            </DialogTitle>
            <p className="text-gray-600 text-sm mt-1">
              Selecione como deseja pagar sua assinatura do Ateliê PRO
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Resumo do Plano */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {pendingPlanId === 'yearly' ? 'Plano Anual' : 'Plano Mensal'}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {pendingPlanId === 'yearly' ? 'R$ 390,00/ano' : 'R$ 39,00/mês'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    {pendingPlanId === 'yearly' ? 'R$ 390' : 'R$ 39'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pendingPlanId === 'yearly' ? 'por ano' : 'por mês'}
                  </div>
                </div>
              </div>
            </div>

            {/* Opções de Pagamento */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Métodos de Pagamento</h4>
              
              {/* PIX */}
              <Button
                variant={selectedPaymentMethod === 'PIX' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('PIX')}
                className={`w-full h-16 flex items-center justify-between p-3 transition-all duration-200 ${
                  selectedPaymentMethod === 'PIX' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg border-green-500' 
                    : 'hover:bg-green-50 border-green-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedPaymentMethod === 'PIX' 
                      ? 'bg-white/20' 
                      : 'bg-green-100'
                  }`}>
                    <div className="text-xl">⚡</div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">PIX</div>
                    <div className={`text-xs ${
                      selectedPaymentMethod === 'PIX' 
                        ? 'text-green-100' 
                        : 'text-gray-600'
                    }`}>
                      Pagamento instantâneo • Aprovação imediata
                    </div>
                  </div>
                </div>
                {selectedPaymentMethod === 'PIX' && (
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </Button>
              
              {/* Cartão de Crédito */}
              <Button
                variant={selectedPaymentMethod === 'CREDIT_CARD' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('CREDIT_CARD')}
                className={`w-full h-16 flex items-center justify-between p-3 transition-all duration-200 ${
                  selectedPaymentMethod === 'CREDIT_CARD' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg border-blue-500' 
                    : 'hover:bg-blue-50 border-blue-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedPaymentMethod === 'CREDIT_CARD' 
                      ? 'bg-white/20' 
                      : 'bg-blue-100'
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">Cartão de Crédito</div>
                    <div className={`text-xs ${
                      selectedPaymentMethod === 'CREDIT_CARD' 
                        ? 'text-blue-100' 
                        : 'text-gray-600'
                    }`}>
                      Visa, Mastercard, Elo • Parcelamento disponível
                    </div>
                  </div>
                </div>
                {selectedPaymentMethod === 'CREDIT_CARD' && (
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </Button>
              
              {/* Boleto Bancário */}
              <Button
                variant={selectedPaymentMethod === 'BOLETO' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('BOLETO')}
                className={`w-full h-16 flex items-center justify-between p-3 transition-all duration-200 ${
                  selectedPaymentMethod === 'BOLETO' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg border-orange-500' 
                    : 'hover:bg-orange-50 border-orange-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedPaymentMethod === 'BOLETO' 
                      ? 'bg-white/20' 
                      : 'bg-orange-100'
                  }`}>
                    <div className="text-xl">📄</div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">Boleto Bancário</div>
                    <div className={`text-xs ${
                      selectedPaymentMethod === 'BOLETO' 
                        ? 'text-orange-100' 
                        : 'text-gray-600'
                    }`}>
                      Pagamento em até 3 dias úteis • Vencimento em 3 dias
                    </div>
                  </div>
                </div>
                {selectedPaymentMethod === 'BOLETO' && (
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                )}
              </Button>
            </div>

            {/* Informações de Segurança */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-xs text-gray-700">
                  <p className="font-medium mb-1">Pagamento 100% Seguro</p>
                  <p>Seus dados são protegidos com criptografia SSL e processados por gateways de pagamento certificados.</p>
                </div>
              </div>
            </div>
            
            {/* Botões de Ação */}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isLoading}
                className="px-6 h-10 font-medium text-sm"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmPayment}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 h-10 font-medium shadow-lg text-sm"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3" />
                    Confirmar Pagamento
                  </div>
                )}
              </Button>
            </div>
            
            {/* Link para verificar pagamento */}
            <div className="text-center pt-4 border-t border-gray-200 mt-4">
              <p className="text-xs text-gray-600 mb-2">
                Já fez o pagamento mas não foi ativado?
              </p>
              <Button 
                variant="link" 
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  navigate("/verificar-pagamento");
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Verificar Status do Pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
