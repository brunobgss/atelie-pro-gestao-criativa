import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Share2, Plus, Trash2, MessageCircle, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { createQuote, generateQuoteCode } from "@/integrations/supabase/quotes";
import { useAuth } from "@/components/AuthProvider";

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [items, setItems] = useState([{ description: "", quantity: 1, value: 0 }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientInput = (document.getElementById("client") as HTMLInputElement)?.value;
    const phoneInput = (document.getElementById("phone") as HTMLInputElement)?.value;
    const dateInput = (document.getElementById("date") as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
    const deliveryDateInput = (document.getElementById("deliveryDate") as HTMLInputElement)?.value;
    const observations = (document.getElementById("observations") as HTMLTextAreaElement)?.value || undefined;
    const code = generateQuoteCode();

    const result = await createQuote({
      code,
      customer_name: clientInput,
      customer_phone: phoneInput,
      date: dateInput,
      observations: (observations || '') + (deliveryDateInput ? `\nData de entrega estimada: ${new Date(deliveryDateInput).toLocaleDateString('pt-BR')}` : ''),
      items,
    });

    if (!result.ok) {
      toast.error(result.error || "Erro ao criar orçamento");
      return;
    }

    toast.success("Orçamento criado com sucesso!");
    navigate(`/orcamento/${code}`);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, value: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.value, 0);

  const handleOpenPublic = () => {
    const code = generateQuoteCode();
    window.open(`${window.location.origin}/orcamento/${code}`, "_blank");
  };

  const handleWhatsApp = () => {
    const clientInput = (document.getElementById("client") as HTMLInputElement)?.value || "cliente";
    const message = encodeURIComponent(
      `Olá ${clientInput}! Segue o seu orçamento no ${empresa?.nome || 'Ateliê'}. Total: R$ ${total.toFixed(2)}.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

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
            <h1 className="text-2xl font-semibold text-foreground">Novo Orçamento</h1>
            <p className="text-sm text-muted-foreground">Crie um orçamento rápido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="border-border animate-fade-in">
            <CardHeader>
              <CardTitle className="text-foreground">Informações do Orçamento</CardTitle>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    className="border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data do Orçamento</Label>
                  <Input
                    id="date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Data de Entrega Estimada</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    className="border-input"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Itens do Orçamento</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="border-secondary text-secondary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 p-4 rounded-lg border border-border">
                    <div className="col-span-12 md:col-span-5">
                      <Input
                        placeholder="Descrição do item"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].description = e.target.value;
                          setItems(newItems);
                        }}
                        className="border-input"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Input
                        type="number"
                        placeholder="Qtd"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].quantity = Number(e.target.value);
                          setItems(newItems);
                        }}
                        className="border-input"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="Valor unitário"
                          step="0.01"
                          min="0"
                          value={item.value}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].value = Number(e.target.value);
                            setItems(newItems);
                          }}
                          className="border-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          Valor por unidade (ex: 25.50)
                        </p>
                      </div>
                    </div>
                    {items.length > 1 && (
                      <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-end p-4 bg-muted/30 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações adicionais..."
                  rows={3}
                  className="border-input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Orçamento
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-secondary text-secondary"
                    onClick={handleOpenPublic}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-600/10"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
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
