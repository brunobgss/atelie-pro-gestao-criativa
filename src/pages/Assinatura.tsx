import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Zap, Star, ArrowLeft, CreditCard, CheckCircle, User, MessageCircle, Mail, FileText, RefreshCw, Loader2, ArrowUpDown, AlertTriangle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { validateCpfCnpj, validatePhone, validateForm, cleanPhone } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { asaasService } from "@/integrations/asaas/service";
import { useInternationalization, useTranslations } from "@/contexts/InternationalizationContext";
import { supabase } from "@/integrations/supabase/client";

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
    id: "monthly-basic",
    name: "Básico Mensal",
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
    id: "yearly-basic",
    name: "Básico Anual",
    price: 390.00,
    period: "ano",
    originalPrice: 468.00,
    discount: "2 meses grátis",
    features: [
      "Tudo do plano básico mensal",
      "2 meses grátis",
      "Suporte prioritário",
      "Recursos premium",
      "Integração avançada",
      "Relatórios detalhados",
      "Backup premium"
    ],
    icon: Crown,
    color: "purple"
  },
  {
    id: "monthly-professional",
    name: "Profissional Mensal",
    price: 99.90,
    period: "mês",
    popular: true,
    features: [
      "Tudo do plano básico",
      "Emissão de Notas Fiscais",
      "NFe, NFSe, NFCe e mais",
      "Integração Focus NF",
      "Até 300 notas/mês",
      "Suporte prioritário",
      "Backup premium"
    ],
    icon: Crown,
    color: "green"
  },
  {
    id: "yearly-professional",
    name: "Profissional Anual",
    price: 1198.00,
    period: "ano",
    originalPrice: 1198.80,
    discount: "2 meses grátis",
    features: [
      "Tudo do plano profissional mensal",
      "2 meses grátis",
      "Economia de R$ 300/ano",
      "Suporte prioritário",
      "Recursos premium",
      "Backup premium"
    ],
    icon: Crown,
    color: "green"
  }
];

export default function Assinatura() {
  const navigate = useNavigate();
  const { user, empresa, refreshEmpresa } = useAuth();
  const { formatCurrency, getPricing } = useInternationalization();
  const t = useTranslations();
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("PIX");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [showPixInstructions, setShowPixInstructions] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentEmail, setPaymentEmail] = useState<string>("");
  const [dialogTrocarPlanoOpen, setDialogTrocarPlanoOpen] = useState(false);
  const [dialogTrocarPagamentoOpen, setDialogTrocarPagamentoOpen] = useState(false);
  const [trocandoPlano, setTrocandoPlano] = useState(false);
  const [trocandoPagamento, setTrocandoPagamento] = useState(false);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState<any>(null);
  const [novoPlanoSelecionado, setNovoPlanoSelecionado] = useState<string | null>(null);
  const [novaFormaPagamento, setNovaFormaPagamento] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO' | null>(null);

  // Verificar se o usuário já tem assinatura ativa
  const isPremium = empresa?.is_premium === true;
  const instructionPaymentMethod = paymentInfo?.paymentMethod || selectedPaymentMethod;
  
  // Detectar o plano baseado no valor pago (se disponível) ou usar padrão
  const detectPlan = () => {
    // Verificar se há informações de pagamento no localStorage
    const paymentInfo = localStorage.getItem('lastPaymentInfo');
    const pricing = getPricing();
    
    // Se tem nota fiscal, é plano profissional
    const isProfessional = empresa?.tem_nota_fiscal === true;
    
    if (paymentInfo) {
      try {
        const payment = JSON.parse(paymentInfo);
        const planValues: Record<string, { value: number; isProfessional: boolean }> = {
          'monthly-basic': { value: 39.00, isProfessional: false },
          'yearly-basic': { value: 390.00, isProfessional: false },
          'monthly-professional': { value: 99.90, isProfessional: true },
          'yearly-professional': { value: 1198.00, isProfessional: true }
        };
        
        const planInfo = planValues[payment.planId];
        if (planInfo) {
          if (planInfo.isProfessional) {
            return {
              type: payment.planId.includes('yearly') ? 'yearly-professional' : 'monthly-professional',
              name: payment.planId.includes('yearly') ? 'Profissional Anual' : 'Profissional Mensal',
              price: formatCurrency(planInfo.value),
              period: payment.planId.includes('yearly') ? t.perYear : t.perMonth
            };
          } else {
            return {
              type: payment.planId.includes('yearly') ? 'yearly-basic' : 'monthly-basic',
              name: payment.planId.includes('yearly') ? 'Básico Anual' : 'Básico Mensal',
              price: formatCurrency(planInfo.value),
              period: payment.planId.includes('yearly') ? t.perYear : t.perMonth
            };
          }
        }
        
        // Fallback para valores antigos
        if (payment.value === 39.00) {
          return {
            type: 'monthly-basic',
            name: isProfessional ? 'Profissional Mensal' : 'Básico Mensal',
            price: formatCurrency(isProfessional ? 99.90 : 39.00),
            period: t.perMonth
          };
        } else if (payment.value === 390.00) {
          return {
            type: 'yearly-basic',
            name: isProfessional ? 'Profissional Anual' : 'Básico Anual',
            price: formatCurrency(isProfessional ? 1198.00 : 390.00),
            period: t.perYear
          };
        }
      } catch (e) {
        console.log('Erro ao parsear informações de pagamento:', e);
      }
    }
    
    // Se não houver informações, detectar baseado em tem_nota_fiscal
    if (isProfessional) {
      return {
        type: 'monthly-professional',
        name: 'Profissional Mensal',
        price: formatCurrency(99.90),
        period: t.perMonth
      };
    }
    
    // Padrão: plano básico
    return {
      type: 'monthly-basic',
      name: 'Básico Mensal',
      price: formatCurrency(pricing.monthly),
      period: t.perMonth
    };
  };
  
  const planInfo = detectPlan();
  const currentPlan = planInfo.type;
  const planName = planInfo.name;
  const planPrice = planInfo.price;
  const planPeriod = planInfo.period;

  // Buscar assinatura ativa do usuário
  useEffect(() => {
    const loadAssinaturaAtiva = async () => {
      if (!empresa?.id) return;

      try {
        // Tentar buscar na tabela payments primeiro
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('empresa_id', empresa.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        let subscriptionId: string | null = null;
        let subscriptionData: any = null;

        if (payments && payments.length > 0 && payments[0].asaas_subscription_id) {
          subscriptionId = payments[0].asaas_subscription_id;
          subscriptionData = payments[0];
        } else {
          // Fallback: buscar na tabela asaas_subscriptions
          const { data: subscriptions } = await supabase
            .from('asaas_subscriptions')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1);

          if (subscriptions && subscriptions.length > 0 && subscriptions[0].asaas_subscription_id) {
            subscriptionId = subscriptions[0].asaas_subscription_id;
            subscriptionData = subscriptions[0];
          }
        }

        // Se encontrou uma assinatura, buscar detalhes no ASAAS
        if (subscriptionId) {
          console.log('🔍 Buscando assinatura no ASAAS:', subscriptionId);
          const result = await asaasService.getSubscription(subscriptionId);
          if (result.success && result.data) {
            console.log('✅ Assinatura encontrada:', result.data);
            setAssinaturaAtiva({ 
              ...subscriptionData, 
              asaas_subscription_id: subscriptionId,
              asaasData: result.data 
            });
          } else {
            console.warn('⚠️ Erro ao buscar detalhes da assinatura no ASAAS:', result.error);
          }
        } else {
          console.log('ℹ️ Nenhuma assinatura ativa encontrada para esta empresa');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar assinatura ativa:', error);
      }
    };

    if (isPremium) {
      loadAssinaturaAtiva();
    }
  }, [empresa?.id, isPremium]);

  const handleTrocarPlano = async () => {
    if (!novoPlanoSelecionado || !assinaturaAtiva?.asaas_subscription_id) {
      toast.error('Selecione um plano para trocar');
      return;
    }

    setTrocandoPlano(true);

    try {
      const temNotaFiscal = novoPlanoSelecionado.includes('professional');
      const result = await asaasService.updateSubscription(
        assinaturaAtiva.asaas_subscription_id,
        novoPlanoSelecionado,
        temNotaFiscal
      );

      if (result.success) {
        toast.success('Plano atualizado com sucesso!');
        setDialogTrocarPlanoOpen(false);
        setNovoPlanoSelecionado(null);
        await refreshEmpresa(true);
      } else {
        toast.error(result.error || 'Erro ao trocar plano');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao trocar plano');
    } finally {
      setTrocandoPlano(false);
    }
  };

  const handleTrocarFormaPagamento = async () => {
    if (!assinaturaAtiva?.asaas_subscription_id || !novaFormaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setTrocandoPagamento(true);

    try {
      const result = await asaasService.updatePaymentMethod(
        assinaturaAtiva.asaas_subscription_id,
        novaFormaPagamento
      );

      if (result.success) {
        toast.success('Forma de pagamento atualizada com sucesso!');
        setDialogTrocarPagamentoOpen(false);
        setNovaFormaPagamento(null);
        // Recarregar dados da assinatura
        const updatedResult = await asaasService.getSubscription(assinaturaAtiva.asaas_subscription_id);
        if (updatedResult.success && updatedResult.data) {
          setAssinaturaAtiva({ ...assinaturaAtiva, asaasData: updatedResult.data });
        }
      } else {
        toast.error(result.error || 'Erro ao atualizar forma de pagamento');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar forma de pagamento');
    } finally {
      setTrocandoPagamento(false);
    }
  };

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
    const planValues: Record<string, number> = {
      'monthly-basic': 39.00,
      'yearly-basic': 390.00,
      'monthly-professional': 99.90,
      'yearly-professional': 1198.00
    };
    const planData = {
      planId,
      value: planValues[planId] || 39.00,
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
    const userName = empresa?.responsavel || empresa?.nome || user?.email || "Usuário";
    const userEmail = empresa?.email || user?.email || "";
    const cpfCnpj = empresa?.cpf_cnpj || "";
    const telefone = cleanPhone(empresa?.telefone || "");

    setPaymentEmail(userEmail);

    try {
      
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
          switch (pendingPlanId) {
            case 'monthly-basic':
              return await asaasService.createMonthlySubscription(
                userEmail, userName, empresa?.id, cpfCnpj, telefone, selectedPaymentMethod
              );
            case 'yearly-basic':
              return await asaasService.createYearlySubscription(
                userEmail, userName, empresa?.id, cpfCnpj, telefone, selectedPaymentMethod
              );
            case 'monthly-professional':
              return await asaasService.createMonthlyProfessionalSubscription(
                userEmail, userName, empresa?.id, cpfCnpj, telefone, selectedPaymentMethod
              );
            case 'yearly-professional':
              return await asaasService.createYearlyProfessionalSubscription(
                userEmail, userName, empresa?.id, cpfCnpj, telefone, selectedPaymentMethod
              );
            default:
              throw new Error('Plano não reconhecido');
          }
        },
        'Assinatura'
      );

      console.log('🔍 Resultado completo:', result);
      console.log('🔍 Result.data:', result?.data);
      console.log('🔍 Result.success:', result?.success);

      // Extrair os dados do pagamento se vier dentro de result.data
      const paymentData = result?.data || result;
      
      console.log('🔍 PaymentData completo:', paymentData);
      console.log('🔍 PaymentData.invoiceUrl:', paymentData?.invoiceUrl);
      console.log('🔍 PaymentData.paymentLink:', paymentData?.paymentLink);
      
      // Verificar se temos dados de pagamento válidos
      // Para subscription, pode vir com object: 'subscription'
      if (paymentData && (paymentData.id || paymentData.invoiceUrl || paymentData.paymentLink)) {
        logger.userAction('subscription_created', 'ASSINATURA', { 
          planType: pendingPlanId, 
          paymentMethod: selectedPaymentMethod,
          userEmail,
          companyId: empresa?.id
        });
        
        // Salvar informações do pagamento
        setPaymentInfo({
          ...paymentData,
          userEmail,
          paymentMethod: selectedPaymentMethod,
          planType: pendingPlanId
        });
        
        // Determinar a URL de pagamento (pode ser invoiceUrl ou paymentLink)
        const paymentUrl = paymentData.invoiceUrl || paymentData.paymentLink || paymentData.bankSlipUrl;
        
        // Se tiver URL de pagamento, tentar abrir
        if (paymentUrl) {
          // Tentar abrir em nova aba, se falhar, redirecionar na mesma aba
          const newWindow = window.open(paymentUrl, '_blank');
          
          // Verificar se a janela foi bloqueada (mobile)
          if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            // Se não conseguiu abrir nova aba, redirecionar na mesma aba
            window.location.href = paymentUrl;
            toast.success(`Assinatura criada! Redirecionando para pagamento...`);
          } else {
            toast.success(`Assinatura criada! Abra o link para pagar via ${selectedPaymentMethod === 'PIX' ? 'PIX' : selectedPaymentMethod === 'BOLETO' ? 'Boleto' : 'cartão'}.`);
          }
        }
        
        // SEMPRE mostrar modal com instruções (mesmo que tenha URL)
        // Isso garante que o usuário saiba o que fazer
        setShowPixInstructions(true);
        
        // Mostrar informações do pagamento
        console.log('✅ Assinatura criada:', paymentData);
        console.log('🔗 URL de pagamento:', paymentUrl);
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
      case "green":
        return {
          bg: "bg-gradient-to-br from-green-50 to-emerald-100",
          border: "border-green-200",
          button: "bg-green-600 hover:bg-green-700 text-white",
          icon: "text-green-600"
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
                  <p className="text-xl font-bold text-green-800">
                    {empresa?.tem_nota_fiscal ? 'Profissional' : 'Básico'} - {planName}
                  </p>
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
                  {empresa?.tem_nota_fiscal && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                      <FileText className="w-3 h-3 mr-1" />
                      Com NF
                    </Badge>
                  )}
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
                  "Backup premium",
                  ...(empresa?.tem_nota_fiscal ? ["Emissão de Notas Fiscais"] : [])
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
                  onClick={async () => {
                    try {
                      await refreshEmpresa(true); // Força limpeza de cache
                      toast.success("Dados atualizados com sucesso!");
                    } catch (error) {
                      console.error("Erro ao atualizar dados:", error);
                      toast.error("Erro ao atualizar dados. Tente novamente.");
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Dados
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDialogTrocarPlanoOpen(true)}
                  disabled={!assinaturaAtiva}
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Trocar de Plano
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDialogTrocarPagamentoOpen(true)}
                  disabled={!assinaturaAtiva}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Trocar Forma de Pagamento
                </Button>
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
                {empresa?.tem_nota_fiscal && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/configuracao-focusnf")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Configurar Notas Fiscais
                  </Button>
                )}
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

        {/* Dialog Trocar Plano */}
        <Dialog open={dialogTrocarPlanoOpen} onOpenChange={setDialogTrocarPlanoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trocar de Plano</DialogTitle>
              <DialogDescription>
                Selecione o novo plano para sua assinatura. A alteração será aplicada no próximo ciclo de cobrança.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Plano Atual</Label>
                <p className="text-sm font-medium mt-1">{planName} - {planPrice}/{planPeriod}</p>
              </div>

              <div>
                <Label>Novo Plano</Label>
                <Select value={novoPlanoSelecionado || ''} onValueChange={setNovoPlanoSelecionado}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter(plan => plan.id !== currentPlan)
                      .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.price === 39.00 ? 'R$ 39' : 
                                         plan.price === 390.00 ? 'R$ 390' :
                                         plan.price === 99.90 ? 'R$ 99,90' :
                                         plan.price === 1198.00 ? 'R$ 1.198' : plan.price}/{plan.period}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A alteração do plano será aplicada no próximo ciclo de cobrança. Você continuará com o plano atual até o final do período pago.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogTrocarPlanoOpen(false);
                  setNovoPlanoSelecionado(null);
                }}
                disabled={trocandoPlano}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTrocarPlano}
                disabled={trocandoPlano || !novoPlanoSelecionado}
              >
                {trocandoPlano ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Confirmar Troca'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Trocar Forma de Pagamento */}
        <Dialog open={dialogTrocarPagamentoOpen} onOpenChange={(open) => {
          setDialogTrocarPagamentoOpen(open);
          if (open && assinaturaAtiva?.asaasData?.billingType) {
            // Inicializar com valor diferente do atual ao abrir
            const atual = assinaturaAtiva.asaasData.billingType;
            setNovaFormaPagamento(atual === 'PIX' ? 'CREDIT_CARD' : 'PIX');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trocar Forma de Pagamento</DialogTitle>
              <DialogDescription>
                Selecione a nova forma de pagamento para sua assinatura.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Forma de Pagamento Atual</Label>
                <p className="text-sm font-medium mt-1">
                  {assinaturaAtiva?.asaasData?.billingType === 'PIX' ? 'PIX' :
                   assinaturaAtiva?.asaasData?.billingType === 'CREDIT_CARD' ? 'Cartão de Crédito' :
                   assinaturaAtiva?.asaasData?.billingType === 'BOLETO' ? 'Boleto' :
                   'Não informado'}
                </p>
              </div>

              <div>
                <Label>Nova Forma de Pagamento</Label>
                <Select 
                  value={novaFormaPagamento || ''} 
                  onValueChange={(value: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => setNovaFormaPagamento(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione uma forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A forma de pagamento será atualizada imediatamente. A próxima cobrança será feita usando o novo método.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogTrocarPagamentoOpen(false);
                  setNovaFormaPagamento(null);
                }}
                disabled={trocandoPagamento}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTrocarFormaPagamento}
                disabled={trocandoPagamento || !novaFormaPagamento || novaFormaPagamento === assinaturaAtiva?.asaasData?.billingType}
              >
                {trocandoPagamento ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Confirmar Troca'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
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
            <DialogDescription className="text-gray-600 text-sm mt-1">
              Selecione como deseja pagar sua assinatura do Ateliê PRO
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Resumo do Plano */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {pendingPlanId === 'yearly-basic' || pendingPlanId === 'yearly-professional' 
                      ? (pendingPlanId === 'yearly-professional' ? 'Profissional Anual' : 'Básico Anual')
                      : (pendingPlanId === 'monthly-professional' ? 'Profissional Mensal' : 'Básico Mensal')}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {pendingPlanId === 'yearly-basic' ? 'R$ 390,00/ano' :
                     pendingPlanId === 'yearly-professional' ? 'R$ 1.198,00/ano' :
                     pendingPlanId === 'monthly-professional' ? 'R$ 99,90/mês' :
                     'R$ 39,00/mês'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    {pendingPlanId === 'yearly-basic' ? 'R$ 390' :
                     pendingPlanId === 'yearly-professional' ? 'R$ 1.198' :
                     pendingPlanId === 'monthly-professional' ? 'R$ 99,90' :
                     'R$ 39'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pendingPlanId === 'yearly-basic' || pendingPlanId === 'yearly-professional' ? 'por ano' : 'por mês'}
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

      {/* Modal de Instruções de Pagamento PIX */}
      <Dialog open={showPixInstructions} onOpenChange={setShowPixInstructions}>
        <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-3">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Instruções de Pagamento {instructionPaymentMethod === 'PIX' ? 'PIX' : instructionPaymentMethod === 'BOLETO' ? 'Boleto' : 'Cartão'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-sm mt-2">
              Siga os passos abaixo para concluir sua assinatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Resumo do Plano */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                {pendingPlanId === 'yearly-basic' || pendingPlanId === 'yearly-professional' 
                  ? (pendingPlanId === 'yearly-professional' ? 'Profissional Anual' : 'Básico Anual')
                  : (pendingPlanId === 'monthly-professional' ? 'Profissional Mensal' : 'Básico Mensal')}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">
                  {pendingPlanId === 'yearly-basic' ? 'R$ 390,00/ano' :
                   pendingPlanId === 'yearly-professional' ? 'R$ 1.198,00/ano' :
                   pendingPlanId === 'monthly-professional' ? 'R$ 99,90/mês' :
                   'R$ 39,00/mês'}
                </span>
                <span className="text-xl font-bold text-green-600">
                  {pendingPlanId === 'yearly-basic' ? 'R$ 390' :
                   pendingPlanId === 'yearly-professional' ? 'R$ 1.198' :
                   pendingPlanId === 'monthly-professional' ? 'R$ 99,90' :
                   'R$ 39'}
                </span>
              </div>
            </div>

            {/* Passos */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-lg">Passo a Passo:</h4>
              
              {/* Passo 1 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 mb-1">Verifique seu email</h5>
                  <p className="text-sm text-gray-600">
                    {instructionPaymentMethod === 'PIX' 
                      ? 'Você receberá um email com o código PIX para pagamento. O link de pagamento também está disponível acima.'
                      : instructionPaymentMethod === 'BOLETO'
                      ? 'Você receberá um email com o boleto bancário. O link de pagamento também está disponível acima.'
                      : 'Você receberá um email com o link de pagamento. O link também está disponível acima.'}
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 mb-1">
                    {instructionPaymentMethod === 'PIX' ? 'Pague via PIX' : instructionPaymentMethod === 'BOLETO' ? 'Efetue o pagamento do boleto' : 'Efetue o pagamento'}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {instructionPaymentMethod === 'PIX'
                      ? 'Copie o código PIX e efetue o pagamento usando o app do seu banco.'
                      : instructionPaymentMethod === 'BOLETO'
                      ? 'Baixe o boleto e realize o pagamento no seu banco ou aplicativo.'
                      : 'Acesse o link e complete o pagamento com seu cartão de crédito.'}
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 mb-1">Aguarde a confirmação</h5>
                  <p className="text-sm text-gray-600">
                    Após o pagamento, sua assinatura será ativada automaticamente em alguns minutos.
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">4</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 mb-1">Recarregue a página</h5>
                  <p className="text-sm text-gray-600">
                    Quando receber a confirmação, recarregue esta página para atualizar seu status.
                  </p>
                </div>
              </div>
            </div>

            {/* Link de Pagamento (se disponível) */}
            {paymentInfo && (paymentInfo.invoiceUrl || paymentInfo.paymentLink || paymentInfo.bankSlipUrl) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">🔗</div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-blue-900 mb-2">Link de Pagamento Disponível</h5>
                    <p className="text-sm text-blue-800 mb-3">
                      Clique no botão abaixo para acessar o pagamento diretamente:
                    </p>
                    <Button
                      onClick={() => {
                        const url = paymentInfo.invoiceUrl || paymentInfo.paymentLink || paymentInfo.bankSlipUrl;
                        if (url) {
                          window.open(url, '_blank');
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Abrir Link de Pagamento
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Informações da Assinatura */}
            {paymentInfo && paymentInfo.id && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">📋</div>
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1">ID da Assinatura</h5>
                    <p className="text-sm text-gray-600 font-mono break-all">
                      {paymentInfo.id}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Guarde este ID para consultas futuras
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h5 className="font-semibold text-yellow-900 mb-1">Importante</h5>
                  <p className="text-sm text-yellow-800 mb-2">
                    {instructionPaymentMethod === 'PIX'
                      ? 'O código PIX também será enviado por email. Verifique sua caixa de entrada e spam.'
                      : instructionPaymentMethod === 'BOLETO'
                      ? 'O boleto também será enviado por email. Verifique sua caixa de entrada e spam.'
                      : 'O link de pagamento também será enviado por email. Verifique sua caixa de entrada e spam.'}
                  </p>
                  <p className="text-sm text-yellow-800">
                    <strong>Email:</strong> {paymentEmail || paymentInfo?.userEmail || empresa?.email || user?.email || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPixInstructions(false);
                  navigate('/');
                }}
                className="px-6"
              >
                Entendi
              </Button>
              <Button 
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6"
              >
                Recarregar Página
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
