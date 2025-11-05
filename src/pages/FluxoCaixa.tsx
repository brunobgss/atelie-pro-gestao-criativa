import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Filter,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Search
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listarContasPagar } from "@/integrations/supabase/contas-pagar";
import { listarContasReceber } from "@/integrations/supabase/contas-receber";
import { formatCurrency } from "@/utils/formatCurrency";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FluxoCaixa() {
  const [mesSelecionado, setMesSelecionado] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const dataInicio = format(startOfMonth(mesSelecionado), "yyyy-MM-dd");
  const dataFim = format(endOfMonth(mesSelecionado), "yyyy-MM-dd");

  const { data: contasPagar = [], isLoading: loadingPagar } = useQuery({
    queryKey: ["contas_pagar", "fluxo", dataInicio, dataFim],
    queryFn: () => listarContasPagar({ data_inicio: dataInicio, data_fim: dataFim })
  });

  const { data: contasReceber = [], isLoading: loadingReceber } = useQuery({
    queryKey: ["contas_receber", "fluxo", dataInicio, dataFim],
    queryFn: () => listarContasReceber({ data_inicio: dataInicio, data_fim: dataFim })
  });

  const isLoading = loadingPagar || loadingReceber;

  // Calcular totais
  const calculos = useMemo(() => {
    const totalPagar = contasPagar
      .filter(c => c.status === 'pendente' || c.status === 'atrasado')
      .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_pago), 0);

    const totalReceber = contasReceber
      .filter(c => c.status === 'pendente' || c.status === 'atrasado')
      .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_recebido), 0);

    const saldo = totalReceber - totalPagar;

    // Agrupar por dia
    const movimentacoesPorDia: Record<string, { pagar: number; receber: number }> = {};

    contasPagar.forEach(conta => {
      const data = conta.data_vencimento.split('T')[0];
      if (!movimentacoesPorDia[data]) {
        movimentacoesPorDia[data] = { pagar: 0, receber: 0 };
      }
      if (conta.status === 'pendente' || conta.status === 'atrasado') {
        movimentacoesPorDia[data].pagar += (conta.valor_total - conta.valor_pago);
      }
    });

    contasReceber.forEach(conta => {
      const data = conta.data_vencimento.split('T')[0];
      if (!movimentacoesPorDia[data]) {
        movimentacoesPorDia[data] = { pagar: 0, receber: 0 };
      }
      if (conta.status === 'pendente' || conta.status === 'atrasado') {
        movimentacoesPorDia[data].receber += (conta.valor_total - conta.valor_recebido);
      }
    });

    const diasOrdenados = Object.keys(movimentacoesPorDia).sort();

    return {
      totalPagar,
      totalReceber,
      saldo,
      movimentacoesPorDia,
      diasOrdenados
    };
  }, [contasPagar, contasReceber]);

  const movimentacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") {
      return calculos.diasOrdenados;
    }
    return calculos.diasOrdenados.filter(dia => {
      const mov = calculos.movimentacoesPorDia[dia];
      if (filtroTipo === "receber") return mov.receber > 0;
      if (filtroTipo === "pagar") return mov.pagar > 0;
      return true;
    });
  }, [calculos, filtroTipo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <header className="border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <SidebarTrigger />
          <div className="mr-4 hidden md:flex">
            <h1 className="text-lg font-semibold">Fluxo de Caixa</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-red-500" />
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency({ value: calculos.totalPagar, currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contas pendentes e atrasadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-500" />
                Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency({ value: calculos.totalReceber, currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contas pendentes e atrasadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
                Saldo Previsto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${calculos.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency({ value: calculos.saldo, currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {calculos.saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesSelecionado(subMonths(mesSelecionado, 1))}
            >
              ←
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesSelecionado(addMonths(mesSelecionado, 1))}
            >
              →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesSelecionado(new Date())}
            >
              Hoje
            </Button>
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receber">Apenas Receitas</SelectItem>
              <SelectItem value="pagar">Apenas Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gráfico de Fluxo */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Carregando dados...</p>
            </CardContent>
          </Card>
        ) : movimentacoesFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma movimentação no período</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa por Dia</CardTitle>
              <CardDescription>
                Movimentações previstas para {format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movimentacoesFiltradas.map((dia) => {
                  const mov = calculos.movimentacoesPorDia[dia];
                  const saldoDia = mov.receber - mov.pagar;
                  
                  return (
                    <div key={dia} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {format(new Date(dia), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <Badge variant={saldoDia >= 0 ? "default" : "destructive"}>
                          Saldo: {formatCurrency({ value: saldoDia, currency: 'BRL' })}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {mov.receber > 0 && (
                          <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>Receber: {formatCurrency({ value: mov.receber, currency: 'BRL' })}</span>
                          </div>
                        )}
                        {mov.pagar > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <TrendingDown className="h-4 w-4" />
                            <span>Pagar: {formatCurrency({ value: mov.pagar, currency: 'BRL' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

