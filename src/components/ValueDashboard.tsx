// Dashboard de Valor (ROI) - Mostra o valor que o app está gerando
// Calcula automaticamente tempo economizado, valor dos pedidos, etc.

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, DollarSign, TrendingUp, Package, Users, Sparkles, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";
import { supabase } from "@/integrations/supabase/client";
import { useInternationalization } from "@/contexts/InternationalizationContext";

interface ValueMetrics {
  horasEconomizadas: number;
  valorPedidosMes: number;
  pedidosPerdidosEvitados: number;
  tempoMedioPorPedido: number;
  totalPedidos: number;
  totalOrcamentos: number;
  totalClientes: number;
}

export function ValueDashboard() {
  const { formatCurrency } = useInternationalization();
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
    enabled: true,
  });

  // Calcular métricas de valor
  const metrics = useMemo<ValueMetrics>(() => {
    const totalPedidos = orders.length;
    const totalOrcamentos = quotes.length;
    const totalClientes = customers.length;

    // Tempo médio economizado por pedido (estimativa: 30 minutos)
    const tempoMedioPorPedido = 0.5; // horas
    const horasEconomizadas = totalPedidos * tempoMedioPorPedido;

    // Valor total dos pedidos deste mês
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const pedidosMes = orders.filter(
      (order) => new Date(order.created_at) >= inicioMes
    );
    const valorPedidosMes = pedidosMes.reduce(
      (sum, order) => sum + (Number(order.value) || 0),
      0
    );

    // Pedidos perdidos evitados (estimativa: 10% dos pedidos seriam perdidos sem o app)
    const pedidosPerdidosEvitados = Math.round(totalPedidos * 0.1);

    return {
      horasEconomizadas,
      valorPedidosMes,
      pedidosPerdidosEvitados,
      tempoMedioPorPedido,
      totalPedidos,
      totalOrcamentos,
      totalClientes,
    };
  }, [orders, quotes, customers]);

  // Não mostrar se não houver dados suficientes
  if (metrics.totalPedidos === 0 && metrics.totalOrcamentos === 0) {
    return null;
  }

  // Calcular ROI (tempo economizado vs custo do app)
  const custoMensal = 39; // R$ 39/mês
  const valorHora = 50; // Estimativa: R$ 50/hora de trabalho
  const valorEconomizado = metrics.horasEconomizadas * valorHora;
  const roi = valorEconomizado > 0 ? ((valorEconomizado - custoMensal) / custoMensal) * 100 : 0;

  return (
    <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg font-bold text-gray-900">
                💰 Valor que você está gerando
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
          <p className="text-sm text-gray-600 mt-2">
            Veja o quanto o Ateliê Pro está economizando seu tempo e aumentando seus resultados
          </p>
        </CardHeader>
        <CollapsibleContent>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Horas Economizadas */}
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Tempo Economizado</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {metrics.horasEconomizadas.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Economia estimada este mês
            </p>
          </div>

          {/* Valor dos Pedidos */}
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Pedidos Este Mês</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.valorPedidosMes)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Valor total dos pedidos
            </p>
          </div>

          {/* ROI */}
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">ROI Estimado</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {roi > 0 ? `+${roi.toFixed(0)}%` : "Calculando..."}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Retorno sobre investimento
            </p>
          </div>

          {/* Estatísticas */}
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Total de Pedidos</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {metrics.totalPedidos}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Pedidos criados no app
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Orçamentos</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {metrics.totalOrcamentos}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Orçamentos gerados
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Clientes</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {metrics.totalClientes}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Clientes cadastrados
            </p>
          </div>
        </div>

        {/* Mensagem motivacional */}
        <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium text-center">
            🎯 O app está pagando por si só! Você economizou{" "}
            {formatCurrency(metrics.horasEconomizadas * 50)} em tempo este mês.
          </p>
        </div>
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

