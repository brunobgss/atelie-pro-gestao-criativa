import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CreditCard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { checkPaymentExpiration } from "@/utils/paymentExpiration";

interface PaymentExpirationWarningProps {
  onClose?: () => void;
}

export function PaymentExpirationWarning({ onClose }: PaymentExpirationWarningProps) {
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!empresa?.id) return;

    const checkPaymentStatus = async () => {
      try {
        const status = await checkPaymentExpiration(empresa.id);
        setPaymentStatus(status);
        
        // Mostrar aviso se está próximo do vencimento (3 dias ou menos) e não expirou
        if (status.isPremium && !status.isExpired && status.daysRemaining <= 3) {
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Erro ao verificar status de pagamento:', error);
      }
    };

    checkPaymentStatus();
  }, [empresa?.id]);

  const handleRenew = () => {
    navigate('/assinatura');
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible || !paymentStatus) {
    return null;
  }

  const getWarningColor = () => {
    if (paymentStatus.daysRemaining <= 1) return 'destructive';
    if (paymentStatus.daysRemaining <= 2) return 'destructive';
    return 'secondary';
  };

  const getWarningMessage = () => {
    if (paymentStatus.daysRemaining <= 1) {
      return 'Seu pagamento vence hoje! Renove imediatamente para não perder o acesso.';
    }
    if (paymentStatus.daysRemaining <= 2) {
      return `Seu pagamento vence em ${paymentStatus.daysRemaining} dias. Renove agora para manter o acesso.`;
    }
    return `Seu pagamento vence em ${paymentStatus.daysRemaining} dias. Considere renovar em breve.`;
  };

  return (
    <Card className={`border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20 ${getWarningColor() === 'destructive' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-full ${getWarningColor() === 'destructive' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {paymentStatus.daysRemaining <= 1 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold ${getWarningColor() === 'destructive' ? 'text-red-900' : 'text-orange-900'}`}>
                  {paymentStatus.daysRemaining <= 1 ? 'Pagamento Vence Hoje!' : 'Pagamento Próximo do Vencimento'}
                </h3>
                <Badge variant={getWarningColor()}>
                  {paymentStatus.daysRemaining} {paymentStatus.daysRemaining === 1 ? 'dia' : 'dias'}
                </Badge>
              </div>
              
              <p className={`text-sm ${getWarningColor() === 'destructive' ? 'text-red-700' : 'text-orange-700'} mb-3`}>
                {getWarningMessage()}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-3 h-3" />
                  <span>Plano {paymentStatus.planType === 'yearly' ? 'Anual' : 'Mensal'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Vence em {new Date(paymentStatus.expirationDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              onClick={handleRenew}
              className={getWarningColor() === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              Renovar Agora
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
