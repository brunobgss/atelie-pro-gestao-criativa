import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Share2, Plus, Trash2, MessageCircle, Printer, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { createQuote, generateQuoteCode } from "@/integrations/supabase/quotes";
import { getProducts } from "@/integrations/supabase/products";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { validateName, validateMoney, validateDescription, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { syncAfterCreate } = useSyncOperations();
  const [items, setItems] = useState([{ description: "", quantity: 1, value: 0 }]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  // Query para buscar produtos do catálogo
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientInput = (document.getElementById("client") as HTMLInputElement)?.value;
    const phoneInput = (document.getElementById("phone") as HTMLInputElement)?.value;
    const dateInput = (document.getElementById("date") as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
    const deliveryDateInput = (document.getElementById("deliveryDate") as HTMLInputElement)?.value;
    const observations = (document.getElementById("observations") as HTMLTextAreaElement)?.value || undefined;
    const code = generateQuoteCode();

    // Validação de campos obrigatórios
    // Validação robusta
    const validation = validateForm(
      { client: clientInput, items },
      {
        client: validateName,
        items: (items) => {
          if (!Array.isArray(items) || items.length === 0) {
            return { isValid: false, errors: ['Adicione pelo menos um item ao orçamento'] };
          }
          
          const errors: string[] = [];
          items.forEach((item, index) => {
            if (!item.description?.trim()) {
              errors.push(`Item ${index + 1}: Descrição é obrigatória`);
            }
            if (!item.quantity || item.quantity <= 0) {
              errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
            }
            if (!item.value || item.value <= 0) {
              errors.push(`Item ${index + 1}: Valor deve ser maior que zero`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        }
      }
    );
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Medir performance e criar orçamento
    const result = await performanceMonitor.measure(
      'createQuote',
      async () => {
        return await createQuote({
          code,
          customer_name: clientInput,
          customer_phone: phoneInput,
          date: dateInput,
          observations: (observations || '') + (deliveryDateInput ? `\nData de entrega estimada: ${new Date(deliveryDateInput).toLocaleDateString('pt-BR')}` : ''),
          items,
        });
      },
      'NovoOrcamento'
    );

    if (!result.ok) {
      const appError = errorHandler.handleSupabaseError(
        { message: result.error, code: 'CREATE_QUOTE_ERROR' },
        'createQuote'
      );
      logger.error('Falha ao criar orçamento', 'NOVO_ORCAMENTO', { client: clientInput, itemsCount: items.length, error: result.error });
      toast.error(appError.message);
      return;
    }
    
    // Log de sucesso
    logger.userAction('quote_created', 'NOVO_ORCAMENTO', { 
      quoteCode: code, 
      client: clientInput, 
      itemsCount: items.length, 
      totalValue: items.reduce((sum, item) => sum + (item.quantity * item.value), 0)
    });

    toast.success("Orçamento criado com sucesso!");
    // Sincronização automática
    syncAfterCreate('quotes', result.data);
    invalidateRelated('quotes');
    navigate(`/orcamento/${code}`);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, value: 0 }]);
  };

  // Função para adicionar item do catálogo
  const addCatalogItem = () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto do catálogo");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error("Produto não encontrado");
      return;
    }

    const newItem = {
      description: `${product.name} - ${product.type}`,
      quantity: 1,
      value: product.unit_price
    };

    setItems([...items, newItem]);
    setSelectedProduct(""); // Limpar seleção
    toast.success("Produto adicionado ao orçamento!");
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
                  <div className="flex gap-2">
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
                </div>

                {/* Seletor de Catálogo */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <Label className="text-blue-800 font-medium">Adicionar do Catálogo</Label>
                  </div>
                  <div className="flex gap-3">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um produto do catálogo" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - R$ {product.unit_price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={addCatalogItem}
                      disabled={!selectedProduct}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {selectedProduct && (
                    <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      {(() => {
                        const product = products.find(p => p.id === selectedProduct);
                        return product ? (
                          <div>
                            <p><strong>Nome:</strong> {product.name}</p>
                            <p><strong>Preço:</strong> R$ {product.unit_price.toFixed(2)}</p>
                            <p><strong>Tempo estimado:</strong> {product.work_hours}h</p>
                            <p><strong>Tipo:</strong> {product.type}</p>
                            {product.materials && product.materials.length > 0 && (
                              <p><strong>Materiais:</strong> {product.materials.join(", ")}</p>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
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
