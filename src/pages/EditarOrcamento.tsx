import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Plus, Trash2, Package, Check, ChevronsUpDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQuoteByCode, updateQuote } from "@/integrations/supabase/quotes";
import { getProducts } from "@/integrations/supabase/products";
import { PersonalizationListEditor, PersonalizationEntry, createEmptyPersonalization } from "@/components/PersonalizationListEditor";
import { cn } from "@/lib/utils";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  value: number;
}

export default function EditarOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [observations, setObservations] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", description: "", quantity: 1, value: 0 }
  ]);
  const [personalizations, setPersonalizations] = useState<PersonalizationEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  // Query para buscar produtos do catálogo
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // Normalizar texto para busca (remove acentos, espaços extras, caixa)
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return products;
    }

    const search = normalizeSearch(productSearchTerm);
    if (!search) return products;

    const searchWords = search.split(" ");

    return products.filter((product) => {
      const base = [
        product.name,
        product.type || "",
        ...(Array.isArray(product.materials) ? product.materials : []),
      ]
        .join(" ")
        .toString();

      const normalizedProduct = normalizeSearch(base);

      // Cada palavra digitada deve existir em alguma parte do texto do produto
      return searchWords.every((word) => normalizedProduct.includes(word));
    });
  }, [products, productSearchTerm]);

  const { data: quoteData, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuoteByCode(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (quoteData?.quote) {
      const { quote, items: quoteItems, personalizations: quotePersonalizations } = quoteData;
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

      // Remover personalizações duplicadas antes de carregar
      const removeDuplicatePersonalizations = (personalizations: typeof quotePersonalizations = []) => {
        if (!personalizations || personalizations.length === 0) return [];
        
        // Sempre usar conteúdo para verificar duplicatas, mesmo se houver ID
        const seenKeys = new Map<string, typeof personalizations[0]>();
        const uniqueItems: typeof personalizations = [];
        
        personalizations.forEach((item) => {
          // Criar chave baseada no conteúdo (normalizar para comparação)
          const personName = (item.person_name || '').trim().toLowerCase();
          const size = (item.size || '').trim().toLowerCase();
          const quantity = item.quantity || 1;
          const notes = (item.notes || '').trim().toLowerCase();
          
          const key = `${personName}_${size}_${quantity}_${notes}`;
          
          if (!seenKeys.has(key)) {
            seenKeys.set(key, item);
            uniqueItems.push(item);
          }
        });
        
        if (personalizations.length !== uniqueItems.length) {
          console.log(`✅ Removidas ${personalizations.length - uniqueItems.length} personalizações duplicadas ao editar orçamento. Original: ${personalizations.length}, Único: ${uniqueItems.length}`);
        }
        
        return uniqueItems;
      };

      const uniquePersonalizations = removeDuplicatePersonalizations(quotePersonalizations ?? []);

      setPersonalizations(
        uniquePersonalizations.map((item) => ({
          id: item.id ?? createEmptyPersonalization().id,
          personName: item.person_name ?? "",
          size: item.size ?? "",
          quantity: item.quantity ?? 1,
          notes: item.notes ?? "",
        }))
      );
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
      // Preparar personalizações - sempre enviar array, mesmo se vazio
      const validPersonalizations = personalizations
        .filter((p) => p.personName.trim())
        .map((p) => ({
          person_name: p.personName.trim(),
          size: p.size?.trim() || undefined,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || undefined,
        }));

      console.log("📝 Enviando personalizações para updateQuote:", {
        total: personalizations.length,
        valid: validPersonalizations.length,
        personalizations: validPersonalizations
      });

      const result = await updateQuote(id!, {
        customer_name: customerName,
        customer_phone: customerPhone,
        observations: observations,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          value: item.value
        })),
        personalizations: validPersonalizations, // Sempre enviar array, mesmo se vazio
      });
      
      if (result.ok) {
        // Invalidar queries relacionadas para forçar recarregamento
        queryClient.invalidateQueries({ queryKey: ["quote", id] });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        
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
              {/* Seletor de Catálogo - Sempre visível */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-blue-600" />
                  <Label className="text-blue-800 font-medium">Adicionar do Catálogo</Label>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productPopoverOpen}
                          className="flex-1 justify-between"
                        >
                          {selectedProduct
                            ? products.find((product) => product.id === selectedProduct)?.name || "Selecione um produto"
                            : "Selecione um produto do catálogo"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Pesquisar produto por nome, tipo ou material..." 
                            value={productSearchTerm}
                            onValueChange={setProductSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {filteredProducts.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.type || ""} ${product.materials?.join(" ") || ""}`}
                                  onSelect={() => {
                                    setSelectedProduct(product.id);
                                    setProductPopoverOpen(false);
                                    setProductSearchTerm("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedProduct === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      R$ {product.unit_price.toFixed(2)}
                                      {product.type && ` • ${product.type}`}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!selectedProduct) {
                          toast.error("Selecione um produto");
                          return;
                        }
                        const product = products.find(p => p.id === selectedProduct);
                        if (product) {
                          // Adicionar o produto como um novo item
                          const newItem: QuoteItem = {
                            id: Date.now().toString(),
                            description: `${product.name}${product.type ? ` - ${product.type}` : ""}${product.materials && product.materials.length > 0 ? ` (${product.materials.join(", ")})` : ""}`,
                            quantity: 1,
                            value: product.unit_price
                          };
                          setItems([...items, newItem]);
                          setSelectedProduct("");
                          toast.success("Produto adicionado ao orçamento!");
                        }
                      }}
                      disabled={!selectedProduct}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
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

              <PersonalizationListEditor
                entries={personalizations}
                onChange={setPersonalizations}
                description="Registre aqui cada camiseta ou peça personalizada com nome e tamanho."
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total do Orçamento</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 border-t border-border sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 flex-1 w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/orcamentos")}
                  className="border-border w-full sm:w-auto"
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


