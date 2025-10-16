import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Upload, File } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getOrderByCode, updateOrder } from "@/integrations/supabase/orders";
import { uploadOrderFile } from "@/integrations/supabase/storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { ORDER_STATUS_OPTIONS } from "@/utils/statusConstants";

export default function EditarPedido() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterUpdate } = useSyncOperations();
  
  const [client, setClient] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [delivery, setDelivery] = useState("");
  const [status, setStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderByCode(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (order) {
      setClient(order.customer_name || "");
      setType(order.type || "");
      setDescription(order.description || "");
      setValue(order.value || 0);
      setPaid(order.paid || 0);
      setDelivery(order.delivery_date || "");
      setStatus(order.status || "");
      setCurrentFileUrl(order.file_url || null);
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client || !client.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    if (!type || !type.trim()) {
      toast.error("Tipo do pedido é obrigatório");
      return;
    }
    if (!description || !description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (value <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    try {
      let fileUrl = currentFileUrl;
      
      // Upload do arquivo se houver um novo
      if (file) {
        const uploadResult = await uploadOrderFile(file, id!);
        if (uploadResult.ok) {
          fileUrl = uploadResult.url;
        } else {
          toast.warning("Arquivo não foi enviado, mas o pedido será atualizado");
        }
      }

      // Atualizar pedido usando a nova função completa
      const result = await updateOrder(id!, {
        customer_name: client,
        customer_phone: order?.customer_phone || "",
        customer_email: order?.customer_email || "",
        type: type,
        description: description,
        value: value,
        paid: paid,
        delivery_date: delivery,
        status: status,
        observations: order?.observations || "",
        file_url: fileUrl
      });
      
      if (result.ok) {
        toast.success("Pedido atualizado com sucesso!");
        // Sincronização automática
        syncAfterUpdate('orders', id!, result.data);
        invalidateRelated('orders');
        navigate(`/pedidos/${id}`);
      } else {
        toast.error(result.error || "Erro ao atualizar pedido");
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      toast.error("Erro ao atualizar pedido");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            </div>
          </div>
        </header>
      </div>
    );
  }

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
            <h1 className="text-2xl font-semibold text-foreground">Editar Pedido</h1>
            <p className="text-sm text-muted-foreground">Pedido #{order.code}</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Input
                    id="client"
                    placeholder="Nome do cliente"
                    required
                    className="border-input"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Produto *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="border-input">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bordado">Bordado</SelectItem>
                      <SelectItem value="camiseta">Camiseta</SelectItem>
                      <SelectItem value="uniforme">Uniforme</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                      <SelectItem value="catalogo">Item do Catálogo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhadamente o produto..."
                  required
                  rows={4}
                  className="border-input resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Total (R$) *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                    className="border-input"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid">Valor Pago (R$)</Label>
                  <Input
                    id="paid"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="border-input"
                    value={paid}
                    onChange={(e) => setPaid(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery">Data de Entrega</Label>
                  <Input
                    id="delivery"
                    type="date"
                    className="border-input"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="border-input">
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

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo / Arte</Label>
                <div className="space-y-3">
                  {currentFileUrl && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                      <File className="w-4 h-4 text-gray-600" />
                      <a
                        href={currentFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Arquivo atual
                      </a>
                    </div>
                  )}
                  <Input
                    id="file"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="border-input"
                  />
                  <p className="text-xs text-gray-500">
                    Formatos aceitos: JPG, PNG, PDF, DOC, DOCX (máx. 10MB)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/pedidos")}
                  className="border-border"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}


