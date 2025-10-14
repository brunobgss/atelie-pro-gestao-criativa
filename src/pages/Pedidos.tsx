import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Search, Filter, Package, Calendar, User, Copy, Edit, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus } from "@/integrations/supabase/orders";
import { toast } from "sonner";
import { getOrderStatusColor } from "@/utils/statusConstants";

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  });

  const getStatusColor = (status: string) => {
    return getOrderStatusColor(status);
  };

  const duplicateOrder = (order: unknown) => {
    // Armazenar dados do pedido para duplicação
    const orderData = {
      client: order.client,
      type: order.type,
      description: order.description,
      value: order.value,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Gestão de Pedidos</h1>
              <p className="text-sm text-muted-foreground">Gerencie todos os pedidos do ateliê</p>
            </div>
          </div>
          <Link to="/pedidos/novo">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6 space-y-6">
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
              <Button variant="outline" className="border-border">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="grid gap-4">
          {orders.map((order) => (
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
                          {new Date(order.delivery).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <span className="text-accent">R$</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor / Pago</p>
                        <p className="text-sm font-medium text-foreground">
                          R$ {order.value} / R$ {order.paid}
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
          ))}
        </div>
      </div>
    </div>
  );
}
