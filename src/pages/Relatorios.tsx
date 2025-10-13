import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Calendar, Download, Filter } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/integrations/supabase/orders";
import { listQuotes } from "@/integrations/supabase/quotes";

interface ReportData {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  topCustomers: Array<{ name: string; orders: number; revenue: number }>;
  statusBreakdown: Record<string, number>;
}

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [reportType, setReportType] = useState<string>("overview");

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: listQuotes,
  });

  const reportData = useMemo((): ReportData => {
    const now = new Date();
    const daysAgo = parseInt(selectedPeriod);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filtrar dados do período
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at || order.delivery_date || '');
      return orderDate >= startDate;
    });

    const filteredQuotes = quotes.filter(quote => {
      const quoteDate = new Date(quote.date || quote.created_at || '');
      return quoteDate >= startDate;
    });

    // Calcular métricas
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.value || 0), 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Produtos mais vendidos
    const productCount: Record<string, { count: number; revenue: number }> = {};
    filteredOrders.forEach(order => {
      const productName = order.type || 'Produto';
      if (!productCount[productName]) {
        productCount[productName] = { count: 0, revenue: 0 };
      }
      productCount[productName].count += 1;
      productCount[productName].revenue += order.value || 0;
    });

    const topProducts = Object.entries(productCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Clientes que mais compram
    const customerCount: Record<string, { orders: number; revenue: number }> = {};
    filteredOrders.forEach(order => {
      const customerName = order.customer_name || 'Cliente';
      if (!customerCount[customerName]) {
        customerCount[customerName] = { orders: 0, revenue: 0 };
      }
      customerCount[customerName].orders += 1;
      customerCount[customerName].revenue += order.value || 0;
    });

    const topCustomers = Object.entries(customerCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Breakdown por status
    const statusBreakdown: Record<string, number> = {};
    filteredOrders.forEach(order => {
      const status = order.status || 'Desconhecido';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    return {
      period: `${daysAgo} dias`,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts,
      topCustomers,
      statusBreakdown
    };
  }, [orders, quotes, selectedPeriod]);

  const exportReport = () => {
    const reportText = `
📊 RELATÓRIO FINANCEIRO - ATELIÊ PRO
Período: ${reportData.period}

💰 RESUMO FINANCEIRO
• Receita Total: R$ ${reportData.totalRevenue.toFixed(2)}
• Total de Pedidos: ${reportData.totalOrders}
• Ticket Médio: R$ ${reportData.averageOrderValue.toFixed(2)}

📦 PRODUTOS MAIS VENDIDOS
${reportData.topProducts.map((product, index) => 
  `${index + 1}. ${product.name}: ${product.count} vendas - R$ ${product.revenue.toFixed(2)}`
).join('\n')}

👥 CLIENTES TOP
${reportData.topCustomers.map((customer, index) => 
  `${index + 1}. ${customer.name}: ${customer.orders} pedidos - R$ ${customer.revenue.toFixed(2)}`
).join('\n')}

📈 STATUS DOS PEDIDOS
${Object.entries(reportData.statusBreakdown).map(([status, count]) => 
  `• ${status}: ${count} pedidos`
).join('\n')}

Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}
    `.trim();

    navigator.clipboard.writeText(reportText);
    // Aqui você poderia implementar download de PDF
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
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Relatórios Financeiros
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">Análise de performance e vendas</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Métricas Principais */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {reportData.totalRevenue.toFixed(2)}
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
                  <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reportData.totalOrders}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    R$ {reportData.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {reportData.topCustomers.length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análise de Rentabilidade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Margem de Lucro</p>
                  <p className="text-2xl font-bold text-green-600">
                    {((reportData.totalRevenue * 0.35).toFixed(0))}%
                  </p>
                  <p className="text-xs text-green-600">
                    R$ {(reportData.totalRevenue * 0.35).toFixed(2)} lucro estimado
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Custos Estimados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {(reportData.totalRevenue * 0.65).toFixed(2)}
                  </p>
                  <p className="text-xs text-blue-600">
                    65% da receita total
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">ROI Médio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {reportData.totalOrders > 0 ? (((reportData.totalRevenue * 0.35) / reportData.totalOrders) * 100 / reportData.averageOrderValue).toFixed(1) : '0'}%
                  </p>
                  <p className="text-xs text-purple-600">
                    Retorno por pedido
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Produtos Mais Vendidos */}
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Produtos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.count} vendas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {product.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clientes Top */}
          <Card className="bg-white border border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Clientes que Mais Compram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topCustomers.map((customer, index) => (
                  <div key={customer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.orders} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {customer.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status dos Pedidos */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Status dos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(reportData.statusBreakdown).map(([status, count]) => (
                <div key={status} className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">{status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Período */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Resumo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">Receita Total</p>
                <p className="text-2xl font-bold text-green-700">
                  R$ {reportData.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">em {reportData.period}</p>
              </div>
              
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-medium">Pedidos Processados</p>
                <p className="text-2xl font-bold text-blue-700">
                  {reportData.totalOrders}
                </p>
                <p className="text-xs text-blue-600 mt-1">em {reportData.period}</p>
              </div>
              
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-purple-600 font-medium">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-700">
                  R$ {reportData.averageOrderValue.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 mt-1">por pedido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
