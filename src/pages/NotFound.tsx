import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-gray-200/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Página não encontrada</CardTitle>
          <p className="text-gray-600 mt-2">
            A página que você está procurando não existe ou foi movida.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Código de erro: 404
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate("/")} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir para o Dashboard
            </Button>
            
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Se você acredita que isso é um erro, entre em contato com o suporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
