// Componente de Onboarding Automático com Checklist
// Mostra progresso dos primeiros passos e cria hábito de uso

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Users, Package, FileText, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  completed: boolean;
}

const ONBOARDING_STORAGE_KEY = "atelie_pro_onboarding_completed";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Buscar dados para verificar progresso
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
  });

  // Verificar se já completou onboarding
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    const dismissed = localStorage.getItem("atelie_pro_onboarding_dismissed") === "true";
    
    // Só mostrar se não completou e não foi dispensado
    if (!completed && !dismissed) {
      setIsVisible(true);
    }
  }, []);

  // Definir steps do onboarding
  const steps: OnboardingStep[] = [
    {
      id: "customer",
      title: "Criar seu primeiro cliente",
      description: "Cadastre um cliente para começar",
      icon: <Users className="h-5 w-5" />,
      route: "/clientes",
      completed: customers.length > 0,
    },
    {
      id: "order",
      title: "Criar seu primeiro pedido",
      description: "Registre um pedido de produção",
      icon: <Package className="h-5 w-5" />,
      route: "/pedidos/novo",
      completed: orders.length > 0,
    },
    {
      id: "quote",
      title: "Criar seu primeiro orçamento",
      description: "Gere um orçamento para seus clientes",
      icon: <FileText className="h-5 w-5" />,
      route: "/orcamentos/novo",
      completed: quotes.length > 0,
    },
  ];

  // Verificar se completou tudo
  const allCompleted = steps.every(step => step.completed);
  const completedCount = steps.filter(step => step.completed).length;
  const progress = (completedCount / steps.length) * 100;

  // Marcar como completo quando terminar tudo
  useEffect(() => {
    if (allCompleted && !localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setIsVisible(false);
    }
  }, [allCompleted]);

  // Não mostrar se foi dispensado ou já completou
  if (!isVisible || isDismissed || allCompleted) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("atelie_pro_onboarding_dismissed", "true");
  };

  const handleStepClick = (step: OnboardingStep) => {
    navigate(step.route);
  };

  return (
    <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-bold text-gray-900">
              Bem-vindo ao Ateliê Pro! 🎉
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Complete estes passos para começar a usar o app:
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso</span>
            <span className="font-semibold text-purple-600">
              {completedCount}/{steps.length} completos
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Lista de steps */}
        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                step.completed
                  ? "bg-green-50 border-green-200 hover:bg-green-100"
                  : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              <div
                className={`flex-shrink-0 ${
                  step.completed ? "text-green-600" : "text-gray-400"
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div
                  className={`font-medium ${
                    step.completed ? "text-green-900" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-xs text-gray-600">{step.description}</div>
              </div>
              <div className="text-purple-600">{step.icon}</div>
            </button>
          ))}
        </div>

        {/* Mensagem de encorajamento */}
        {completedCount > 0 && completedCount < steps.length && (
          <div className="pt-2 text-center">
            <p className="text-sm text-purple-600 font-medium">
              🎯 Continue assim! Você está no caminho certo!
            </p>
          </div>
        )}

        {allCompleted && (
          <div className="pt-2 text-center">
            <p className="text-sm font-bold text-green-600">
              🎉 Parabéns! Você completou o onboarding!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

