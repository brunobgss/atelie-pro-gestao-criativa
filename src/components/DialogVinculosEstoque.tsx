import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { listInventory } from "@/integrations/supabase/inventory";
import { updateProduct, ProductRow } from "@/integrations/supabase/products";
import { useQuery } from "@tanstack/react-query";

interface DialogVinculosEstoqueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  onSuccess?: () => void;
}

interface VinculoEstoque {
  inventory_item_id: string;
  quantity_per_unit: number;
}

export function DialogVinculosEstoque({
  open,
  onOpenChange,
  product,
  onSuccess,
}: DialogVinculosEstoqueProps) {
  const [vinculos, setVinculos] = useState<VinculoEstoque[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Buscar itens de estoque
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
    enabled: open,
  });

  // Carregar vínculos existentes quando o produto mudar
  useEffect(() => {
    if (product && open) {
      // Parse JSON se necessário (Supabase pode retornar como string ou array)
      let items: string[] = [];
      let quantities: number[] = [];
      
      if (product.inventory_items) {
        if (typeof product.inventory_items === 'string') {
          try {
            items = JSON.parse(product.inventory_items);
          } catch {
            items = [];
          }
        } else if (Array.isArray(product.inventory_items)) {
          items = product.inventory_items;
        }
      }
      
      if (product.inventory_quantities) {
        if (typeof product.inventory_quantities === 'string') {
          try {
            quantities = JSON.parse(product.inventory_quantities);
          } catch {
            quantities = [];
          }
        } else if (Array.isArray(product.inventory_quantities)) {
          quantities = product.inventory_quantities;
        }
      }
      
      const vinculosExistentes: VinculoEstoque[] = items.map((itemId, index) => ({
        inventory_item_id: itemId,
        quantity_per_unit: quantities[index] ?? 1,
      }));
      
      setVinculos(vinculosExistentes.length > 0 ? vinculosExistentes : []);
    } else if (!product) {
      setVinculos([]);
    }
  }, [product, open]);

  const adicionarVinculo = () => {
    setVinculos([...vinculos, { inventory_item_id: "", quantity_per_unit: 1 }]);
  };

  const removerVinculo = (index: number) => {
    setVinculos(vinculos.filter((_, i) => i !== index));
  };

  const atualizarVinculo = (index: number, field: keyof VinculoEstoque, value: string | number) => {
    const novosVinculos = [...vinculos];
    novosVinculos[index] = { ...novosVinculos[index], [field]: value };
    setVinculos(novosVinculos);
  };

  const salvarVinculos = async () => {
    if (!product) return;

    // Validar vínculos
    const vinculosValidos = vinculos.filter(v => v.inventory_item_id && v.quantity_per_unit > 0);
    
    if (vinculosValidos.length === 0 && vinculos.length > 0) {
      toast.error("Preencha todos os campos dos vínculos ou remova os vínculos vazios");
      return;
    }

    // Verificar se há IDs duplicados
    const ids = vinculosValidos.map(v => v.inventory_item_id);
    if (new Set(ids).size !== ids.length) {
      toast.error("Não é possível vincular o mesmo item de estoque duas vezes");
      return;
    }

    setIsSaving(true);
    try {
      const inventory_items = vinculosValidos.map(v => v.inventory_item_id);
      const inventory_quantities = vinculosValidos.map(v => v.quantity_per_unit);

      const result = await updateProduct(product.id, {
        inventory_items: inventory_items.length > 0 ? inventory_items : undefined,
        inventory_quantities: inventory_quantities.length > 0 ? inventory_quantities : undefined,
      });

      if (result.ok) {
        toast.success("Vínculos de estoque salvos com sucesso!");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao salvar vínculos");
      }
    } catch (error: any) {
      console.error("Erro ao salvar vínculos:", error);
      toast.error("Erro ao salvar vínculos de estoque");
    } finally {
      setIsSaving(false);
    }
  };

  const getItemName = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    return item ? `${item.name} (${item.unit})` : "Selecione um item";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vínculos de Estoque - {product?.name || "Produto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Como funciona:</strong> Configure quais itens de estoque devem ser baixados automaticamente 
              quando este produto for vendido. Você pode definir a quantidade de cada item por unidade do produto.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              <strong>Exemplo:</strong> Se um "Vestido" usa 2 metros de "Tecido" e 1 "Zíper", 
              ao vender 3 vestidos, serão baixados automaticamente: 6 metros de tecido e 3 zíperes.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens de Estoque Vinculados</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarVinculo}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {vinculos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum vínculo configurado</p>
                <p className="text-xs mt-1">
                  Clique em "Adicionar Item" para vincular itens de estoque
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {vinculos.map((vinculo, index) => {
                  const item = inventoryItems.find(i => i.id === vinculo.inventory_item_id);
                  
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs">Item de Estoque</Label>
                          <Select
                            value={vinculo.inventory_item_id}
                            onValueChange={(value) =>
                              atualizarVinculo(index, "inventory_item_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um item">
                                {getItemName(vinculo.inventory_item_id)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.name}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {item.item_type === "produto_acabado"
                                        ? "Produto"
                                        : item.item_type === "tecido"
                                        ? "Tecido"
                                        : "Matéria-prima"}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">
                            Quantidade por unidade do produto
                          </Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={vinculo.quantity_per_unit}
                            onChange={(e) =>
                              atualizarVinculo(
                                index,
                                "quantity_per_unit",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="Ex: 2.5"
                          />
                          {item && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Unidade: {item.unit}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerVinculo(index)}
                        className="mt-6"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={salvarVinculos}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Vínculos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

