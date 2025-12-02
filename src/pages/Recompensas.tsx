// Página de Recompensas
// Mostra todas as recompensas do usuário: meses grátis, comissões e presentes físicos

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Gift, 
  TrendingUp, 
  Package, 
  Calendar,
  DollarSign,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle,
  Truck,
  MapPin
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Commission {
  id: string;
  amount: number;
  commission_type: string;
  percentage: number;
  status: string;
  created_at: string;
  payment_date?: string;
  period_start?: string;
  period_end?: string;
}

interface PhysicalReward {
  id: string;
  level_reached: string;
  reward_type: string;
  reward_description: string;
  status: string;
  tracking_code?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
}

export default function Recompensas() {
  const { empresa } = useAuth();

  // Buscar comissões
  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ["referral-commissions", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from("referral_commissions")
        .select("*")
        .eq("referrer_empresa_id", empresa.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar comissões:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar presentes físicos
  const { data: physicalRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ["referral-physical-rewards", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from("referral_physical_rewards")
        .select("*")
        .eq("referrer_empresa_id", empresa.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar presentes físicos:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar referências para calcular meses grátis
  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_empresa_id", empresa.id)
        .eq("reward_applied", true);

      if (error) {
        console.error("Erro ao buscar referências:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Calcular estatísticas
  const totalCommissions = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

  const pendingCommissions = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

  const recurringCommissions = commissions.filter(c => 
    c.commission_type === 'recurring' && c.status === 'paid'
  ).length;

  const totalMonthsFree = referrals.length; // Cada indicação convertida = 1 mês grátis

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 text-white">Processando</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-500 text-white">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500 text-white">Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!empresa?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50">
      <header className="bg-white/90 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4 p-4 md:p-6">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minhas Recompensas</h1>
            <p className="text-gray-600 text-sm mt-0.5">Acompanhe todas as suas recompensas do programa de indicação</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 space-y-6">
        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">{totalMonthsFree}</div>
                  <div className="text-xs text-gray-600">Meses Grátis</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalCommissions.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">Comissões Pagas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    R$ {pendingCommissions.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">Pendentes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{recurringCommissions}</div>
                  <div className="text-xs text-gray-600">Recorrentes Ativas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="commissions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commissions">
              <DollarSign className="h-4 w-4 mr-2" />
              Comissões
            </TabsTrigger>
            <TabsTrigger value="physical">
              <Package className="h-4 w-4 mr-2" />
              Presentes Físicos
            </TabsTrigger>
            <TabsTrigger value="months">
              <Gift className="h-4 w-4 mr-2" />
              Meses Grátis
            </TabsTrigger>
          </TabsList>

          {/* Tab: Comissões */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Histórico de Comissões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCommissions ? (
                  <div className="text-center py-8 text-gray-500">Carregando...</div>
                ) : commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Nenhuma comissão ainda</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Continue indicando para ganhar comissões!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.map((commission: Commission) => (
                      <Card key={commission.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-2xl font-bold text-green-600">
                                  R$ {parseFloat(commission.amount.toString()).toFixed(2)}
                                </div>
                                {getStatusBadge(commission.status)}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-3 w-3" />
                                  {commission.percentage}% de comissão {commission.commission_type === 'recurring' ? 'recorrente' : 'única'}
                                </div>
                                {commission.commission_type === 'recurring' && commission.period_start && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    Período: {format(new Date(commission.period_start), "dd/MM/yyyy", { locale: ptBR })}
                                    {commission.period_end && ` - ${format(new Date(commission.period_end), "dd/MM/yyyy", { locale: ptBR })}`}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  Criado em: {format(new Date(commission.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                {commission.payment_date && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    Pago em: {format(new Date(commission.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Presentes Físicos */}
          <TabsContent value="physical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-yellow-600" />
                  Presentes Físicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRewards ? (
                  <div className="text-center py-8 text-gray-500">Carregando...</div>
                ) : physicalRewards.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Nenhum presente físico ainda</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Alcançe os níveis Ouro (5), Platina (10) ou Lendário (50) para ganhar presentes!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {physicalRewards.map((reward: PhysicalReward) => (
                      <Card key={reward.id} className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="h-5 w-5 text-yellow-600" />
                                <div className="font-bold text-lg text-gray-900">
                                  {reward.reward_description}
                                </div>
                                {getStatusBadge(reward.status)}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-3 w-3" />
                                  Nível: {reward.level_reached.charAt(0).toUpperCase() + reward.level_reached.slice(1)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  Solicitado em: {format(new Date(reward.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                {reward.tracking_code && (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Truck className="h-3 w-3" />
                                    Código de rastreamento: {reward.tracking_code}
                                  </div>
                                )}
                                {reward.shipped_at && (
                                  <div className="flex items-center gap-2 text-purple-600">
                                    <Truck className="h-3 w-3" />
                                    Enviado em: {format(new Date(reward.shipped_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                )}
                                {reward.delivered_at && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    Entregue em: {format(new Date(reward.delivered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Meses Grátis */}
          <TabsContent value="months" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Meses Grátis Acumulados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl font-bold text-purple-600 mb-4">
                    {totalMonthsFree}
                  </div>
                  <p className="text-lg text-gray-700 mb-2">
                    {totalMonthsFree === 1 ? "Mês grátis ganho" : "Meses grátis ganhos"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Cada indicação que assina premium = 1 mês grátis para você!
                  </p>
                </div>

                {referrals.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-gray-900 mb-3">Histórico de Indicações Convertidas</h3>
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200"
                      >
                        <div className="flex items-center gap-3">
                          <Gift className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="font-medium text-gray-900">
                              Indicação convertida
                            </div>
                            <div className="text-xs text-gray-500">
                              {referral.converted_at && format(new Date(referral.converted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-green-500 text-white">+1 mês grátis</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

