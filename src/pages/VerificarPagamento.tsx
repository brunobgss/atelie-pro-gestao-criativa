import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, ArrowLeft, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { checkPaymentStatus, activatePremiumManually, checkPremiumStatus } from "@/utils/paymentStatus";

export default function VerificarPagamento() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [paymentId, setPaymentId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<boolean | null>(null);

  // Verificar status premium atual
  useEffect(() => {
    const checkCurrentStatus = async () => {
      if (empresa?.id) {
        const isPremium = await checkPremiumStatus(empresa.id);
        setPremiumStatus(isPremium);
      }
    };
    checkCurrentStatus();
  }, [empresa?.id]);

  const handleCheckPayment = async () => {
    if (!paymentId.trim()) {
      toast.error("Digite o ID do pagamento");
      return;
    }

    setIsChecking(true);
    try {
      const status = await checkPaymentStatus(paymentId);
      setPaymentStatus(status);
      
      if (status) {
        toast.success("Status do pagamento verificado!");
      } else {
        toast.error("Pagamento não encontrado");
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      toast.error("Erro ao verificar pagamento");
    } finally {
      setIsChecking(false);
    }
  };

  const handleActivatePremium = async () => {
    if (!paymentStatus || !empresa?.id) {
      toast.error("Dados insuficientes para ativar premium");
      return;
    }

    setIsActivating(true);
    try {
      const success = await activatePremiumManually(paymentStatus.id, empresa.id);
      
      if (success) {
        toast.success("Premium ativado com sucesso!");
        setPremiumStatus(true);
        // Recarregar a página para atualizar o estado
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error("Erro ao ativar premium");
      }
    } catch (error) {
      console.error("Erro ao ativar premium:", error);
      toast.error("Erro ao ativar premium");
    } finally {
      setIsActivating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'Recebido';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'PENDING':
        return 'Pendente';
      case 'OVERDUE':
        return 'Em Atraso';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/assinatura")}
              className="text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-purple-600" />
                Verificar Pagamento
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">
                Verifique o status do seu pagamento e ative o premium
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Status Premium Atual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {premiumStatus === true ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : premiumStatus === false ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <RefreshCw className="w-5 h-5 text-gray-600" />
              )}
              Status Premium Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {premiumStatus === true ? (
              <div className="text-green-700">
                <p className="font-semibold">✅ Premium Ativo</p>
                <p className="text-sm">Sua conta está desbloqueada e você tem acesso a todas as funcionalidades.</p>
              </div>
            ) : premiumStatus === false ? (
              <div className="text-red-700">
                <p className="font-semibold">❌ Premium Inativo</p>
                <p className="text-sm">Sua conta está bloqueada. Verifique seu pagamento abaixo para ativar o premium.</p>
              </div>
            ) : (
              <div className="text-gray-700">
                <p className="font-semibold">⏳ Verificando...</p>
                <p className="text-sm">Carregando status do premium...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verificação de Pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Verificar Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID do Pagamento
              </label>
              <div className="flex gap-2">
                <Input
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  placeholder="Digite o ID do pagamento (ex: pay_123456789)"
                  className="flex-1"
                />
                <Button
                  onClick={handleCheckPayment}
                  disabled={isChecking || !paymentId.trim()}
                  className="px-6"
                >
                  {isChecking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
            </div>

            {paymentStatus && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Status do Pagamento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">ID do Pagamento</p>
                    <p className="font-mono text-sm">{paymentStatus.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={getStatusColor(paymentStatus.status)}>
                      {getStatusText(paymentStatus.status)}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Valor</p>
                    <p className="font-semibold">R$ {paymentStatus.value?.toFixed(2) || '0,00'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Data do Pagamento</p>
                    <p className="text-sm">
                      {paymentStatus.paymentDate 
                        ? new Date(paymentStatus.paymentDate).toLocaleDateString('pt-BR')
                        : 'Não informada'
                      }
                    </p>
                  </div>
                </div>

                {/* Botão para ativar premium se o pagamento foi confirmado */}
                {(paymentStatus.status === 'RECEIVED' || paymentStatus.status === 'CONFIRMED') && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleActivatePremium}
                      disabled={isActivating || premiumStatus === true}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isActivating ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Ativando Premium...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Ativar Premium Agora
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Clique para ativar o premium baseado neste pagamento confirmado
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como encontrar o ID do pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <strong>1. Email de confirmação:</strong> O ID do pagamento está no email que você recebeu do Asaas
              </p>
              <p className="text-sm text-gray-700">
                <strong>2. Link de pagamento:</strong> O ID aparece na URL do link de pagamento (ex: .../pay_123456789)
              </p>
              <p className="text-sm text-gray-700">
                <strong>3. Área do cliente Asaas:</strong> Acesse sua conta no Asaas para ver o histórico de pagamentos
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Se você não conseguir encontrar o ID, entre em contato conosco 
                informando seu email e nome da empresa que ajudaremos a localizar seu pagamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
