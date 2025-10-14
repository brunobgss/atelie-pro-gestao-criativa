import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

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

    if (!empresa?.trial_end_date) {
      // Se não há data de fim do trial, considerar como expirado por segurança
      console.log("⚠️ Trial end date não encontrado - considerando como expirado");
      setIsTrialExpired(true);
      if (location.pathname !== "/assinatura" && location.pathname !== "/minha-conta") {
        navigate("/assinatura", { replace: true });
      }
      return;
    }

    const trialEnd = new Date(empresa.trial_end_date);
    const now = new Date();
    const isExpired = now > trialEnd;

    console.log("🔍 Verificando trial:", {
      trialEndDate: empresa.trial_end_date,
      now: now.toISOString(),
      isExpired,
      currentPath: location.pathname
    });

    setIsTrialExpired(isExpired);

    // Se o trial expirou e não está na página de assinatura, redirecionar IMEDIATAMENTE
    if (isExpired && location.pathname !== "/assinatura" && location.pathname !== "/minha-conta") {
      console.log("🚫 Trial expirado - redirecionando para assinatura");
      navigate("/assinatura", { replace: true });
    }
  }, [empresa?.trial_end_date, location.pathname, navigate, isTrialExpired, empresa]);

  return {
    isTrialExpired,
    trialEndDate: empresa?.trial_end_date,
    daysRemaining: empresa?.trial_end_date 
      ? Math.ceil((new Date(empresa.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 7
  };
}
