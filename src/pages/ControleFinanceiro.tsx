import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DollarSign, CreditCard, AlertCircle, CheckCircle, MessageCircle, Search, Calendar, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listReceitas, updatePaymentStatus } from "@/integrations/supabase/receitas";
import { useInternationalization } from "@/contexts/InternationalizationContext";
import { useAuth } from "@/components/AuthProvider";
import { PAYMENT_STATUS_OPTIONS, getPaymentStatusColor } from "@/utils/statusConstants";
import { toast } from "sonner";

interface PaymentStatus {
  id: string;
  orderCode: string;
  client: string;
  totalValue: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPercentage: number;
  isFullyPaid: boolean;
  isOverdue: boolean;
  deliveryDate: string;
}

export default function ControleFinanceiro() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all"); // Mudado para "all" por padrão para mostrar todos os pedidos
  const queryClient = useQueryClient();
  const { empresa } = useAuth();
  const { formatCurrency } = useInternationalization();
  
  // Estados para modal de cobrança
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentStatus | null>(null);

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    staleTime: 10000, // 10 segundos - dados considerados "frescos"
    refetchOnWindowFocus: true, // Atualizar quando a janela recebe foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchInterval: 30000, // Atualizar a cada 30 segundos automaticamente
  });

  const { data: receitas = [], refetch: refetchReceitas } = useQuery({
    queryKey: ["receitas"],
    queryFn: listReceitas,
    staleTime: 10000, // 10 segundos - dados considerados "frescos"
    refetchOnWindowFocus: true, // Atualizar quando a janela recebe foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchInterval: 30000, // Atualizar a cada 30 segundos automaticamente
  });

  // Função para atualizar status de pagamento
  const handlePaymentStatusChange = async (orderCode: string, newStatus: 'pago' | 'pendente' | 'parcial') => {
    try {
      const result = await updatePaymentStatus(orderCode, newStatus);
      
      if (result.ok) {
        toast.success(`Status atualizado para: ${newStatus}`);
        // Invalidar e refetch imediatamente para atualizar a tela
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["receitas"] }),
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
          refetchReceitas(),
          refetchOrders()
        ]);
      } else {
        toast.error(result.error || "Erro ao atualizar status");
      }
    } catch (error) {
      // Erro ao atualizar status
      toast.error("Erro ao atualizar status de pagamento");
    }
  };

  // Calcular período de filtro
  const getPeriodDates = () => {
    const now = new Date();
    
    if (selectedPeriod === "current_month") {
      // Mês atual: primeiro dia do mês até hoje (fim do dia)
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { startDate, endDate };
    } else if (selectedPeriod === "last_month") {
      // Mês anterior: primeiro até último dia do mês passado
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate, endDate };
    } else {
      // Todo o período: sem filtro de data
      return { startDate: null, endDate: null };
    }
  };

  const { startDate, endDate } = getPeriodDates();

  // Debug: Log para verificar quantos pedidos estão sendo processados
  console.log(`[FINANCEIRO] Total de pedidos recebidos: ${orders.length}`);
  console.log(`[FINANCEIRO] Total de receitas recebidas: ${receitas.length}`);
  console.log(`[FINANCEIRO] Período selecionado: ${selectedPeriod}`, { startDate, endDate });

  // Processar dados de pagamento combinando pedidos e receitas
  const paymentStatus: PaymentStatus[] = orders
    .filter(order => {
      // Filtrar pedidos válidos e não cancelados
      if (!order || !order.code || !order.customer_name || order.status === 'Cancelado') {
        return false;
      }
      
      // Filtrar por período se especificado
      if (startDate && endDate) {
        const orderDate = new Date(order.created_at || order.delivery_date || '');
        // Verificar se a data é válida antes de comparar
        if (isNaN(orderDate.getTime())) {
          // Se a data não é válida, incluir o pedido para não perder dados
          return true;
        }
        return orderDate >= startDate && orderDate <= endDate;
      }
      
      return true;
    })
    .map(order => {
      const totalValue = Number(order.value || 0);
      
      // Buscar receita correspondente
      const receita = receitas.find(r => r.order_code === order.code);
      const paidAmount = receita ? Number(receita.amount) : Number(order.paid || 0);
      
      const remainingAmount = totalValue - paidAmount;
      const paymentPercentage = totalValue > 0 ? (paidAmount / totalValue) * 100 : 0;
      // Considerar pago apenas se o valor total for maior que 0 e o restante for menor ou igual a 0
      const isFullyPaid = totalValue > 0 && remainingAmount <= 0;
      
      // Verificar se está atrasado (mais de 7 dias após entrega)
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const today = new Date();
      const isOverdue = deliveryDate && !isNaN(deliveryDate.getTime()) && today > deliveryDate && !isFullyPaid;

      return {
        id: order.id,
        orderCode: order.code,
        client: order.customer_name,
        totalValue,
        paidAmount,
        remainingAmount,
        paymentPercentage,
        isFullyPaid,
        isOverdue,
        deliveryDate: order.delivery_date || "",
      };
    });

  // Debug: Log para verificar quantos pedidos foram processados
  console.log(`[FINANCEIRO] Total de pedidos processados: ${paymentStatus.length}`);
  const naoPagos = paymentStatus.filter(p => !p.isFullyPaid);
  console.log(`[FINANCEIRO] Pedidos não pagos: ${naoPagos.length}`);

  // Filtrar dados
  const filteredPayments = paymentStatus.filter(payment => {
    const clientName = payment.client || "";
    const orderCode = payment.orderCode || "";
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = clientName.toLowerCase().includes(searchLower) ||
                         orderCode.toLowerCase().includes(searchLower);
    
    const matchesFilter = filterStatus === "all" ||
                         (filterStatus === "pending" && !payment.isFullyPaid) ||
                         (filterStatus === "paid" && payment.isFullyPaid) ||
                         (filterStatus === "overdue" && payment.isOverdue);
    
    return matchesSearch && matchesFilter;
  });

  // Estatísticas
  const totalRevenue = paymentStatus.reduce((sum, p) => sum + p.totalValue, 0);
  const totalPaid = paymentStatus.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalPending = paymentStatus.reduce((sum, p) => sum + p.remainingAmount, 0);
  const overdueCount = paymentStatus.filter(p => p.isOverdue).length;

  const generateDefaultPaymentMessage = async (payment: PaymentStatus) => {
    try {
      // Buscar template personalizado
      const { getWhatsAppTemplate, processTemplate, getWhatsAppSettings, addSignature } = await import("@/utils/whatsappTemplates");
      const customTemplate = empresa?.id ? await getWhatsAppTemplate(empresa.id, 'payment') : null;
      
      // Se tem template personalizado, usar ele
      if (customTemplate) {
        const message = processTemplate(customTemplate, {
          cliente: payment.client,
          codigo_pedido: payment.orderCode,
          valor_total: formatCurrency(payment.totalValue),
          valor_pago: formatCurrency(payment.paidAmount),
          valor_restante: formatCurrency(payment.remainingAmount),
          aviso_atraso: payment.isOverdue ? 'ATENÇÃO: Este pedido está em atraso!' : `Prazo de entrega: ${new Date(payment.deliveryDate).toLocaleDateString('pt-BR')}`
        }, empresa);
        
        // Adicionar assinatura se configurada
        const settings = empresa?.id ? await getWhatsAppSettings(empresa.id) : null;
        return addSignature(message, settings);
      }

      // Template padrão
      const defaultMessage = `Olá ${payment.client}!

Lembramos sobre o pagamento do pedido ${payment.orderCode}.

*VALORES:*
• Total: ${formatCurrency(payment.totalValue)}
• Pago: ${formatCurrency(payment.paidAmount)}
• Restante: ${formatCurrency(payment.remainingAmount)}

${payment.isOverdue ? 'ATENÇÃO: Este pedido está em atraso!' : 'Prazo de entrega: ' + new Date(payment.deliveryDate).toLocaleDateString('pt-BR')}

Por favor, entre em contato para quitar o saldo.

_${empresa?.nome || 'Ateliê'}_`;

      // Adicionar assinatura se configurada
      const settings = empresa?.id ? await getWhatsAppSettings(empresa.id) : null;
      return addSignature(defaultMessage, settings);
    } catch (error) {
      console.error("Erro ao gerar mensagem de pagamento:", error);
      // Fallback para template padrão
      return `Olá ${payment.client}!

Lembramos sobre o pagamento do pedido ${payment.orderCode}.

*VALORES:*
• Total: ${formatCurrency(payment.totalValue)}
• Pago: ${formatCurrency(payment.paidAmount)}
• Restante: ${formatCurrency(payment.remainingAmount)}

${payment.isOverdue ? 'ATENÇÃO: Este pedido está em atraso!' : 'Prazo de entrega: ' + new Date(payment.deliveryDate).toLocaleDateString('pt-BR')}

Por favor, entre em contato para quitar o saldo.

_${empresa?.nome || 'Ateliê'}_`;
    }
  };

  const openPaymentReminderModal = async (payment: PaymentStatus) => {
    setSelectedPayment(payment);
    const defaultMessage = await generateDefaultPaymentMessage(payment);
    setCustomMessage(defaultMessage);
    setWhatsappModalOpen(true);
  };

  const sendPaymentReminder = () => {
    if (!customMessage) {
      toast.error("Mensagem não pode estar vazia");
      return;
    }
    
    const message = encodeURIComponent(customMessage);
    window.open(`https://wa.me/?text=${message}`, '_blank');
    toast.success("Lembrete de pagamento enviado!");
    setWhatsappModalOpen(false);
  };

  const getPaymentStatusColor = (payment: PaymentStatus) => {
    if (payment.isOverdue) {
      return "bg-red-100 text-red-700 border-red-300";
    }
    if (payment.isFullyPaid) {
      return "bg-green-100 text-green-700 border-green-300";
    }
    if (payment.paymentPercentage >= 50) {
      return "bg-blue-100 text-blue-700 border-blue-300";
    }
    return "bg-orange-100 text-orange-700 border-orange-300";
  };

  const getPaymentStatusText = (payment: PaymentStatus) => {
    if (payment.isOverdue) return "Atrasado";
    if (payment.isFullyPaid) return "Quitado";
    if (payment.paymentPercentage >= 50) return "Parcial";
    return "Sinal";
  };

  // Obter label do período selecionado
  const getPeriodLabel = () => {
    const now = new Date();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    if (selectedPeriod === "current_month") {
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    } else if (selectedPeriod === "last_month") {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return `${monthNames[lastMonth]} ${lastMonthYear}`;
    } else {
      return "Todo o período";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0" />
                <span className="truncate">Controle Financeiro</span>
              </h1>
              <p className="text-gray-600 text-xs md:text-sm mt-0.5 truncate">Gestão de pagamentos e cobranças</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                toast.loading("Atualizando dados...", { id: "refresh-financeiro" });
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["receitas"] }),
                  queryClient.invalidateQueries({ queryKey: ["orders"] }),
                  refetchReceitas(),
                  refetchOrders()
                ]);
                toast.success("Dados atualizados!", { id: "refresh-financeiro" });
              }}
              className="flex-shrink-0"
              title="Atualizar dados"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Atualizar</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Filtro de Período */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Período:</span>
                <span className="text-sm text-gray-600 font-semibold">{getPeriodLabel()}</span>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mês Atual</SelectItem>
                  <SelectItem value="last_month">Mês Anterior</SelectItem>
                  <SelectItem value="all">Todo o Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Financeiras */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recebido</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalPaid)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendente</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalPending)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
                </div>
                <CreditCard className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atrasados</p>
                  <p className="text-2xl font-bold text-red-600">
                    {overdueCount}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por cliente ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("pending")}
                >
                  Pendentes
                </Button>
                <Button
                  variant={filterStatus === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("paid")}
                >
                  Quitados
                </Button>
                <Button
                  variant={filterStatus === "overdue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("overdue")}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Atrasados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pagamentos */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Status de Pagamentos ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pagamento encontrado</h3>
                <p className="text-gray-600">Ajuste os filtros para ver os pagamentos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`p-3 md:p-4 rounded-lg border ${
                      payment.isOverdue 
                        ? 'bg-red-50 border-red-200' 
                        : payment.isFullyPaid
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          payment.isOverdue 
                            ? 'bg-red-100 text-red-600' 
                            : payment.isFullyPaid
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">{payment.client}</h3>
                            <Badge variant="outline" className={`text-xs ${getPaymentStatusColor(payment)} flex-shrink-0`}>
                              {getPaymentStatusText(payment)}
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 truncate">Pedido: {payment.orderCode}</p>
                          <p className="text-xs text-gray-500 truncate">
                            Entrega: {payment.deliveryDate ? new Date(payment.deliveryDate).toLocaleDateString('pt-BR') : 'Não definida'}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="space-y-1">
                          <div className="text-xs md:text-sm">
                            <span className="text-gray-600">Total: </span>
                            <span className="font-semibold">{formatCurrency(payment.totalValue)}</span>
                          </div>
                          <div className="text-xs md:text-sm">
                            <span className="text-gray-600">Pago: </span>
                            <span className="font-semibold text-green-600">{formatCurrency(payment.paidAmount)}</span>
                          </div>
                          {!payment.isFullyPaid && (
                            <div className="text-xs md:text-sm">
                              <span className="text-gray-600">Restante: </span>
                              <span className={`font-semibold ${payment.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                {formatCurrency(payment.remainingAmount)}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {payment.paymentPercentage.toFixed(0)}% pago
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Seletor de Status de Pagamento */}
                        <div className="w-full sm:min-w-[120px]">
                          <Select
                            value={payment.isFullyPaid ? 'pago' : (payment.paidAmount > 0 ? 'parcial' : 'pendente')}
                            onValueChange={(value: 'pago' | 'parcial' | 'pendente') => 
                              handlePaymentStatusChange(payment.orderCode, value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Botões Originais */}
                        {!payment.isFullyPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentReminderModal(payment)}
                            className="text-green-600 border-green-200 hover:bg-green-50 flex-1 sm:flex-none text-xs"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Cobrar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/pedidos/${payment.orderCode}`, '_blank')}
                          className="flex-1 sm:flex-none text-xs"
                        >
                          Ver Pedido
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Cobrança WhatsApp */}
        <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalizar Mensagem de Cobrança</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPayment && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Pedido:</p>
                  <p className="font-medium">{selectedPayment.orderCode} - {selectedPayment.client}</p>
                  <p className="text-sm text-gray-500">
                    Valor Restante: {formatCurrency(selectedPayment.remainingAmount)}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="payment-message">Mensagem</Label>
                <Textarea
                  id="payment-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem personalizada..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setWhatsappModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedPayment) {
                      const defaultMsg = await generateDefaultPaymentMessage(selectedPayment);
                      setCustomMessage(defaultMsg);
                    }
                  }}
                  variant="outline"
                >
                  Usar Modelo Padrão
                </Button>
                <Button
                  onClick={sendPaymentReminder}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

