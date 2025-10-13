import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Zap, Star, ArrowLeft, CreditCard } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  originalPrice?: number;
  discount?: string;
  features: string[];
  popular?: boolean;
  icon: any;
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
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("PIX");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

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
      
      if (!userEmail) {
        toast.error("Email não encontrado. Faça login novamente.");
        return;
      }

      // Criar assinatura no ASAAS usando dados salvos
      let result;
      
      if (pendingPlanId === 'monthly') {
        result = await asaasService.createMonthlySubscription(
          userEmail, 
          userName, 
          empresa?.id, 
          empresa?.cpf_cnpj, 
          empresa?.telefone,
          selectedPaymentMethod
        );
      } else {
        result = await asaasService.createYearlySubscription(
          userEmail, 
          userName, 
          empresa?.id, 
          empresa?.cpf_cnpj, 
          empresa?.telefone,
          selectedPaymentMethod
        );
      }

      if (result && result.payment) {
        toast.success("Pagamento criado com sucesso!");
        
        // Mostrar informações do pagamento
        console.log('✅ Pagamento criado:', result);
        
        // Redirecionar para o link de pagamento do ASAAS
        if (result.payment.invoiceUrl) {
          window.open(result.payment.invoiceUrl, '_blank');
          toast.success(`Pagamento ${planId === 'monthly' ? 'Mensal' : 'Anual'} criado! Abra o link para pagar via PIX.`);
        } else {
          toast.success(`Pagamento ${planId === 'monthly' ? 'Mensal' : 'Anual'} criado! Verifique seu email para o PIX.`);
        }
        
        // Aqui você pode redirecionar ou mostrar mais informações
        // Por enquanto, apenas mostra sucesso
      } else {
        toast.error("Erro ao criar pagamento");
      }
      
    } catch (error) {
      console.error("Erro ao processar assinatura:", error);
      toast.error("Erro ao processar assinatura. Tente novamente.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-6 flex justify-between items-center">
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

      <div className="p-8">
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
          <div className="grid gap-8 md:grid-cols-2">
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-purple-800 text-xl">
              Escolha a Forma de Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant={selectedPaymentMethod === 'PIX' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('PIX')}
                className={`h-20 flex flex-col items-center justify-center gap-2 p-4 ${
                  selectedPaymentMethod === 'PIX' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'hover:bg-purple-50'
                }`}
              >
                <div className="text-3xl">📱</div>
                <div className="font-semibold text-base">PIX</div>
                <div className="text-sm opacity-75">Pagamento instantâneo</div>
              </Button>
              
              <Button
                variant={selectedPaymentMethod === 'CREDIT_CARD' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('CREDIT_CARD')}
                className={`h-20 flex flex-col items-center justify-center gap-2 p-4 ${
                  selectedPaymentMethod === 'CREDIT_CARD' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'hover:bg-purple-50'
                }`}
              >
                <div className="text-3xl">💳</div>
                <div className="font-semibold text-base">Cartão</div>
                <div className="text-sm opacity-75">Crédito ou débito</div>
              </Button>
              
              <Button
                variant={selectedPaymentMethod === 'BOLETO' ? 'default' : 'outline'}
                onClick={() => setSelectedPaymentMethod('BOLETO')}
                className={`h-20 flex flex-col items-center justify-center gap-2 p-4 ${
                  selectedPaymentMethod === 'BOLETO' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'hover:bg-purple-50'
                }`}
              >
                <div className="text-3xl">📄</div>
                <div className="font-semibold text-base">Boleto</div>
                <div className="text-sm opacity-75">Bancário</div>
              </Button>
            </div>
            
            <div className="flex gap-3 justify-end pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isLoading}
                className="px-6"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmPayment}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 px-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </div>
                ) : (
                  "Confirmar Pagamento"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
