import { ReactNode } from "react";
import { useTrialProtection } from "@/hooks/useTrialProtection";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface TrialProtectedRouteProps {
  children: ReactNode;
  allowedPaths?: string[];
}

export function TrialProtectedRoute({ children, allowedPaths = ["/assinatura", "/minha-conta"] }: TrialProtectedRouteProps) {
  const { isTrialExpired, trialEndDate, isLoading } = useTrialProtection();
  const navigate = useNavigate();

  useEffect(() => {
    // Só verificar se temos dados completos do trial e não está carregando
    if (!isLoading && trialEndDate && isTrialExpired) {
      const currentPath = window.location.pathname;
      const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
      
      console.log("🚫 Trial expirado - verificando acesso:", {
        currentPath,
        isAllowed,
        isTrialExpired,
        trialEndDate,
        isLoading
      });
      
      if (!isAllowed) {
        console.log("🚫 Acesso negado - redirecionando para assinatura");
        navigate("/assinatura", { replace: true });
      }
    }
  }, [isTrialExpired, trialEndDate, isLoading, navigate, allowedPaths]);

  // Mostrar loading se ainda está carregando dados do trial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">Carregando dados do trial...</p>
        </div>
      </div>
    );
  }

  // Só mostrar tela de bloqueio se temos certeza de que o trial expirou
  if (trialEndDate && isTrialExpired) {
    const currentPath = window.location.pathname;
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
    
    if (!isAllowed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Trial Expirado</h1>
            <p className="text-gray-600 mb-4">Seu período de teste gratuito expirou.</p>
            <button 
              onClick={() => navigate("/assinatura")}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Assinar Agora
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}


