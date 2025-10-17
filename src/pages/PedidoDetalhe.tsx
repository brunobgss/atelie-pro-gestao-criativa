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
import { ArrowLeft, Calendar, CheckCircle2, Clock, Package, Upload, User, Play, Pause, CheckCircle, Truck, Printer, Edit, CreditCard, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderByCode, updateOrderStatus } from "@/integrations/supabase/orders";
import { getReceitaByOrderCode } from "@/integrations/supabase/receitas";
import { getMedidas } from "@/integrations/supabase/medidas";
import { useSync } from "@/contexts/SyncContext";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { ORDER_STATUS_OPTIONS } from "@/utils/statusConstants";

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

  // Buscar medidas do cliente
  const { empresa } = useAuth();
  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas", empresa?.id],
    queryFn: () => getMedidas(empresa?.id || ''),
    enabled: !!empresa?.id && !!orderDb?.customer_name,
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
  }, [orderDb, forceUpdate]);

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

  // Função para gerar Ficha Técnica para Funcionários (sem valores financeiros)
  const generateEmployeeTechnicalSheet = () => {
    console.log("=== GERANDO FICHA TÉCNICA PARA FUNCIONÁRIOS ===");
    console.log("Order:", order);
    
    // Gerar HTML da ficha técnica
    const technicalSheetHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha Técnica - ${order.id}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white; 
              padding: 20px; 
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #059669; 
              padding-bottom: 20px; 
            }
            .header h1 { font-size: 28px; font-weight: bold; margin: 0; margin-bottom: 10px; color: #059669; }
            .header .subtitle { font-size: 16px; color: #6b7280; }
            .section { 
              margin-bottom: 30px; 
              background: #f0fdf4;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #059669;
            }
            .section h2 { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #059669; 
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .item { 
              display: flex; 
              flex-direction: column; 
            }
            .label { 
              font-size: 12px; 
              color: #6b7280; 
              font-weight: bold; 
              text-transform: uppercase; 
              margin-bottom: 5px; 
            }
            .value { 
              font-size: 16px; 
              color: #1f2937; 
              font-weight: 500; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #f3f4f6; 
              color: #374151; 
            }
            .logo-section { 
              text-align: center; 
              margin: 20px 0; 
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px dashed #d1d5db;
            }
            .logo-section img { 
              max-width: 300px; 
              max-height: 200px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .technical-specs { 
              background: #fef3c7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .technical-specs h3 { 
              margin-bottom: 15px; 
              color: #92400e; 
              font-size: 18px; 
            }
            .technical-specs ul { 
              list-style: none; 
              padding: 0; 
            }
            .technical-specs li { 
              margin-bottom: 10px; 
              display: flex; 
              align-items: center; 
              font-size: 14px;
            }
            .technical-specs li span { 
              color: #059669; 
              margin-right: 10px; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            .employee-notice {
              background: #dbeafe;
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              text-align: center;
            }
            .employee-notice h3 {
              color: #1e40af;
              font-size: 16px;
              margin-bottom: 5px;
            }
            .employee-notice p {
              color: #1e40af;
              font-size: 14px;
            }
            @media print {
              body { padding: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FICHA TÉCNICA DE PRODUÇÃO</h1>
              <div class="subtitle">Código: ${order.id}</div>
              <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="employee-notice">
              <h3>📋 DOCUMENTO INTERNO PARA FUNCIONÁRIOS</h3>
              <p>Esta ficha contém apenas informações técnicas necessárias para a produção</p>
            </div>
            
            <div class="section">
              <h2>📋 Informações do Pedido</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Código</div>
                  <div class="value">${order.id}</div>
                </div>
                <div class="item">
                  <div class="label">Tipo</div>
                  <div class="value">${order.type}</div>
                </div>
                <div class="item">
                  <div class="label">Status</div>
                  <div class="value">
                    <span class="status-badge">${order.status}</span>
                  </div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${new Date(order.delivery).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>👤 Informações do Cliente</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Nome</div>
                  <div class="value">${order.client}</div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${new Date(order.delivery).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>
            
            ${(() => {
              // Filtrar medidas do cliente atual
              const medidasCliente = medidas.filter(medida => 
                medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
              );
              
              if (medidasCliente.length === 0) return '';
              
              return `
                <div class="section">
                  <h2>📏 Medidas do Cliente</h2>
                  ${medidasCliente.map(medida => `
                    <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <h3 style="font-size: 16px; font-weight: bold; color: #059669; margin-bottom: 10px;">
                        ${medida.tipo_peca.toUpperCase()}
                      </h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        ${medida.busto ? `<div><strong>Busto:</strong> ${medida.busto}cm</div>` : ''}
                        ${medida.cintura ? `<div><strong>Cintura:</strong> ${medida.cintura}cm</div>` : ''}
                        ${medida.quadril ? `<div><strong>Quadril:</strong> ${medida.quadril}cm</div>` : ''}
                        ${medida.ombro ? `<div><strong>Ombro:</strong> ${medida.ombro}cm</div>` : ''}
                        ${medida.largura_costas ? `<div><strong>Larg. Costas:</strong> ${medida.largura_costas}cm</div>` : ''}
                        ${medida.cava_manga ? `<div><strong>Cava Manga:</strong> ${medida.cava_manga}cm</div>` : ''}
                        ${medida.grossura_braco ? `<div><strong>Gross. Braço:</strong> ${medida.grossura_braco}cm</div>` : ''}
                        ${medida.comprimento_manga ? `<div><strong>Comp. Manga:</strong> ${medida.comprimento_manga}cm</div>` : ''}
                        ${medida.cana_braco ? `<div><strong>Cana Braço:</strong> ${medida.cana_braco}cm</div>` : ''}
                        ${medida.alca ? `<div><strong>Alça:</strong> ${medida.alca}cm</div>` : ''}
                        ${medida.pescoco ? `<div><strong>Pescoço:</strong> ${medida.pescoco}cm</div>` : ''}
                        ${medida.comprimento ? `<div><strong>Comprimento:</strong> ${medida.comprimento}cm</div>` : ''}
                        ${medida.coxa ? `<div><strong>Coxa:</strong> ${medida.coxa}cm</div>` : ''}
                        ${medida.tornozelo ? `<div><strong>Tornozelo:</strong> ${medida.tornozelo}cm</div>` : ''}
                        ${medida.comprimento_calca ? `<div><strong>Comp. Calça:</strong> ${medida.comprimento_calca}cm</div>` : ''}
                      </div>
                      ${medida.detalhes_superior ? `
                        <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                          <strong>Detalhes Superiores:</strong> ${medida.detalhes_superior}
                        </div>
                      ` : ''}
                      ${medida.detalhes_inferior ? `
                        <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                          <strong>Detalhes Inferiores:</strong> ${medida.detalhes_inferior}
                        </div>
                      ` : ''}
                      ${medida.observacoes ? `
                        <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 4px;">
                          <strong>Observações:</strong> ${medida.observacoes}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              `;
            })()}
            
            ${order.file ? `
            <div class="section">
              <h2>🎨 Logo/Arte do Pedido</h2>
              <div class="logo-section">
                <img src="${order.file}" alt="Logo/Arte do Pedido" />
                <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <h2>📦 Especificações Técnicas</h2>
              <div class="item">
                <div class="label">Descrição Detalhada</div>
                <div class="value">${order.description}</div>
              </div>
            </div>
            
            <div class="section">
              <h2>⚙️ Instruções de Produção</h2>
              <div class="technical-specs">
                <h3>Checklist de Produção</h3>
                <ul>
                  <li><span>✓</span> Verificar especificações técnicas antes de iniciar</li>
                  <li><span>✓</span> Confirmar materiais e insumos necessários</li>
                  <li><span>✓</span> Seguir cronograma de produção estabelecido</li>
                  <li><span>✓</span> Manter controle de qualidade durante o processo</li>
                  <li><span>✓</span> Comunicar eventuais problemas ou atrasos</li>
                  <li><span>✓</span> Finalizar com inspeção final de qualidade</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
              <p><strong>Documento interno - Não contém informações financeiras</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Abrir nova janela com a ficha técnica
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(technicalSheetHtml);
      newWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      newWindow.onload = () => {
        console.log("Ficha técnica carregada, abrindo diálogo de impressão...");
        newWindow.print();
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

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

              {/* Seção de Medidas do Cliente */}
              {medidas.filter(medida => 
                medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
              ).length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Medidas do Cliente</p>
                  </div>
                  <div className="space-y-3">
                    {medidas
                      .filter(medida => 
                        medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
                      )
                      .map((medida) => (
                        <div key={medida.id} className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-primary">
                              {medida.tipo_peca.toUpperCase()}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {new Date(medida.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {medida.busto && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Busto:</span>
                                <span className="font-medium">{medida.busto}cm</span>
                              </div>
                            )}
                            {medida.cintura && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cintura:</span>
                                <span className="font-medium">{medida.cintura}cm</span>
                              </div>
                            )}
                            {medida.quadril && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quadril:</span>
                                <span className="font-medium">{medida.quadril}cm</span>
                              </div>
                            )}
                            {medida.ombro && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ombro:</span>
                                <span className="font-medium">{medida.ombro}cm</span>
                              </div>
                            )}
                            {medida.largura_costas && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Larg. Costas:</span>
                                <span className="font-medium">{medida.largura_costas}cm</span>
                              </div>
                            )}
                            {medida.cava_manga && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cava Manga:</span>
                                <span className="font-medium">{medida.cava_manga}cm</span>
                              </div>
                            )}
                            {medida.grossura_braco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gross. Braço:</span>
                                <span className="font-medium">{medida.grossura_braco}cm</span>
                              </div>
                            )}
                            {medida.comprimento_manga && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comp. Manga:</span>
                                <span className="font-medium">{medida.comprimento_manga}cm</span>
                              </div>
                            )}
                            {medida.cana_braco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cana Braço:</span>
                                <span className="font-medium">{medida.cana_braco}cm</span>
                              </div>
                            )}
                            {medida.alca && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Alça:</span>
                                <span className="font-medium">{medida.alca}cm</span>
                              </div>
                            )}
                            {medida.pescoco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pescoço:</span>
                                <span className="font-medium">{medida.pescoco}cm</span>
                              </div>
                            )}
                            {medida.comprimento && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comprimento:</span>
                                <span className="font-medium">{medida.comprimento}cm</span>
                              </div>
                            )}
                            {medida.coxa && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Coxa:</span>
                                <span className="font-medium">{medida.coxa}cm</span>
                              </div>
                            )}
                            {medida.tornozelo && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tornozelo:</span>
                                <span className="font-medium">{medida.tornozelo}cm</span>
                              </div>
                            )}
                            {medida.comprimento_calca && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comp. Calça:</span>
                                <span className="font-medium">{medida.comprimento_calca}cm</span>
                              </div>
                            )}
                          </div>
                          
                          {(medida.detalhes_superior || medida.detalhes_inferior || medida.observacoes) && (
                            <div className="mt-3 space-y-2">
                              {medida.detalhes_superior && (
                                <div className="p-2 bg-blue-50 rounded text-xs">
                                  <strong className="text-blue-800">Detalhes Superiores:</strong>
                                  <span className="text-blue-700 ml-1">{medida.detalhes_superior}</span>
                                </div>
                              )}
                              {medida.detalhes_inferior && (
                                <div className="p-2 bg-blue-50 rounded text-xs">
                                  <strong className="text-blue-800">Detalhes Inferiores:</strong>
                                  <span className="text-blue-700 ml-1">{medida.detalhes_inferior}</span>
                                </div>
                              )}
                              {medida.observacoes && (
                                <div className="p-2 bg-yellow-50 rounded text-xs">
                                  <strong className="text-yellow-800">Observações:</strong>
                                  <span className="text-yellow-700 ml-1">{medida.observacoes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
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
              <Button
                onClick={generateEmployeeTechnicalSheet}
                variant="outline"
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Ficha Técnica Funcionários
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
                          {ORDER_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
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