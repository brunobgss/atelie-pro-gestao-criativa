import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, ArrowRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export default function AssinaturaSucesso() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800 flex items-center justify-center gap-2">
            <Crown className="w-6 h-6" />
            Pagamento Aprovado!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-gray-700">
            <p className="text-lg font-semibold mb-2">
              Parabéns, {empresa?.nome || 'Usuário'}!
            </p>
            <p className="text-sm">
              Sua assinatura foi ativada com sucesso. Agora você tem acesso completo 
              a todas as funcionalidades premium do Ateliê Pro.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">O que você ganhou:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Acesso ilimitado a todas as funcionalidades</li>
              <li>✅ Suporte prioritário</li>
              <li>✅ Backup automático dos seus dados</li>
              <li>✅ Relatórios detalhados</li>
              <li>✅ Integração avançada com WhatsApp</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/")}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir para o Dashboard
            </Button>
            
            <p className="text-xs text-gray-500">
              Redirecionando automaticamente em {countdown} segundos...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
