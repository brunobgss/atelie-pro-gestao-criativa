import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  TrendingDown,
  Calendar as CalendarIcon,
  Filter,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listarContasPagar } from "@/integrations/supabase/contas-pagar";
import { listarContasReceber } from "@/integrations/supabase/contas-receber";
import { formatCurrency } from "@/utils/formatCurrency";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subYears,
  startOfQuarter,
  endOfQuarter,
  startOfDay,
  endOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

type PeriodoPredefinido = 
  | "hoje"
  | "ultimos_7_dias"
  | "ultimos_30_dias"
  | "mes_atual"
  | "mes_anterior"
  | "trimestre_atual"
  | "semestre_atual"
  | "ano_atual"
  | "customizado";

export default function FluxoCaixa() {
  const hoje = new Date();
  const [periodoPredefinido, setPeriodoPredefinido] = useState<PeriodoPredefinido>("mes_atual");
  const [dataRange, setDataRange] = useState<DateRange | undefined>({
    from: startOfMonth(hoje),
    to: endOfMonth(hoje)
  });
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [buscaTexto, setBuscaTexto] = useState<string>("");

  // Calcular datas baseado no período selecionado
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (periodoPredefinido) {
      case "hoje":
        inicio = startOfDay(hoje);
        fim = endOfDay(hoje);
        break;
      case "ultimos_7_dias":
        inicio = startOfDay(subDays(hoje, 6));
        fim = endOfDay(hoje);
        break;
      case "ultimos_30_dias":
        inicio = startOfDay(subDays(hoje, 29));
        fim = endOfDay(hoje);
        break;
      case "mes_atual":
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case "mes_anterior":
        inicio = startOfMonth(subMonths(hoje, 1));
        fim = endOfMonth(subMonths(hoje, 1));
        break;
      case "trimestre_atual":
        inicio = startOfQuarter(hoje);
        fim = endOfQuarter(hoje);
        break;
      case "semestre_atual":
        const semestre = Math.floor(hoje.getMonth() / 6);
        inicio = new Date(hoje.getFullYear(), semestre * 6, 1);
        fim = new Date(hoje.getFullYear(), (semestre + 1) * 6, 0, 23, 59, 59);
        break;
      case "ano_atual":
        inicio = startOfYear(hoje);
        fim = endOfYear(hoje);
        break;
      case "customizado":
        if (dataRange?.from && dataRange?.to) {
          inicio = startOfDay(dataRange.from);
          fim = endOfDay(dataRange.to);
        } else {
          inicio = startOfMonth(hoje);
          fim = endOfMonth(hoje);
        }
        break;
      default:
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
    }

    // Garantir que as datas estão no início e fim do dia para evitar problemas de timezone
    const inicioFormatado = format(startOfDay(inicio), "yyyy-MM-dd");
    const fimFormatado = format(endOfDay(fim), "yyyy-MM-dd");
    
    return {
      dataInicio: inicioFormatado,
      dataFim: fimFormatado
    };
  }, [periodoPredefinido, dataRange]);

  const { data: contasPagar = [], isLoading: loadingPagar } = useQuery({
    queryKey: ["contas_pagar", "fluxo", dataInicio, dataFim],
    queryFn: () => listarContasPagar({ data_inicio: dataInicio, data_fim: dataFim })
  });

  const { data: contasReceber = [], isLoading: loadingReceber } = useQuery({
    queryKey: ["contas_receber", "fluxo", dataInicio, dataFim],
    queryFn: () => listarContasReceber({ data_inicio: dataInicio, data_fim: dataFim })
  });

  const isLoading = loadingPagar || loadingReceber;


  // Filtrar contas por status e busca
  const contasPagarFiltradas = useMemo(() => {
    let filtradas = contasPagar;

    // Filtro por status
    if (filtroStatus !== "todos") {
      filtradas = filtradas.filter(c => c.status === filtroStatus);
    }

    // Busca por texto
    if (buscaTexto.trim()) {
      const busca = buscaTexto.toLowerCase();
      filtradas = filtradas.filter(c => 
        c.descricao?.toLowerCase().includes(busca) ||
        c.observacoes?.toLowerCase().includes(busca) ||
        c.categoria?.toLowerCase().includes(busca)
      );
    }

    return filtradas;
  }, [contasPagar, filtroStatus, buscaTexto]);

  const contasReceberFiltradas = useMemo(() => {
    let filtradas = contasReceber;

    // Filtro por status
    if (filtroStatus !== "todos") {
      filtradas = filtradas.filter(c => c.status === filtroStatus);
    }

    // Busca por texto
    if (buscaTexto.trim()) {
      const busca = buscaTexto.toLowerCase();
      filtradas = filtradas.filter(c => 
        c.descricao?.toLowerCase().includes(busca) ||
        c.observacoes?.toLowerCase().includes(busca) ||
        c.categoria?.toLowerCase().includes(busca)
      );
    }

    return filtradas;
  }, [contasReceber, filtroStatus, buscaTexto]);

  // Recalcular totais com contas filtradas
  const calculosFiltrados = useMemo(() => {
    // Calcular totais baseado no filtro de status
    let totalPagar = 0;
    let totalReceber = 0;

    if (filtroStatus === "todos") {
      // Se filtro é "todos", mostrar pendentes/atrasadas como valor pendente e pagas como valor pago
      totalPagar = contasPagarFiltradas
        .filter(c => c.status === 'pendente' || c.status === 'atrasado')
        .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_pago), 0);
      
      totalReceber = contasReceberFiltradas
        .filter(c => c.status === 'pendente' || c.status === 'atrasado')
        .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_recebido), 0);
    } else if (filtroStatus === "pago") {
      // Se filtro é "pago", mostrar apenas valores pagos/recebidos
      totalPagar = contasPagarFiltradas
        .filter(c => c.status === 'pago')
        .reduce((acc, conta) => acc + conta.valor_pago, 0);
      
      totalReceber = contasReceberFiltradas
        .filter(c => c.status === 'recebido')
        .reduce((acc, conta) => acc + conta.valor_recebido, 0);
    } else {
      // Para outros filtros (pendente, atrasado), mostrar apenas valores pendentes
      totalPagar = contasPagarFiltradas
        .filter(c => c.status === 'pendente' || c.status === 'atrasado')
        .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_pago), 0);
      
      totalReceber = contasReceberFiltradas
        .filter(c => c.status === 'pendente' || c.status === 'atrasado')
        .reduce((acc, conta) => acc + (conta.valor_total - conta.valor_recebido), 0);
    }

    const saldo = totalReceber - totalPagar;

    // Agrupar por dia
    const movimentacoesPorDia: Record<string, { pagar: number; receber: number }> = {};

    contasPagarFiltradas.forEach(conta => {
      const data = conta.data_vencimento.split('T')[0];
      if (!movimentacoesPorDia[data]) {
        movimentacoesPorDia[data] = { pagar: 0, receber: 0 };
      }
      
      // Se o filtro de status está em "todos", mostrar todas as contas
      // Se está em "pago", mostrar apenas as pagas
      // Se está em "pendente" ou "atrasado", mostrar apenas essas
      if (filtroStatus === "todos") {
        // Mostrar todas, mas para pendentes/atrasadas mostrar o valor pendente, para pagas mostrar o valor pago
        if (conta.status === 'pendente' || conta.status === 'atrasado') {
          movimentacoesPorDia[data].pagar += (conta.valor_total - conta.valor_pago);
        } else if (conta.status === 'pago') {
          // Para contas pagas, mostrar o valor que foi pago (já realizado)
          movimentacoesPorDia[data].pagar += conta.valor_pago;
        }
      } else if (filtroStatus === "pago") {
        // Se filtro é "pago", mostrar apenas contas pagas com o valor pago
        if (conta.status === 'pago') {
          movimentacoesPorDia[data].pagar += conta.valor_pago;
        }
      } else {
        // Para outros filtros (pendente, atrasado), mostrar apenas o valor pendente
        if (conta.status === 'pendente' || conta.status === 'atrasado') {
          movimentacoesPorDia[data].pagar += (conta.valor_total - conta.valor_pago);
        }
      }
    });

    contasReceberFiltradas.forEach(conta => {
      const data = conta.data_vencimento.split('T')[0];
      if (!movimentacoesPorDia[data]) {
        movimentacoesPorDia[data] = { pagar: 0, receber: 0 };
      }
      
      // Mesma lógica para contas a receber
      if (filtroStatus === "todos") {
        if (conta.status === 'pendente' || conta.status === 'atrasado') {
          movimentacoesPorDia[data].receber += (conta.valor_total - conta.valor_recebido);
        } else if (conta.status === 'recebido') {
          // Para contas recebidas, mostrar o valor que foi recebido (já realizado)
          movimentacoesPorDia[data].receber += conta.valor_recebido;
        }
      } else if (filtroStatus === "recebido") {
        // Se filtro é "recebido", mostrar apenas contas recebidas com o valor recebido
        if (conta.status === 'recebido') {
          movimentacoesPorDia[data].receber += conta.valor_recebido;
        }
      } else {
        // Para outros filtros (pendente, atrasado), mostrar apenas o valor pendente
        if (conta.status === 'pendente' || conta.status === 'atrasado') {
          movimentacoesPorDia[data].receber += (conta.valor_total - conta.valor_recebido);
        }
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
  }, [contasPagarFiltradas, contasReceberFiltradas]);

  const movimentacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") {
      return calculosFiltrados.diasOrdenados;
    }
    return calculosFiltrados.diasOrdenados.filter(dia => {
      const mov = calculosFiltrados.movimentacoesPorDia[dia];
      if (filtroTipo === "receber") return mov.receber > 0;
      if (filtroTipo === "pagar") return mov.pagar > 0;
      return true;
    });
  }, [calculosFiltrados, filtroTipo]);

  // Atualizar dataRange quando período predefinido muda
  const handlePeriodoChange = (novoPeriodo: PeriodoPredefinido) => {
    setPeriodoPredefinido(novoPeriodo);
    if (novoPeriodo !== "customizado") {
      const hoje = new Date();
      let inicio: Date;
      let fim: Date;

      switch (novoPeriodo) {
        case "hoje":
          inicio = startOfDay(hoje);
          fim = endOfDay(hoje);
          break;
        case "ultimos_7_dias":
          inicio = startOfDay(subDays(hoje, 6));
          fim = endOfDay(hoje);
          break;
        case "ultimos_30_dias":
          inicio = startOfDay(subDays(hoje, 29));
          fim = endOfDay(hoje);
          break;
        case "mes_atual":
          inicio = startOfMonth(hoje);
          fim = endOfMonth(hoje);
          break;
        case "mes_anterior":
          inicio = startOfMonth(subMonths(hoje, 1));
          fim = endOfMonth(subMonths(hoje, 1));
          break;
        case "trimestre_atual":
          inicio = startOfQuarter(hoje);
          fim = endOfQuarter(hoje);
          break;
        case "semestre_atual":
          const semestre = Math.floor(hoje.getMonth() / 6);
          inicio = new Date(hoje.getFullYear(), semestre * 6, 1);
          fim = new Date(hoje.getFullYear(), (semestre + 1) * 6, 0, 23, 59, 59);
          break;
        case "ano_atual":
          inicio = startOfYear(hoje);
          fim = endOfYear(hoje);
          break;
        default:
          inicio = startOfMonth(hoje);
          fim = endOfMonth(hoje);
      }
      setDataRange({ from: inicio, to: fim });
    }
  };

  const limparFiltros = () => {
    setFiltroTipo("todos");
    setFiltroStatus("todos");
    setBuscaTexto("");
    setPeriodoPredefinido("mes_atual");
  };

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
                {formatCurrency({ value: calculosFiltrados.totalPagar, currency: 'BRL' })}
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
                {formatCurrency({ value: calculosFiltrados.totalReceber, currency: 'BRL' })}
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
              <div className={`text-2xl font-bold ${calculosFiltrados.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency({ value: calculosFiltrados.saldo, currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {calculosFiltrados.saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Melhorados */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
                Filtros
              </CardTitle>
              {(filtroTipo !== "todos" || filtroStatus !== "todos" || buscaTexto.trim() || periodoPredefinido !== "mes_atual") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Linha 1: Período e Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor de Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <div className="flex gap-2">
                  <Select value={periodoPredefinido} onValueChange={(value) => handlePeriodoChange(value as PeriodoPredefinido)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="ultimos_7_dias">Últimos 7 dias</SelectItem>
                      <SelectItem value="ultimos_30_dias">Últimos 30 dias</SelectItem>
                      <SelectItem value="mes_atual">Mês Atual</SelectItem>
                      <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                      <SelectItem value="trimestre_atual">Trimestre Atual</SelectItem>
                      <SelectItem value="semestre_atual">Semestre Atual</SelectItem>
                      <SelectItem value="ano_atual">Ano Atual</SelectItem>
                      <SelectItem value="customizado">Período Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {periodoPredefinido === "customizado" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-[280px] justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataRange?.from ? (
                            dataRange.to ? (
                              <>
                                {format(dataRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                {format(dataRange.to, "dd/MM/yyyy", { locale: ptBR })}
                              </>
                            ) : (
                              format(dataRange.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                          ) : (
                            <span>Selecione o período</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dataRange?.from ? new Date(dataRange.from.getFullYear(), dataRange.from.getMonth(), 1) : new Date()}
                          selected={dataRange}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              setDataRange({
                                from: startOfDay(range.from),
                                to: endOfDay(range.to)
                              });
                            } else if (range?.from) {
                              setDataRange({
                                from: startOfDay(range.from),
                                to: undefined
                              });
                            } else {
                              setDataRange(range);
                            }
                          }}
                          numberOfMonths={2}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {periodoPredefinido !== "customizado" && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      // Parsear a data corretamente para evitar problemas de timezone
                      const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
                      const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
                      const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
                      const fim = new Date(anoFim, mesFim - 1, diaFim);
                      return `${format(inicio, "dd/MM/yyyy", { locale: ptBR })} - ${format(fim, "dd/MM/yyyy", { locale: ptBR })}`;
                    })()}
                  </p>
                )}
              </div>

              {/* Filtro por Tipo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Movimentação</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="receber">Apenas Receitas</SelectItem>
                    <SelectItem value="pagar">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Status e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Busca por Texto */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Descrição, categoria, observações..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    className="pl-10"
                  />
                  {buscaTexto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setBuscaTexto("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                {(() => {
                  // Parsear a data corretamente para evitar problemas de timezone
                  const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
                  const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
                  const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
                  const fim = new Date(anoFim, mesFim - 1, diaFim);
                  return `Movimentações previstas de ${format(inicio, "dd/MM/yyyy", { locale: ptBR })} até ${format(fim, "dd/MM/yyyy", { locale: ptBR })}`;
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movimentacoesFiltradas.map((dia) => {
                  const mov = calculosFiltrados.movimentacoesPorDia[dia];
                  const saldoDia = mov.receber - mov.pagar;
                  
                  return (
                    <div key={dia} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {(() => {
                              // Parsear a data corretamente para evitar problemas de timezone
                              const [ano, mes, diaNum] = dia.split('-').map(Number);
                              const data = new Date(ano, mes - 1, diaNum);
                              return format(data, "dd/MM/yyyy", { locale: ptBR });
                            })()}
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

