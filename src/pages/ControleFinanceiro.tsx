import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DollarSign, CreditCard, AlertCircle, CheckCircle, MessageCircle, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listReceitas, updatePaymentStatus } from "@/integrations/supabase/receitas";
import { useAuth } from "@/components/AuthProvider";
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
  const queryClient = useQueryClient();
  const { empresa } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: listReceitas,
  });

  // Função para atualizar status de pagamento
  const handlePaymentStatusChange = async (orderCode: string, newStatus: 'pago' | 'pendente' | 'parcial') => {
    try {
      const result = await updatePaymentStatus(orderCode, newStatus);
      
      if (result.ok) {
        toast.success(`Status atualizado para: ${newStatus}`);
        // Recarregar dados
        queryClient.invalidateQueries({ queryKey: ["receitas"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        toast.error(result.error || "Erro ao atualizar status");
      }
    } catch (error) {
      // Erro ao atualizar status
      toast.error("Erro ao atualizar status de pagamento");
    }
  };

  // Processar dados de pagamento combinando pedidos e receitas
  const paymentStatus: PaymentStatus[] = orders
    .filter(order => order && order.code && order.customer_name) // Filtrar pedidos válidos
    .map(order => {
      const totalValue = Number(order.value || 0);
      
      // Buscar receita correspondente
      const receita = receitas.find(r => r.order_code === order.code);
      const paidAmount = receita ? Number(receita.amount) : Number(order.paid || 0);
      
      const remainingAmount = totalValue - paidAmount;
      const paymentPercentage = totalValue > 0 ? (paidAmount / totalValue) * 100 : 0;
      const isFullyPaid = remainingAmount <= 0;
      
      // Verificar se está atrasado (mais de 7 dias após entrega)
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const today = new Date();
      const isOverdue = deliveryDate && today > deliveryDate && !isFullyPaid;

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

  const sendPaymentReminder = (payment: PaymentStatus) => {
    const message = `Olá ${payment.client}!

Lembramos sobre o pagamento do pedido ${payment.orderCode}.

*VALORES:*
• Total: R$ ${payment.totalValue.toFixed(2)}
• Pago: R$ ${payment.paidAmount.toFixed(2)}
• Restante: R$ ${payment.remainingAmount.toFixed(2)}

${payment.isOverdue ? 'ATENÇÃO: Este pedido está em atraso!' : 'Prazo de entrega: ' + new Date(payment.deliveryDate).toLocaleDateString('pt-BR')}

Por favor, entre em contato para quitar o saldo.

_${empresa?.nome || 'Ateliê'}_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Lembrete de pagamento enviado!");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-purple-600" />
                Controle Financeiro
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">Gestão de pagamentos e cobranças</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Estatísticas Financeiras */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {totalRevenue.toFixed(2)}
                  </p>
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
                    R$ {totalPaid.toFixed(2)}
                  </p>
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
                    R$ {totalPending.toFixed(2)}
                  </p>
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
                    className={`p-4 rounded-lg border ${
                      payment.isOverdue 
                        ? 'bg-red-50 border-red-200' 
                        : payment.isFullyPaid
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          payment.isOverdue 
                            ? 'bg-red-100 text-red-600' 
                            : payment.isFullyPaid
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <DollarSign className="w-6 h-6" />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{payment.client}</h3>
                            <Badge variant="outline" className={getPaymentStatusColor(payment)}>
                              {getPaymentStatusText(payment)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">Pedido: {payment.orderCode}</p>
                          <p className="text-xs text-gray-500">
                            Entrega: {payment.deliveryDate ? new Date(payment.deliveryDate).toLocaleDateString('pt-BR') : 'Não definida'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-gray-600">Total: </span>
                            <span className="font-semibold">R$ {payment.totalValue.toFixed(2)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Pago: </span>
                            <span className="font-semibold text-green-600">R$ {payment.paidAmount.toFixed(2)}</span>
                          </div>
                          {!payment.isFullyPaid && (
                            <div className="text-sm">
                              <span className="text-gray-600">Restante: </span>
                              <span className={`font-semibold ${payment.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                R$ {payment.remainingAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {payment.paymentPercentage.toFixed(0)}% pago
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Seletor de Status de Pagamento */}
                        <div className="min-w-[120px]">
                          <Select
                            value={payment.isFullyPaid ? 'pago' : (payment.paidAmount > 0 ? 'parcial' : 'pendente')}
                            onValueChange={(value: 'pago' | 'parcial' | 'pendente') => 
                              handlePaymentStatusChange(payment.orderCode, value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente" className="text-red-600">
                                ⏳ Pendente
                              </SelectItem>
                              <SelectItem value="parcial" className="text-yellow-600">
                                ⚡ Parcial
                              </SelectItem>
                              <SelectItem value="pago" className="text-green-600">
                                ✓ Pago
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Botões Originais */}
                        {!payment.isFullyPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendPaymentReminder(payment)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Cobrar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/pedidos/${payment.orderCode}`, '_blank')}
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
      </div>
    </div>
  );
}

