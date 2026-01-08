import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listInventory } from "@/integrations/supabase/inventory";
import { updateProduct, getProducts, ProductRow } from "@/integrations/supabase/products";
import { useQuery } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import { Checkbox } from "@/components/ui/checkbox";

interface DialogVinculosEstoqueMassaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductIds: string[];
  onSuccess?: () => void;
}

export function DialogVinculosEstoqueMassa({
  open,
  onOpenChange,
  selectedProductIds,
  onSuccess,
}: DialogVinculosEstoqueMassaProps) {
  type BulkActionMode = "upsert" | "remove" | "replace_all";
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
  const [quantityPerUnit, setQuantityPerUnit] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<BulkActionMode>("upsert");
  const [confirmReplaceAll, setConfirmReplaceAll] = useState(false);

  // Buscar itens de estoque
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
    enabled: open,
  });

  // Buscar produtos selecionados
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: open && selectedProductIds.length > 0,
  });

  const selectedProducts = allProducts.filter(p => selectedProductIds.includes(p.id));

  const salvarVinculosMassa = async () => {
    if (!selectedInventoryItem) {
      toast.error("Selecione um item de estoque");
      return;
    }

    if (selectedProductIds.length === 0) {
      toast.error("Nenhum produto selecionado");
      return;
    }

    if (mode !== "remove" && quantityPerUnit <= 0) {
      toast.error("A quantidade por unidade deve ser maior que zero");
      return;
    }

    if (mode === "replace_all" && !confirmReplaceAll) {
      toast.error("Confirme a substituição de vínculos para continuar");
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const productId of selectedProductIds) {
        try {
          const product = allProducts.find(p => p.id === productId);
          if (!product) {
            errorCount++;
            continue;
          }

          // Parse JSON fields se necessário
          let existingItems: string[] = [];
          let existingQuantities: number[] = [];

          if (product.inventory_items) {
            if (typeof product.inventory_items === 'string') {
              try {
                existingItems = JSON.parse(product.inventory_items);
              } catch {
                existingItems = [];
              }
            } else if (Array.isArray(product.inventory_items)) {
              existingItems = product.inventory_items;
            }
          }

          if (product.inventory_quantities) {
            if (typeof product.inventory_quantities === 'string') {
              try {
                existingQuantities = JSON.parse(product.inventory_quantities);
              } catch {
                existingQuantities = [];
              }
            } else if (Array.isArray(product.inventory_quantities)) {
              existingQuantities = product.inventory_quantities;
            }
          }

          // Normalizar consistência: inventory_items e inventory_quantities devem ter mesmo tamanho
          if (existingItems.length !== existingQuantities.length) {
            const min = Math.min(existingItems.length, existingQuantities.length);
            existingItems = existingItems.slice(0, min);
            existingQuantities = existingQuantities.slice(0, min);
            logger.warn("Vínculos inconsistentes (itens vs quantidades). Ajustado automaticamente.", {
              productId,
              itemsLength: existingItems.length,
              quantitiesLength: existingQuantities.length,
            });
          }

          if (mode === "replace_all") {
            // Substituir todos os vínculos do produto por apenas este item
            existingItems = [selectedInventoryItem];
            existingQuantities = [quantityPerUnit];
          } else if (mode === "remove") {
            const itemIndex = existingItems.indexOf(selectedInventoryItem);
            if (itemIndex >= 0) {
              existingItems.splice(itemIndex, 1);
              existingQuantities.splice(itemIndex, 1);
            }
          } else {
            // upsert: atualizar se já existe, senão adicionar
            const itemIndex = existingItems.indexOf(selectedInventoryItem);
            if (itemIndex >= 0) {
              existingQuantities[itemIndex] = quantityPerUnit;
            } else {
              existingItems.push(selectedInventoryItem);
              existingQuantities.push(quantityPerUnit);
            }
          }

          // Salvar vínculos
          const result = await updateProduct(productId, {
            inventory_items: existingItems.length > 0 ? existingItems : undefined,
            inventory_quantities: existingQuantities.length > 0 ? existingQuantities : undefined,
          });

          if (result.ok) {
            successCount++;
          } else {
            errorCount++;
            logger.error(`Erro ao vincular estoque ao produto ${productId}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          logger.error(`Erro ao vincular estoque ao produto ${productId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} produto(s) vinculado(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} produto(s) não puderam ser vinculados`);
      }

      if (successCount > 0) {
        onSuccess?.();
        onOpenChange(false);
        // Limpar campos
        setSelectedInventoryItem("");
        setQuantityPerUnit(1);
        setMode("upsert");
        setConfirmReplaceAll(false);
      }
    } catch (error: any) {
      logger.error('Erro ao salvar vínculos em massa:', error);
      toast.error("Erro ao salvar vínculos: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedInventoryItemName = inventoryItems.find(item => item.id === selectedInventoryItem)?.name || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Vincular Estoque em Massa
          </DialogTitle>
          <DialogDescription>
            Vincule o mesmo item de estoque a {selectedProductIds.length} produto(s) selecionado(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lista de produtos selecionados */}
          <div className="space-y-2">
            <Label>Produtos selecionados ({selectedProductIds.length})</Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-1">
              {selectedProducts.length > 0 ? (
                selectedProducts.map(product => (
                  <Badge key={product.id} variant="secondary" className="mr-2 mb-2">
                    {product.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Carregando produtos...</p>
              )}
            </div>
          </div>

          {/* Ação em massa */}
          <div className="space-y-2">
            <Label>Ação</Label>
            <Select
              value={mode}
              onValueChange={(value) => {
                setMode(value as BulkActionMode);
                setConfirmReplaceAll(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upsert">Adicionar/Atualizar vínculo</SelectItem>
                <SelectItem value="remove">Remover vínculo</SelectItem>
                <SelectItem value="replace_all">Substituir todos os vínculos (perigoso)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === "upsert"
                ? "Adiciona o item ao produto; se já existir, atualiza a quantidade."
                : mode === "remove"
                ? "Remove este item do vínculo dos produtos selecionados (se existir)."
                : "Remove todos os vínculos atuais do produto e deixa apenas este item."}
            </p>
          </div>

          {/* Seleção de item de estoque */}
          <div className="space-y-2">
            <Label htmlFor="inventory-item">
              Item de Estoque <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
              <SelectTrigger id="inventory-item">
                <SelectValue placeholder="Selecione um item de estoque" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.length === 0 ? (
                  <SelectItem value="" disabled>Nenhum item de estoque disponível</SelectItem>
                ) : (
                  inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedInventoryItemName && (
              <p className="text-xs text-muted-foreground">
                Item selecionado: <strong>{selectedInventoryItemName}</strong>
              </p>
            )}
          </div>

          {/* Quantidade por unidade */}
          {mode !== "remove" && (
            <div className="space-y-2">
              <Label htmlFor="quantity-per-unit">
                Quantidade por Unidade <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity-per-unit"
                type="number"
                min="0.01"
                step="0.01"
                value={quantityPerUnit}
                onChange={(e) => setQuantityPerUnit(parseFloat(e.target.value) || 1)}
                placeholder="Ex: 2.5"
              />
              <p className="text-xs text-muted-foreground">
                Quantidade do item de estoque consumida por unidade do produto
              </p>
            </div>
          )}

          {mode === "replace_all" && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <Checkbox
                id="confirmReplaceAll"
                checked={confirmReplaceAll}
                onCheckedChange={(v) => setConfirmReplaceAll(Boolean(v))}
                disabled={isSaving}
              />
              <div className="space-y-1">
                <Label htmlFor="confirmReplaceAll">Eu entendo que isso remove vínculos existentes</Label>
                <p className="text-xs text-amber-800">
                  Segurança: essa ação é perigosa e só é aplicada se você confirmar.
                </p>
              </div>
            </div>
          )}

          {/* Informação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Informação:</strong> Este vínculo será aplicado a todos os {selectedProductIds.length} produto(s) selecionado(s).
              {mode === "replace_all"
                ? " Os vínculos existentes serão substituídos por este item."
                : mode === "remove"
                ? " Se algum produto tiver este item vinculado, ele será removido."
                : " Se algum produto já tiver este item vinculado, a quantidade será atualizada."}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={salvarVinculosMassa} disabled={isSaving || !selectedInventoryItem || (mode === "replace_all" && !confirmReplaceAll)}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              mode === "remove"
                ? `Remover vínculo de ${selectedProductIds.length} Produto(s)`
                : mode === "replace_all"
                ? `Substituir vínculos de ${selectedProductIds.length} Produto(s)`
                : `Vincular ${selectedProductIds.length} Produto(s)`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
