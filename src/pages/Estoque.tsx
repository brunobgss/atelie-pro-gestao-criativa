import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, AlertTriangle, TrendingDown, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listInventory, updateInventoryItem } from "@/integrations/supabase/inventory";
import { useSync } from "@/contexts/SyncContext";
import { useState } from "react";
import { validateName, validateMoney, validateQuantity, validateForm } from "@/utils/validators";
import { errorHandler } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performanceMonitor";

export default function Estoque() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<unknown>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    quantity: "",
    unit: "",
    minQuantity: ""
  });

  const handleEditItem = (item: unknown) => {
    console.log("Editando item:", item);
    if (!item || !item.id) {
      toast.error("Item inválido para edição");
      return;
    }
    
    // FORÇAR ID COMO STRING E PRESERVAR EXATAMENTE
    const itemWithSafeId = {
      ...item,
      id: String(item.id).trim() // Garantir que é string e sem espaços
    };
    
    console.log("ID original:", item.id);
    console.log("ID como string:", String(item.id));
    console.log("ID safe:", itemWithSafeId.id);
    
    setEditingItem(itemWithSafeId);
    setEditForm({
      name: String(item.name || ""),
      quantity: String(item.quantity || ""),
      unit: String(item.unit || ""),
      minQuantity: String(item.min_quantity || "")
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.id) {
      toast.error("Item inválido para edição");
      return;
    }
    
    // PRESERVAR ID EXATAMENTE COMO ESTÁ
    const safeId = String(editingItem.id).trim();
    
    console.log("Salvando edição do item:", safeId, editForm);
    console.log("Tipo do ID:", typeof safeId);
    console.log("ID final:", safeId);
    console.log("ID length:", safeId.length);
    
    // Verificar se o ID tem o formato correto de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(safeId)) {
      console.error("❌ ID não é um UUID válido:", safeId);
      toast.error("ID inválido para edição");
      return;
    }
    
    try {
      const result = await updateInventoryItem(safeId, {
        name: editForm.name,
        quantity: parseFloat(editForm.quantity) || 0,
        unit: editForm.unit,
        min_quantity: parseFloat(editForm.minQuantity) || 0
      });
      
      if (result.ok) {
        toast.success("Item atualizado com sucesso!");
        setIsEditDialogOpen(false);
        setEditingItem(null);
        // Invalidar cache e recursos relacionados
        invalidateRelated('inventory_items');
        // Refetch automático
        queryClient.refetchQueries({ queryKey: ["inventory"] });
      } else {
        toast.error(result.error || "Erro ao atualizar item");
      }
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDeleteItem = async (item: unknown) => {
    if (confirm(`Tem certeza que deseja excluir "${item.name}"?`)) {
      try {
        // Buscar o ID do item no banco
        const { data: inventoryItems, error: fetchError } = await supabase
          .from("inventory_items")
          .select("id")
          .eq("name", item.name)
          .limit(1);

        if (fetchError) {
          console.error("Erro ao buscar item:", fetchError);
          toast.error("Erro ao buscar item para exclusão");
          return;
        }

        if (!inventoryItems || inventoryItems.length === 0) {
          toast.error("Item não encontrado");
          return;
        }

        // Excluir o item
        const { error: deleteError } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", inventoryItems[0].id);

        if (deleteError) {
          console.error("Erro ao excluir item:", deleteError);
          toast.error("Erro ao excluir item: " + deleteError.message);
          return;
        }

        toast.success("Item excluído com sucesso!");
        
        // Invalidar cache e recursos relacionados
        invalidateRelated('inventory_items');
        // Refetch automático
        queryClient.refetchQueries({ queryKey: ["inventory"] });
      } catch (error) {
        console.error("Erro ao excluir item:", error);
        toast.error("Erro ao excluir item");
      }
    }
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const rows = await listInventory();
      return rows.map((r) => ({
        id: r.id, // ADICIONAR ID PARA EDIÇÃO
        name: r.name,
        quantity: Number(r.quantity || 0),
        unit: r.unit,
        min: Number(r.min_quantity || 0),
        min_quantity: Number(r.min_quantity || 0), // ADICIONAR min_quantity PARA COMPATIBILIDADE
        status: r.status,
      }));
    },
  });

  const getStatusInfo = (status: string, quantity: number, min: number) => {
    switch (status) {
      case "critical":
        return {
          badge: <Badge className="bg-destructive/20 text-destructive border-destructive/30">Crítico</Badge>,
          icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
          message: "Estoque crítico!",
        };
      case "low":
        return {
          badge: <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Baixo</Badge>,
          icon: <TrendingDown className="w-5 h-5 text-orange-600" />,
          message: "Estoque baixo",
        };
      default:
        return {
          badge: <Badge className="bg-accent/20 text-accent border-accent/30">Normal</Badge>,
          icon: null,
          message: "",
        };
    }
  };

  const criticalItems = items.filter((item) => item.status === "critical").length;
  const lowItems = items.filter((item) => item.status === "low").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Controle de Estoque</h1>
              <p className="text-sm text-muted-foreground">Gerencie materiais e insumos</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Item de Estoque</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="iname" className="text-right">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input id="iname" className="col-span-3" placeholder="Nome do item" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="iunit" className="text-right">
                    Unidade <span className="text-red-500">*</span>
                  </Label>
                  <Input id="iunit" defaultValue="unidades" className="col-span-3" placeholder="un, kg, m, etc" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="iqty" className="text-right">
                    Quantidade <span className="text-red-500">*</span>
                  </Label>
                  <Input id="iqty" type="number" defaultValue={0} className="col-span-3" placeholder="0" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="imin" className="text-right">
                    Mínimo <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Input id="imin" type="number" defaultValue={0} className="col-span-3" placeholder="0" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const name = (document.getElementById("iname") as HTMLInputElement)?.value;
                    const unit = (document.getElementById("iunit") as HTMLInputElement)?.value;
                    const quantity = Number((document.getElementById("iqty") as HTMLInputElement)?.value || 0);
                    const min = Number((document.getElementById("imin") as HTMLInputElement)?.value || 0);
                    
                    // Validação robusta
                    const validation = validateForm(
                      { name, unit, quantity, min },
                      {
                        name: validateName,
                        unit: (value) => value ? { isValid: true, errors: [] } : { isValid: true, errors: [] },
                        quantity: validateQuantity,
                        min: (value) => value >= 0 ? { isValid: true, errors: [] } : { isValid: false, errors: ['Quantidade mínima não pode ser negativa'] }
                      }
                    );
                    
                    if (!validation.isValid) {
                      validation.errors.forEach(error => toast.error(error));
                      return;
                    }
                    
                    // Medir performance
                    const result = await performanceMonitor.measure(
                      'createInventoryItem',
                      async () => {
                        // Obter empresa_id do usuário logado
                        const { data: userEmpresa } = await supabase
                          .from("user_empresas")
                          .select("empresa_id")
                          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
                          .single();
                        
                        if (!userEmpresa?.empresa_id) {
                          throw new Error("Usuário não tem empresa associada");
                        }
                        
                        const { error } = await supabase.from("inventory_items").insert({ 
                          name, 
                          unit, 
                          quantity, 
                          min_quantity: min, 
                          status: quantity <= 0 ? "critical" : quantity < min ? "low" : "ok",
                          empresa_id: userEmpresa.empresa_id
                        });
                        if (error) throw error;
                        return { success: true };
                      },
                      'Estoque'
                    );
                    
                    if (result.success) {
                      logger.userAction('inventory_item_created', 'ESTOQUE', { name, quantity, min });
                      toast.success("Item adicionado com sucesso!");
                      queryClient.refetchQueries({ queryKey: ["inventory"] });
                    }
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Alerts */}
        {(criticalItems > 0 || lowItems > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {criticalItems > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        {criticalItems} {criticalItems === 1 ? "item" : "itens"} em estoque crítico
                      </p>
                      <p className="text-sm text-muted-foreground">Reposição urgente necessária</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lowItems > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-600">
                        {lowItems} {lowItems === 1 ? "item" : "itens"} com estoque baixo
                      </p>
                      <p className="text-sm text-muted-foreground">Planeje reposição em breve</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="grid gap-3">
          {isLoading && (
            <Card className="border-border animate-shimmer"><CardContent className="h-20" /></Card>
          )}
          {items.map((item, index) => {
            const statusInfo = getStatusInfo(item.status, item.quantity, item.min);
            
            return (
              <Card
                key={index}
                className={`border-border hover:shadow-md transition-all animate-fade-in ${
                  item.status === "critical"
                    ? "border-l-4 border-l-destructive"
                    : item.status === "low"
                    ? "border-l-4 border-l-orange-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {statusInfo.icon}
                      <div>
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Mínimo: {item.min} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                      </div>
                      {statusInfo.badge}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição de Item */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item do Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">
                Nome do Item <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-item-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Nome do item"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">
                  Quantidade <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">
                  Unidade <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-unit"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
                  placeholder="un, kg, m, etc"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-min-quantity">
                Quantidade Mínima <span className="text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="edit-min-quantity"
                type="number"
                value={editForm.minQuantity}
                onChange={(e) => setEditForm({...editForm, minQuantity: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
