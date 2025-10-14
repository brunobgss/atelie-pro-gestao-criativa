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
      
      console.log("🚫 Trial expirado - verificando acesso:", {
        currentPath,
        isAllowed,
        isTrialExpired
      });
      
      if (!isAllowed) {
        console.log("🚫 Acesso negado - redirecionando para assinatura");
        navigate("/assinatura", { replace: true });
      }
    }
  }, [isTrialExpired, navigate, allowedPaths]);

  // Se o trial expirou e não está em uma rota permitida, mostrar tela de bloqueio
  if (isTrialExpired) {
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


