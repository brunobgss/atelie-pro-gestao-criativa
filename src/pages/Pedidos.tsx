import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Filter, Package, Calendar, User, Copy, Edit, X, FileText, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus } from "@/integrations/supabase/orders";
import { toast } from "sonner";
import { getOrderStatusColor, ORDER_STATUS_OPTIONS } from "@/utils/statusConstants";
import { useInternationalization } from "@/contexts/InternationalizationContext";

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useInternationalization();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const rows = await listOrders();
      return rows.map((r) => ({
        id: r.code, // Usar código do pedido como ID
        internalId: r.id, // Manter ID interno para referência
        client: r.customer_name,
        type: r.type,
        description: r.description ?? "",
        value: Number(r.value || 0),
        paid: Number(r.paid || 0),
        delivery: r.delivery_date ?? "",
        status: r.status,
      }));
    },
    staleTime: 10000, // 10 segundos - dados considerados "frescos"
    refetchOnWindowFocus: true, // Atualizar quando a janela recebe foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchInterval: 30000, // Atualizar a cada 30 segundos automaticamente
  });

  const getStatusColor = (status: string) => {
    return getOrderStatusColor(status);
  };

  // Obter tipos únicos de pedidos
  const orderTypes = useMemo(() => {
    const types = new Set<string>();
    orders.forEach(order => {
      if (order.type) {
        types.add(order.type);
      }
    });
    return Array.from(types).sort();
  }, [orders]);

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.client?.toLowerCase().includes(term) ||
        order.type?.toLowerCase().includes(term) ||
        order.id?.toLowerCase().includes(term) ||
        order.description?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (filterStatus !== "all") {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Filtro de tipo
    if (filterType !== "all") {
      filtered = filtered.filter(order => order.type === filterType);
    }

    // Filtro de período
    if (filterPeriod !== "all") {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (filterPeriod === "current_month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (filterPeriod === "last_month") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (filterPeriod === "last_7_days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
      } else if (filterPeriod === "last_30_days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
      }

      if (startDate && endDate) {
        filtered = filtered.filter(order => {
          if (!order.delivery) return false;
          const deliveryDate = new Date(order.delivery);
          return deliveryDate >= startDate! && deliveryDate <= endDate!;
        });
      }
    }

    return filtered;
  }, [orders, searchTerm, filterStatus, filterType, filterPeriod]);

  // Verificar se há filtros ativos
  const hasActiveFilters = filterStatus !== "all" || filterType !== "all" || filterPeriod !== "all";

  // Limpar filtros
  const clearFilters = () => {
    setFilterStatus("all");
    setFilterType("all");
    setFilterPeriod("all");
    setIsFilterDialogOpen(false);
  };

  const duplicateOrder = (order: unknown) => {
    // Armazenar dados do pedido para duplicação
    const orderTyped = order as any;
    const orderData = {
      client: orderTyped.customer_name || orderTyped.client,
      type: orderTyped.type,
      description: orderTyped.description,
      value: orderTyped.value,
      // Não duplicar sinal pago e data de entrega
      paid: 0,
      delivery: "",
    };
    
    // Armazenar no localStorage para usar no NovoPedido
    localStorage.setItem('duplicateOrder', JSON.stringify(orderData));
    
    // Redirecionar para NovoPedido
    navigate('/pedidos/novo');
    
    toast.success("Dados do pedido copiados! Preencha as informações atualizadas.");
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm("Tem certeza que deseja cancelar este pedido?")) {
      try {
        console.log("Cancelando pedido:", orderId);
        
        const result = await updateOrderStatus(orderId, "Cancelado");
        
        if (result.ok) {
          toast.success("Pedido cancelado com sucesso!");
          
          // Invalidar e recarregar os dados
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
          await queryClient.invalidateQueries({ queryKey: ["receitas"] }); // Sincronizar receitas
        } else {
          console.error("Erro ao cancelar pedido:", result.error);
          toast.error(result.error || "Erro ao cancelar pedido");
        }
      } catch (error) {
        console.error("Erro ao cancelar pedido:", error);
        toast.error("Erro ao cancelar pedido");
      }
    }
  };

  const generateProductionOrderPDF = (orders: any[]) => {
    // Filtrar todos os pedidos em aberto (não cancelados nem entregues)
    const openOrders = orders.filter(order => 
      order.status !== "Cancelado" && order.status !== "Entregue"
    );

    if (openOrders.length === 0) {
      toast.warning("Nenhum pedido em aberto encontrado!");
      return;
    }

    // Criar conteúdo do PDF - Lista simples
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lista de Pedidos em Aberto</title>
        <style>
          @media print {
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { font-size: 28px; color: #333; margin-bottom: 10px; }
            .header p { color: #666; font-size: 16px; }
            .order-item { 
              border: 1px solid #ddd; 
              margin-bottom: 15px; 
              padding: 15px; 
              border-radius: 8px;
              background: #f9f9f9;
            }
            .order-header { 
              font-weight: bold; 
              font-size: 16px; 
              color: #2563eb; 
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .order-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 10px; 
              margin-bottom: 10px;
            }
            .detail-item { 
              display: flex; 
              flex-direction: column; 
            }
            .detail-label { 
              font-size: 12px; 
              color: #666; 
              font-weight: bold; 
              text-transform: uppercase;
            }
            .detail-value { 
              font-size: 14px; 
              color: #333; 
              margin-top: 2px;
            }
            .order-description { 
              margin-top: 10px; 
              padding: 10px; 
              background: white; 
              border-radius: 4px; 
              border-left: 4px solid #2563eb;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-production { background: #dbeafe; color: #1e40af; }
            .status-ready { background: #d1fae5; color: #065f46; }
            .status-waiting { background: #f3e8ff; color: #7c3aed; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LISTA DE PEDIDOS EM ABERTO</h1>
          <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p>Total de Pedidos: ${openOrders.length}</p>
        </div>
        
        ${openOrders.map((order, index) => {
          // Extrair informações da descrição
          const description = order.description || '';
          const sizeMatch = description.match(/Tamanho:\s*([^|]+)/);
          const colorMatch = description.match(/Cor:\s*([^|]+)/);
          const size = sizeMatch ? sizeMatch[1].trim() : 'N/A';
          const color = colorMatch ? colorMatch[1].trim() : 'N/A';
          
          // Determinar classe do status
          const getStatusClass = (status) => {
            switch (status) {
              case "Aguardando aprovação": return "status-pending";
              case "Em produção": return "status-production";
              case "Pronto": return "status-ready";
              case "Aguardando retirada": return "status-waiting";
              default: return "status-pending";
            }
          };
          
          return `
            <div class="order-item">
              <div class="order-header">
                <span>Pedido #${order.id}</span>
                <span class="status-badge ${getStatusClass(order.status)}">${order.status}</span>
              </div>
              <div class="order-details">
                <div class="detail-item">
                  <span class="detail-label">Cliente</span>
                  <span class="detail-value">${order.client}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tipo</span>
                  <span class="detail-value">${order.type}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tamanho</span>
                  <span class="detail-value">${size}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Cor</span>
                  <span class="detail-value">${color}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Valor</span>
                  <span class="detail-value">{formatCurrency(order.value)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Entrega</span>
                  <span class="detail-value">${order.delivery ? new Date(order.delivery).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
              </div>
              <div class="order-description">
                <strong>Descrição:</strong> ${description.replace(/\n/g, ' ')}
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="footer">
          <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
        </div>
      </body>
      </html>
    `;

    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Aguardar carregamento e imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
      toast.success("Lista de pedidos gerada com sucesso!");
    } else {
      toast.error("Erro ao abrir janela de impressão!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-semibold text-foreground truncate">Gestão de Pedidos</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Gerencie todos os pedidos do ateliê</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateProductionOrderPDF(orders)}
              className="flex-1 md:flex-none border-blue-200 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
            >
              <FileText className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Lista de Pedidos em Aberto</span>
              <span className="md:hidden">Lista PDF</span>
            </Button>
            <Link to="/pedidos/novo" className="flex-1 md:flex-none">
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-xs md:text-sm">
                <Plus className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Novo Pedido</span>
                <span className="md:hidden">Novo</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, tipo ou pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-input"
                />
              </div>
              <Button 
                variant="outline" 
                className={`border-border ${hasActiveFilters ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => setIsFilterDialogOpen(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    <span className="text-xs">!</span>
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contador de resultados */}
        {(searchTerm || hasActiveFilters) && (
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredOrders.length} de {orders.length} pedido(s)
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-2 h-auto p-1 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Orders List */}
        <div className="grid gap-4">
          {filteredOrders.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum pedido encontrado com os filtros aplicados.</p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="border-border hover:shadow-md transition-all animate-fade-in cursor-pointer"
              onClick={() => navigate(`/pedidos/${order.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      {order.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{order.type}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-foreground">{order.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="text-sm font-medium text-foreground">{order.client}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Entrega</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.delivery ? new Date(order.delivery).toLocaleDateString('pt-BR') : 'Não definida'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <span className="text-accent">{formatCurrency(0).split(' ')[0]}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor / Pago</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(order.value)} / {formatCurrency(order.paid)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateOrder(order);
                      }}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pedidos/editar/${order.id}`);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelOrder(order.id);
                      }}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog de Filtros */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtrar Pedidos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filtro de Status */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type-filter">Tipo de Pedido</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {orderTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Período */}
            <div className="space-y-2">
              <Label htmlFor="period-filter">Período</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger id="period-filter">
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                  <SelectItem value="current_month">Mês atual</SelectItem>
                  <SelectItem value="last_month">Mês anterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
