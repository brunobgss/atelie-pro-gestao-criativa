import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { checkPaymentExpiration } from "@/utils/paymentExpiration";

export function useTrialProtection() {
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  useEffect(() => {
    // Aguardar carregamento dos dados antes de verificar trial
    if (!empresa) {
      console.log("⏳ Aguardando carregamento dos dados da empresa...");
      return;
    }

    console.log("🔍 Dados da empresa recebidos:", {
      id: empresa.id,
      nome: empresa.nome,
      is_premium: empresa.is_premium,
      status: empresa.status,
      trial_end_date: empresa.trial_end_date
    });

    // Verificar expiração de pagamento (inclui verificação de premium e trial)
    const checkExpiration = async () => {
      try {
        const paymentStatus = await checkPaymentExpiration(empresa.id);
        
        console.log("🔍 Status de pagamento:", {
          isPremium: paymentStatus.isPremium,
          isExpired: paymentStatus.isExpired,
          daysRemaining: paymentStatus.daysRemaining,
          planType: paymentStatus.planType,
          shouldBlockAccess: paymentStatus.shouldBlockAccess,
          currentPath: location.pathname
        });

        setIsTrialExpired(paymentStatus.shouldBlockAccess);

        // Se deve bloquear acesso e não está na página de assinatura, redirecionar
        if (paymentStatus.shouldBlockAccess && 
            location.pathname !== "/assinatura" && 
            location.pathname !== "/minha-conta" &&
            location.pathname !== "/verificar-pagamento" &&
            location.pathname !== "/ajuda" &&
            location.pathname !== "/documentacao" &&
            location.pathname !== "/faq") {
          console.log("🚫 Acesso bloqueado - redirecionando para assinatura");
          navigate("/assinatura", { replace: true });
        }

        // Se está próximo do vencimento, mostrar aviso
        if (paymentStatus.nextPaymentDue && paymentStatus.daysRemaining <= 3) {
          console.log(`⚠️ Pagamento vence em ${paymentStatus.daysRemaining} dias`);
        }

      } catch (error) {
        console.error("❌ Erro ao verificar expiração de pagamento:", error);
        // Em caso de erro, bloquear acesso por segurança
        setIsTrialExpired(true);
        if (location.pathname !== "/assinatura" && location.pathname !== "/minha-conta") {
          navigate("/assinatura", { replace: true });
        }
      }
    };

    checkExpiration();
  }, [empresa?.id, location.pathname, navigate, empresa]);

  return {
    isTrialExpired,
    trialEndDate: empresa?.trial_end_date,
    daysRemaining: empresa?.trial_end_date 
      ? Math.ceil((new Date(empresa.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 7,
    isPremium: empresa?.is_premium || false,
    planType: empresa?.plan_type || null
  };
}
