import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, CheckCircle2, Clock, Package, Upload, User, Play, Pause, CheckCircle, Truck, Printer, Edit, CreditCard } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderByCode, updateOrderStatus } from "@/integrations/supabase/orders";
import { getReceitaByOrderCode } from "@/integrations/supabase/receitas";
import { useSync } from "@/contexts/SyncContext";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  client: string;
  type: string;
  description: string;
  value: number;
  paid: number;
  delivery: string; // ISO
  status: "Aguardando aprovação" | "Em produção" | "Finalizando" | "Pronto" | "Aguardando retirada" | "Entregue";
  file?: string;
};


function getStatusStepIndex(status: OrderItem["status"]) {
  const steps: OrderItem["status"][] = [
    "Aguardando aprovação",
    "Em produção",
    "Finalizando",
    "Pronto",
    "Aguardando retirada",
    "Entregue",
  ];
  return steps.indexOf(status);
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPaidValue, setNewPaidValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [forceUpdate, setForceUpdate] = useState(0); // Para forçar re-render
  const [localStatus, setLocalStatus] = useState<string | null>(null); // Estado local do status

  const code = id as string;

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error("Selecione um status");
      return;
    }

    try {
      // Atualizando status do pedido
      
      // Atualizar estado local imediatamente para feedback visual
      setLocalStatus(newStatus);
      
      const result = await updateOrderStatus(code, newStatus);
      if (result.ok) {
        toast.success("Status atualizado com sucesso!");
        setIsStatusDialogOpen(false);
        setNewStatus(""); // Limpar o campo
        
          // Status atualizado no banco, mantendo estado local
        
        // Manter o estado local atualizado
        setLocalStatus(newStatus);
        
        // Invalidar cache e recursos relacionados
        invalidateRelated('orders');
        // Refetch automático
        queryClient.refetchQueries({ queryKey: ["order", code] });
        queryClient.refetchQueries({ queryKey: ["orders"] });
        
      } else {
        console.error("Erro ao atualizar status:", result.error);
        toast.error(result.error || "Erro ao atualizar status");
        
        // Reverter estado local em caso de erro
        setLocalStatus(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
      
      // Reverter estado local em caso de erro
      setLocalStatus(null);
    }
  };

  const handleUpdatePaid = async () => {
    const value = parseFloat(newPaidValue);
    if (isNaN(value) || value < 0) {
      toast.error("Digite um valor válido");
      return;
    }

    try {
      // Atualizando valor pago do pedido
      const result = await updateOrderStatus(code, undefined, value);
      if (result.ok) {
        toast.success("Valor pago atualizado com sucesso!");
        setIsPaidDialogOpen(false);
        setNewPaidValue(""); // Limpar o campo
        
        // Se temos dados atualizados, usar eles diretamente
        if (result.data) {
          // Usando dados atualizados
          // Atualizar o cache do React Query com os dados retornados
          queryClient.setQueryData(["order", code], result.data);
          
          // Forçar re-render imediato
          await queryClient.invalidateQueries({ queryKey: ["order", code] });
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          
          // Refetch para garantir consistência
          refetch();
        } else {
          console.warn("Nenhum dado retornado - forçando refetch");
          // Se não temos dados, forçar refetch completo
          await queryClient.invalidateQueries({ queryKey: ["order", code] });
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          refetch();
        }
      } else {
        console.error("Erro ao atualizar valor pago:", result.error);
        toast.error(result.error || "Erro ao atualizar valor pago");
      }
    } catch (error) {
      console.error("Erro ao atualizar valor pago:", error);
      toast.error("Erro ao atualizar valor pago");
    }
  };

  const handleUpdateDescription = async () => {
    if (!newDescription.trim()) {
      toast.error("Digite uma descrição válida");
      return;
    }

    try {
      // Atualizando descrição do pedido
      const result = await updateOrderStatus(code, undefined, undefined, newDescription);
      if (result.ok) {
        toast.success("Descrição atualizada com sucesso!");
        setNewDescription(""); // Limpar o campo
        
        // Forçar refetch para atualizar a interface
        await queryClient.invalidateQueries({ queryKey: ["order", code] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        refetch();
      } else {
        console.error("Erro ao atualizar descrição:", result.error);
        toast.error(result.error || "Erro ao atualizar descrição");
      }
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      toast.error("Erro ao atualizar descrição");
    }
  };

  const { data: orderDb, isLoading, error, refetch } = useQuery({
    queryKey: ["order", code],
    queryFn: () => getOrderByCode(code),
    enabled: Boolean(code),
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Query para buscar status de pagamento
  const { data: receitaData, isLoading: isLoadingPayment } = useQuery({
    queryKey: ["receita", code],
    queryFn: () => getReceitaByOrderCode(code),
    enabled: Boolean(code),
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre buscar dados frescos
  });
  
  const order = useMemo(() => {
    if (orderDb) {
      console.log("Dados do pedido recebidos:", orderDb, "forceUpdate:", forceUpdate);
      return {
        id: orderDb.code,
        client: orderDb.customer_name,
        type: orderDb.type,
        description: orderDb.description ?? "",
        value: Number(orderDb.value || 0),
        paid: Number(orderDb.paid || 0),
        delivery: orderDb.delivery_date ?? "",
        status: orderDb.status,
        file: orderDb.file_url ?? undefined,
      } as OrderItem;
    }
    return null;
  }, [orderDb, id, forceUpdate]);

  // Função para determinar o status de pagamento
  const getPaymentStatus = () => {
    if (!order) return { status: "unknown", label: "Desconhecido", color: "bg-gray-100 text-gray-600" };
    
    const totalValue = order.value;
    const paidValue = order.paid;
    
    if (paidValue === 0) {
      return { status: "pending", label: "Pendente", color: "bg-yellow-100 text-yellow-800" };
    } else if (paidValue >= totalValue) {
      return { status: "paid", label: "Pago", color: "bg-green-100 text-green-800" };
    } else {
      return { status: "partial", label: "Parcial", color: "bg-blue-100 text-blue-800" };
    }
  };

  const paymentStatus = getPaymentStatus();

  const steps: { key: OrderItem["status"]; label: string; icon: any; description: string }[] = [
    { key: "Aguardando aprovação", label: "Aguardando Aprovação", icon: Clock, description: "Pedido recebido, aguardando confirmação do cliente" },
    { key: "Em produção", label: "Em Produção", icon: Play, description: "Trabalho iniciado, produção em andamento" },
    { key: "Finalizando", label: "Finalizando", icon: Package, description: "Produto quase pronto, acabamentos finais" },
    { key: "Pronto", label: "Pronto", icon: CheckCircle, description: "Produto finalizado, pronto para entrega" },
    { key: "Aguardando retirada", label: "Aguardando Retirada", icon: Truck, description: "Produto pronto, aguardando retirada pelo cliente" },
    { key: "Entregue", label: "Entregue", icon: CheckCircle2, description: "Produto entregue ao cliente, pedido finalizado" },
  ];

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 p-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pedidos")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pedido não encontrado</h1>
              <p className="text-sm text-muted-foreground">Verifique o código e tente novamente</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const currentStep = getStatusStepIndex(order.status);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{order.id}</h1>
            <p className="text-sm text-muted-foreground">Detalhes do pedido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {new Date(order.delivery).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium text-foreground">{order.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor / Pago</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">R$ {order.value} / R$ {order.paid}</p>
                    <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Valor Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="paid">Valor Pago (R$)</Label>
                            <Input
                              id="paid"
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={newPaidValue}
                              onChange={(e) => setNewPaidValue(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdatePaid} className="flex-1">
                              Atualizar
                            </Button>
                            <Button variant="outline" onClick={() => setIsPaidDialogOpen(false)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status de Pagamento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <Badge className={`${paymentStatus.color} border-0`}>
                      {paymentStatus.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30">
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Descrição do Pedido</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Input
                            id="description"
                            placeholder="Descrição do pedido"
                            defaultValue={order.description}
                            onChange={(e) => setNewDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateDescription} className="flex-1">
                            Atualizar
                          </Button>
                          <Button variant="outline" onClick={() => setNewDescription("")}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-foreground mt-1">{order.description}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Arquivo / Arte</p>
                {order.file ? (
                  <a
                    href={order.file}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Upload className="w-4 h-4" /> Baixar arquivo
                  </a>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum arquivo enviado</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Timeline de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const isDone = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const IconComponent = step.icon;
                  
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isDone 
                          ? 'bg-green-100 border-green-500 text-green-600' 
                          : isCurrent
                          ? 'bg-blue-100 border-blue-500 text-blue-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${
                          isDone ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </div>
                        <div className={`text-sm ${
                          isDone ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </div>
                        {isCurrent && (
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Status Atual
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-600" />
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/pedidos/${order.id}/producao`)}
                className="flex-1"
              >
                <Printer className="w-4 h-4 mr-2" />
                Gerar Ordem de Produção
              </Button>
              <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Atualizar Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Atualizar Status do Pedido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="status">Novo Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aguardando aprovação">Aguardando aprovação</SelectItem>
                          <SelectItem value="Em produção">Em produção</SelectItem>
                          <SelectItem value="Finalizando">Finalizando</SelectItem>
                          <SelectItem value="Pronto">Pronto</SelectItem>
                          <SelectItem value="Aguardando retirada">Aguardando retirada</SelectItem>
                          <SelectItem value="Entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateStatus} className="flex-1">
                        Atualizar
                      </Button>
                      <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}