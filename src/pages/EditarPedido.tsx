import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Save, Upload, File, Package, Plus, X, Search, Check, ChevronsUpDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getOrderByCode, updateOrder } from "@/integrations/supabase/orders";
import { uploadOrderFile } from "@/integrations/supabase/storage";
import { getProducts } from "@/integrations/supabase/products";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/contexts/SyncContext";
import { useSyncOperations } from "@/hooks/useSyncOperations";
import { useOrderStatusConfig } from "@/hooks/useOrderStatusConfig";
import { PersonalizationListEditor, PersonalizationEntry, createEmptyPersonalization } from "@/components/PersonalizationListEditor";
import { cn } from "@/lib/utils";

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
  const [personalizations, setPersonalizations] = useState<PersonalizationEntry[]>([]);
  
  // Estados para produtos do catálogo
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [addedCatalogProducts, setAddedCatalogProducts] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);

  const { statusOptions } = useOrderStatusConfig();
  
  // Buscar produtos do catálogo
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  
  // Normalizar texto para busca (remove acentos, espaços extras, caixa)
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ");

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const normalized = normalizeSearch(productSearchTerm);
    return products.filter((product) => {
      const nameMatch = normalizeSearch(product.name || "").includes(normalized);
      const typeMatch = product.type && normalizeSearch(product.type).includes(normalized);
      const materialsMatch = Array.isArray(product.materials)
        ? product.materials.some((m: string) => normalizeSearch(m).includes(normalized))
        : false;
      return nameMatch || typeMatch || materialsMatch;
    });
  }, [products, productSearchTerm]);
  
  // Atualizar valor total quando produtos adicionados mudarem
  useEffect(() => {
    if (addedCatalogProducts.length > 0) {
      const totalValue = addedCatalogProducts.reduce((sum, product) => 
        sum + (product.price * product.quantity), 0
      );
      setValue(totalValue);
    }
  }, [addedCatalogProducts]);

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
      setPersonalizations(
        (order.personalizations ?? []).map((item) => ({
          id: item.id ?? createEmptyPersonalization().id,
          personName: item.person_name ?? "",
          size: item.size ?? "",
          quantity: item.quantity ?? 1,
          notes: item.notes ?? "",
        }))
      );
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

      // Preparar produtos para baixa de estoque (apenas os novos adicionados)
      const productsForInventory = addedCatalogProducts.map(product => ({
        id: product.id,
        quantity: product.quantity
      }));

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
        file_url: fileUrl,
        personalizations: personalizations
          .filter((p) => p.personName.trim())
          .map((p) => ({
            person_name: p.personName.trim(),
            size: p.size?.trim() || undefined,
            quantity: p.quantity ?? 1,
            notes: p.notes?.trim() || undefined,
          })),
        products: productsForInventory.length > 0 ? productsForInventory : undefined,
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

              {/* Seletor de Catálogo - Sempre visível */}
              {type === "catalogo" && (
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
                        {selectedProduct && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct("");
                              setProductSearchTerm("");
                            }}
                            className="shrink-0"
                            title="Remover seleção"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
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
                            const productLine = `${product.name}${product.type ? ` - ${product.type}` : ""}${product.materials && product.materials.length > 0 ? ` (${product.materials.join(", ")})` : ""} | Qtd: 1`;
                            setDescription(prev => prev ? `${prev}\n${productLine}` : productLine);
                            
                            setAddedCatalogProducts(prev => [...prev, {
                              id: product.id,
                              name: product.name,
                              price: product.unit_price,
                              quantity: 1
                            }]);
                            
                            setSelectedProduct("");
                            toast.success("Produto adicionado!");
                          }
                        }}
                        disabled={!selectedProduct}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    {addedCatalogProducts.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <Label className="text-sm text-blue-700 font-medium">Produtos adicionados:</Label>
                        <div className="space-y-2">
                          {addedCatalogProducts.map((addedProduct, index) => {
                            const product = products.find(p => p.id === addedProduct.id);
                            return (
                              <div
                                key={`${addedProduct.id}-${index}`}
                                className="flex items-center justify-between gap-3 p-2 bg-white border border-blue-200 rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{addedProduct.name}</p>
                                  <p className="text-xs text-gray-500">
                                    R$ {addedProduct.price.toFixed(2).replace(".", ",")}
                                    {product?.type && ` • ${product.type}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`qty-${index}`} className="text-xs text-gray-600 whitespace-nowrap">
                                    Qtd:
                                  </Label>
                                  <Input
                                    id={`qty-${index}`}
                                    type="number"
                                    min="1"
                                    value={addedProduct.quantity}
                                    onChange={(e) => {
                                      const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                      setAddedCatalogProducts(prev => prev.map((p, i) => 
                                        i === index ? { ...p, quantity: newQuantity } : p
                                      ));
                                      const lines = description.split('\n');
                                      const updatedLines = lines.map(line => {
                                        if (line.includes(addedProduct.name)) {
                                          return line.replace(/Qtd: \d+/, `Qtd: ${newQuantity}`);
                                        }
                                        return line;
                                      });
                                      setDescription(updatedLines.join('\n'));
                                    }}
                                    className="w-16 h-8 text-sm"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setAddedCatalogProducts(prev => prev.filter((p, i) => i !== index));
                                    const lines = description.split('\n');
                                    const filteredLines = lines.filter(line => !line.includes(addedProduct.name));
                                    setDescription(filteredLines.join('\n').trim());
                                  }}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Remover produto"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                    {statusOptions.map((option) => (
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

              <PersonalizationListEditor
                entries={personalizations}
                onChange={setPersonalizations}
                showNotes
                description="Atualize aqui os nomes, tamanhos e observações de cada peça personalizada deste pedido."
              />

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
                  onClick={() => navigate("/pedidos")}
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


