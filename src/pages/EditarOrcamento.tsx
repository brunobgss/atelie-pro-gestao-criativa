import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getQuoteByCode, updateQuote } from "@/integrations/supabase/quotes";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  value: number;
}

export default function EditarOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [observations, setObservations] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", description: "", quantity: 1, value: 0 }
  ]);

  const { data: quoteData, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuoteByCode(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (quoteData?.quote) {
      const { quote, items: quoteItems } = quoteData;
      setCustomerName(quote.customer_name);
      setCustomerPhone(quote.customer_phone || "");
      setObservations(quote.observations || "");
      
      if (quoteItems.length > 0) {
        setItems(quoteItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          value: item.unit_value || 0
        })));
      }
    }
  }, [quoteData]);

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      value: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.value), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast.error("Todos os itens devem ter descrição");
      return;
    }

    try {
      const result = await updateQuote(id!, {
        customer_name: customerName,
        customer_phone: customerPhone,
        observations: observations,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          value: item.value
        }))
      });
      
      if (result.ok) {
        toast.success("Orçamento atualizado com sucesso!");
        navigate("/orcamentos");
      } else {
        toast.error(result.error || "Erro ao atualizar orçamento");
      }
    } catch (error) {
      console.error("Erro ao atualizar orçamento:", error);
      toast.error("Erro ao atualizar orçamento");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Orçamento não encontrado</h2>
          <p className="text-muted-foreground mb-4">O orçamento solicitado não foi encontrado.</p>
          <Button onClick={() => navigate("/orcamentos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Orçamentos
          </Button>
        </div>
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
            onClick={() => navigate("/orcamentos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Editar Orçamento</h1>
            <p className="text-sm text-muted-foreground">Modifique os dados do orçamento</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nome do Cliente *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    required
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Data de Entrega Estimada</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={3}
                  className="border-input resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Itens do Orçamento</CardTitle>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-border rounded-lg">
                  <div className="md:col-span-6">
                    <Label>Descrição *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Ex: Camiseta bordada logo empresa"
                      className="border-input"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="border-input"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label>Valor Unit. (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.value}
                      onChange={(e) => updateItem(item.id, "value", parseFloat(e.target.value) || 0)}
                      className="border-input"
                    />
                  </div>
                  
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="md:col-span-1 flex items-end">
                    <div className="text-sm font-medium text-foreground">
                      R$ {(item.quantity * item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-border">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total do Orçamento</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  onClick={() => navigate("/orcamentos")}
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


