import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export function useTrialProtection() {
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  useEffect(() => {
    if (!empresa?.trial_end_date) {
      // Se não há data de fim do trial, considerar como ativo
      setIsTrialExpired(false);
      return;
    }

    const trialEnd = new Date(empresa.trial_end_date);
    const now = new Date();
    const isExpired = now > trialEnd;

    setIsTrialExpired(isExpired);

    // Se o trial expirou e não está na página de assinatura, redirecionar
    if (isExpired && location.pathname !== "/assinatura" && location.pathname !== "/minha-conta") {
      navigate("/assinatura", { replace: true });
    }
  }, [empresa?.trial_end_date, location.pathname, navigate]);

  return {
    isTrialExpired,
    trialEndDate: empresa?.trial_end_date,
    daysRemaining: empresa?.trial_end_date 
      ? Math.ceil((new Date(empresa.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 7
  };
}
