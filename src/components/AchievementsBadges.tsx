// Sistema de Badges e Achievements
// Mostra conquistas do usuário e aumenta engajamento

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trophy, Star, Award, Target, Zap, Crown, Sparkles, Package, FileText, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export function AchievementsBadges() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
  });

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

  // Calcular achievements
  const achievements = useMemo<Achievement[]>(() => {
    const totalPedidos = orders.length;
    const totalOrcamentos = quotes.length;
    const totalClientes = customers.length;

    return [
      {
        id: "first-order",
        name: "Primeiro Pedido",
        description: "Crie seu primeiro pedido",
        icon: <Package className="h-5 w-5" />,
        unlocked: totalPedidos >= 1,
        progress: Math.min(totalPedidos, 1),
        maxProgress: 1,
      },
      {
        id: "first-quote",
        name: "Primeiro Orçamento",
        description: "Crie seu primeiro orçamento",
        icon: <FileText className="h-5 w-5" />,
        unlocked: totalOrcamentos >= 1,
        progress: Math.min(totalOrcamentos, 1),
        maxProgress: 1,
      },
      {
        id: "first-customer",
        name: "Primeiro Cliente",
        description: "Cadastre seu primeiro cliente",
        icon: <Users className="h-5 w-5" />,
        unlocked: totalClientes >= 1,
        progress: Math.min(totalClientes, 1),
        maxProgress: 1,
      },
      {
        id: "10-orders",
        name: "10 Pedidos",
        description: "Crie 10 pedidos",
        icon: <Target className="h-5 w-5" />,
        unlocked: totalPedidos >= 10,
        progress: Math.min(totalPedidos, 10),
        maxProgress: 10,
      },
      {
        id: "50-orders",
        name: "50 Pedidos",
        description: "Crie 50 pedidos",
        icon: <Trophy className="h-5 w-5" />,
        unlocked: totalPedidos >= 50,
        progress: Math.min(totalPedidos, 50),
        maxProgress: 50,
      },
      {
        id: "100-orders",
        name: "100 Pedidos",
        description: "Crie 100 pedidos - Você é um Power User!",
        icon: <Crown className="h-5 w-5" />,
        unlocked: totalPedidos >= 100,
        progress: Math.min(totalPedidos, 100),
        maxProgress: 100,
      },
      {
        id: "10-customers",
        name: "10 Clientes",
        description: "Cadastre 10 clientes",
        icon: <Star className="h-5 w-5" />,
        unlocked: totalClientes >= 10,
        progress: Math.min(totalClientes, 10),
        maxProgress: 10,
      },
      {
        id: "power-user",
        name: "Power User",
        description: "Tenha 10+ pedidos e 5+ clientes",
        icon: <Zap className="h-5 w-5" />,
        unlocked: totalPedidos >= 10 && totalClientes >= 5,
        progress: Math.min(Math.min(totalPedidos, 10) + Math.min(totalClientes, 5), 15),
        maxProgress: 15,
      },
    ];
  }, [orders, quotes, customers]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progress = (unlockedCount / totalCount) * 100;
  const allUnlocked = unlockedCount === totalCount;

  // Não mostrar se não houver nenhum achievement desbloqueado ou em progresso
  if (unlockedCount === 0 && achievements.every(a => a.progress === 0)) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg font-bold text-gray-900">
                🏆 Suas Conquistas
              </CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-600">
              {allUnlocked ? (
                <span className="font-bold text-yellow-600">🎉 TODAS AS CONQUISTAS DESBLOQUEADAS!</span>
              ) : (
                `${unlockedCount} de ${totalCount} desbloqueadas`
              )}
            </p>
            <Badge 
              variant="outline" 
              className={allUnlocked 
                ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-yellow-500 font-bold animate-pulse" 
                : "bg-yellow-100 text-yellow-800"
              }
            >
              {allUnlocked ? "🏆 MESTRE" : `${progress.toFixed(0)}%`}
            </Badge>
          </div>
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                allUnlocked 
                  ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 animate-pulse" 
                  : "bg-gradient-to-r from-yellow-500 to-orange-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Mensagem especial quando todas estão desbloqueadas */}
          {allUnlocked && (
            <div className="mt-3 p-4 bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100 rounded-lg border-2 border-yellow-300 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-6 w-6 text-yellow-600" />
                <h3 className="font-bold text-lg text-yellow-800">Parabéns, Mestre!</h3>
              </div>
              <p className="text-sm text-yellow-900">
                Você desbloqueou <strong>todas as conquistas</strong>! 🎊 Você é um verdadeiro Power User do Ateliê Pro!
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Continue usando o app para maximizar seus resultados e crescer ainda mais seu negócio! 🚀
              </p>
            </div>
          )}
        </CardHeader>
        <CollapsibleContent>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-300 shadow-md"
                  : "bg-white border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`${
                    achievement.unlocked ? "text-yellow-600" : "text-gray-400"
                  }`}
                >
                  {achievement.icon}
                </div>
                <h3
                  className={`font-semibold text-sm ${
                    achievement.unlocked ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {achievement.name}
                </h3>
              </div>
              <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
              {!achievement.unlocked && (
                <div className="text-xs text-gray-500">
                  Progresso: {achievement.progress}/{achievement.maxProgress}
                </div>
              )}
              {achievement.unlocked && (
                <Badge className="bg-yellow-500 text-white text-xs mt-1">
                  ✓ Desbloqueado
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

