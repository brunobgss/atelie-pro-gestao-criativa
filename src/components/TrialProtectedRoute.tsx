import { ReactNode } from "react";
import { useTrialProtection } from "@/hooks/useTrialProtection";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface TrialProtectedRouteProps {
  children: ReactNode;
  allowedPaths?: string[];
}

export function TrialProtectedRoute({ children, allowedPaths = ["/assinatura", "/minha-conta"] }: TrialProtectedRouteProps) {
  const { isTrialExpired } = useTrialProtection();
  const navigate = useNavigate();

  useEffect(() => {
    if (isTrialExpired) {
      const currentPath = window.location.pathname;
      const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
      
      if (!isAllowed) {
        navigate("/assinatura", { replace: true });
      }
    }
  }, [isTrialExpired, navigate, allowedPaths]);

  // Se o trial expirou e não está em uma rota permitida, não renderizar nada
  if (isTrialExpired) {
    const currentPath = window.location.pathname;
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
    
    if (!isAllowed) {
      return null;
    }
  }

  return <>{children}</>;
}


