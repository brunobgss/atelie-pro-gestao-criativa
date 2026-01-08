import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listInventory, updateInventoryItem, InventoryItemType, InventoryRow } from "@/integrations/supabase/inventory";
import { supabase } from "@/integrations/supabase/client";
import { useSync } from "@/contexts/SyncContext";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { logger } from "@/utils/logger";
import { validateForm, validateMoney, validateName, validateQuantity } from "@/utils/validators";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  getInventoryAlertPreferences,
  listInventoryAlertLogs,
  triggerInventoryAlertsJob,
  upsertInventoryAlertPreferences,
  InventoryAlertPreferences,
  InventoryAlertLog,
} from "@/integrations/supabase/inventoryAlerts";
import {
  AlertTriangle,
  BellRing,
  Download,
  Filter,
  History,
  HelpCircle,
  PackageSearch,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ImportInventory } from "@/components/ImportInventory";
import { Checkbox } from "@/components/ui/checkbox";

const ITEM_TYPE_OPTIONS: Array<{
  value: InventoryItemType;
  label: string;
  description: string;
  defaultUnit: string;
}> = [
  { value: "materia_prima", label: "Matéria-prima", description: "Linhas, botões, aviamentos, etc.", defaultUnit: "unidades" },
  { value: "tecido", label: "Tecido", description: "Rolôs, metros, retalhos", defaultUnit: "metros" },
  { value: "produto_acabado", label: "Produto acabado", description: "Peças prontas para venda", defaultUnit: "unidades" },
];

type NewItemState = {
  name: string;
  quantity: string;
  unit: string;
  minQuantity: string;
  itemType: InventoryItemType;
  category: string;
  supplier: string;
  costPerUnit: string;
  notes: string;
  lengthMeters: string;
  color: string;
};

type EditItemState = NewItemState & { id?: string };

type AlertFormState = {
  email: string;
  whatsapp: string;
  send_email: boolean;
  send_whatsapp: boolean;
  notify_low: boolean;
  notify_critical: boolean;
  frequency: "daily" | "weekly";
};

const ALERT_DEFAULTS: AlertFormState = {
  email: "",
  whatsapp: "",
  send_email: true,
  send_whatsapp: false,
  notify_low: true,
  notify_critical: true,
  frequency: "daily",
};

function getItemTypeLabel(type: InventoryItemType) {
  return ITEM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Item";
}

function computeStatusInfo(status: string) {
  switch (status) {
    case "critical":
      return {
        tone: "danger",
        badge: <Badge className="bg-destructive/15 text-destructive border border-destructive/30">Crítico</Badge>,
        icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
        message: "Reposição urgente",
      };
    case "low":
      return {
        tone: "warning",
        badge: <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/40">Baixo</Badge>,
        icon: <TrendingDown className="h-5 w-5 text-amber-600" />,
        message: "Planeje reposição",
      };
    default:
      return {
        tone: "ok",
        badge: <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Ok</Badge>,
        icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
        message: "Estoque saudável",
      };
  }
}

function exportInventoryToCSV(items: InventoryRow[]) {
  const headers = [
    "Nome",
    "Tipo",
    "Quantidade",
    "Unidade",
    "Mínimo",
    "Custo Unitário",
    "Valor Total",
    "Fornecedor",
    "Categoria",
    "Status",
  ];

  const rows = items.map((item) => [
    item.name,
    getItemTypeLabel(item.item_type),
    String(item.quantity ?? 0),
    item.unit ?? "",
    String(item.min_quantity ?? 0),
    item.cost_per_unit ? Number(item.cost_per_unit).toFixed(2) : "",
    item.total_cost ? Number(item.total_cost).toFixed(2) : "",
    item.supplier ?? "",
    item.category ?? "",
    item.status ?? "",
  ]);

  const csv = [headers, ...rows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `estoque_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`);
  link.style.visibility = "hidden";
  link.style.position = "absolute";
  link.style.left = "-9999px";
  
  document.body.appendChild(link);
  link.click();
  
  // Remover o elemento de forma segura após um pequeno delay
  setTimeout(() => {
    try {
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
    } catch (e) {
      // Ignorar erro se o elemento já foi removido
      console.warn("Erro ao remover link de download:", e);
    }
    URL.revokeObjectURL(url);
  }, 100);
}

export default function Estoque() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<InventoryItemType | "all">("all");
  const [isAlertsDialogOpen, setIsAlertsDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [alertForm, setAlertForm] = useState<AlertFormState>(ALERT_DEFAULTS);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const [newItemState, setNewItemState] = useState<NewItemState>({
    name: "",
    quantity: "0",
    unit: "unidades",
    minQuantity: "0",
    itemType: "materia_prima",
    category: "",
    supplier: "",
    costPerUnit: "",
    notes: "",
    lengthMeters: "",
    color: "",
  });

  const [editForm, setEditForm] = useState<EditItemState>({
    name: "",
    quantity: "",
    unit: "",
    minQuantity: "",
    itemType: "materia_prima",
    category: "",
    supplier: "",
    costPerUnit: "",
    notes: "",
    lengthMeters: "",
    color: "",
  });

  const {
    data: alertPreferencesData,
    isLoading: isLoadingAlertPreferences,
    isFetching: isFetchingAlertPreferences,
  } = useQuery({
    queryKey: ["inventoryAlertPreferences"],
    queryFn: getInventoryAlertPreferences,
    enabled: isAlertsDialogOpen,
  });

  const {
    data: alertLogs = [],
    isLoading: isLoadingAlertLogs,
    refetch: refetchAlertLogs,
  } = useQuery({
    queryKey: ["inventoryAlertLogs"],
    queryFn: () => listInventoryAlertLogs(40),
    enabled: isAlertsDialogOpen,
  });

  useEffect(() => {
    if (!isAlertsDialogOpen) {
      return;
    }
    if (alertPreferencesData) {
      setAlertForm({
        email: alertPreferencesData.email ?? "",
        whatsapp: alertPreferencesData.whatsapp ?? "",
        send_email: alertPreferencesData.send_email,
        send_whatsapp: alertPreferencesData.send_whatsapp,
        notify_low: alertPreferencesData.notify_low,
        notify_critical: alertPreferencesData.notify_critical,
        frequency: alertPreferencesData.frequency,
      });
    } else {
      setAlertForm(ALERT_DEFAULTS);
    }
  }, [alertPreferencesData, isAlertsDialogOpen]);

  const saveAlertsMutation = useMutation({
    mutationFn: upsertInventoryAlertPreferences,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Preferências de alertas salvas!");
        queryClient.invalidateQueries({ queryKey: ["inventoryAlertPreferences"] });
      } else {
        toast.error(result.error || "Não foi possível salvar as preferências");
      }
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Erro ao salvar preferências");
    },
  });

  const triggerAlertsMutation = useMutation({
    mutationFn: triggerInventoryAlertsJob,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message ?? "Alertas executados com sucesso");
        refetchAlertLogs();
      } else {
        toast.error(result.message ?? "Não foi possível executar os alertas");
      }
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Erro ao executar alertas");
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  // Normalizar texto para busca (remove acentos, espaços extras, caixa)
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      // Se não há termo de busca, apenas filtrar por tipo
      return items.filter((item) => typeFilter === "all" || item.item_type === typeFilter);
    }

    const search = normalizeSearch(searchTerm);
    if (!search) {
      return items.filter((item) => typeFilter === "all" || item.item_type === typeFilter);
    }

    const searchWords = search.split(" ");

    return items.filter((item) => {
      const matchesType = typeFilter === "all" || item.item_type === typeFilter;
      
      if (!matchesType) return false;

      // Buscar em múltiplos campos: nome, fornecedor, categoria
      const searchableText = [
        item.name || "",
        item.supplier || "",
        item.category || "",
      ]
        .join(" ")
        .toString();

      const normalizedText = normalizeSearch(searchableText);

      // Cada palavra digitada deve existir em alguma parte do texto
      const matchesSearch = searchWords.every((word) => normalizedText.includes(word));

      return matchesSearch;
    });
  }, [items, typeFilter, searchTerm]);

  const summary = useMemo(() => {
    const totalItems = filteredItems.length;
    const totalQuantity = filteredItems.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);
    const totalValue = filteredItems.reduce((acc, item) => acc + Number(item.total_cost ?? (item.cost_per_unit ?? 0) * (item.quantity ?? 0)), 0);
    const criticalCount = filteredItems.filter((item) => item.status === "critical").length;
    const lowCount = filteredItems.filter((item) => item.status === "low").length;

    const byType = filteredItems.reduce<Record<InventoryItemType, { count: number; value: number }>>(
      (acc, item) => {
        const current = acc[item.item_type] ?? { count: 0, value: 0 };
        current.count += 1;
        current.value += Number(item.total_cost ?? (item.cost_per_unit ?? 0) * (item.quantity ?? 0));
        acc[item.item_type] = current;
        return acc;
      },
      {
        materia_prima: { count: 0, value: 0 },
        tecido: { count: 0, value: 0 },
        produto_acabado: { count: 0, value: 0 },
      }
    );

    return { totalItems, totalQuantity, totalValue, criticalCount, lowCount, byType };
  }, [filteredItems]);

  const resetNewItemState = () =>
    setNewItemState({
      name: "",
      quantity: "0",
      unit: "unidades",
      minQuantity: "0",
      itemType: "materia_prima",
      category: "",
      supplier: "",
      costPerUnit: "",
      notes: "",
      lengthMeters: "",
      color: "",
    });

  const handleCreateItem = async () => {
    const numericQuantity = parseFloat(newItemState.quantity.replace(",", ".")) || 0;
    const numericMin = parseFloat(newItemState.minQuantity.replace(",", ".")) || 0;
    const numericCost = newItemState.costPerUnit ? parseFloat(newItemState.costPerUnit.replace(",", ".")) : null;
    const numericLength = newItemState.lengthMeters ? parseFloat(newItemState.lengthMeters.replace(",", ".")) : null;

    const validation = validateForm(
      {
        name: newItemState.name,
        quantity: numericQuantity,
        min: numericMin,
        cost: numericCost ?? 0,
      },
      {
        name: validateName,
        quantity: validateQuantity,
        min: (value) =>
          value >= 0 ? { isValid: true, errors: [] } : { isValid: false, errors: ["Quantidade mínima não pode ser negativa"] },
        cost: validateMoney,
      }
    );

    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (newItemState.itemType === "tecido") {
      if (numericLength && numericLength > 0) metadata.length_meters = numericLength;
      if (newItemState.color) metadata.color = newItemState.color;
    }
    if (newItemState.notes) metadata.notes = newItemState.notes;

    const { data: userEmpresa, error: empresaError } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (empresaError || !userEmpresa?.empresa_id) {
      toast.error("Não foi possível identificar a empresa do usuário");
      return;
    }
    
    try {
      const result = await performanceMonitor.measure(
        "createInventoryItem",
        async () => {
          const payload = {
            empresa_id: userEmpresa.empresa_id,
            name: newItemState.name.trim(),
            unit:
              newItemState.unit.trim() ||
              ITEM_TYPE_OPTIONS.find((i) => i.value === newItemState.itemType)?.defaultUnit ||
              "unidades",
            quantity: numericQuantity,
            min_quantity: numericMin,
            status: numericQuantity <= 0 ? "critical" : numericQuantity < numericMin ? "low" : "ok",
            item_type: newItemState.itemType,
            category: newItemState.category?.trim() || null,
            supplier: newItemState.supplier?.trim() || null,
            cost_per_unit: numericCost,
            total_cost: numericCost !== null ? numericCost * numericQuantity : null,
            metadata,
          };

          const { error } = await supabase.from("inventory_items").insert(payload);
          if (error) throw error;
          return { success: true };
        },
        "Estoque"
      );

      if (result?.success) {
        toast.success("Item adicionado com sucesso!");
        logger.userAction("inventory_item_created", "ESTOQUE", {
          name: newItemState.name,
          type: newItemState.itemType,
          quantity: numericQuantity,
        });
        resetNewItemState();
        setNewItemModalOpen(false);
        invalidateRelated("inventory_items");
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      } else {
        toast.error("Não foi possível salvar o item. Tente novamente.");
      }
    } catch (error: unknown) {
      console.error("Erro ao criar item de estoque:", error);
      const message = error instanceof Error ? error.message : "Erro inesperado ao salvar item";
      toast.error(message);
    }
  };

  const handleEditItem = (item: InventoryRow) => {
    setEditingItem(item);
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    setEditForm({
      id: item.id,
      name: item.name,
      quantity: String(item.quantity ?? 0),
      unit: item.unit ?? "",
      minQuantity: String(item.min_quantity ?? 0),
      itemType: item.item_type,
      category: item.category ?? "",
      supplier: item.supplier ?? "",
      costPerUnit: item.cost_per_unit ? String(item.cost_per_unit) : "",
      notes: typeof metadata?.notes === "string" ? metadata.notes : "",
      lengthMeters: typeof metadata?.length_meters === "number" ? String(metadata.length_meters) : "",
      color: typeof metadata?.color === "string" ? metadata.color : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editForm.id) {
      toast.error("Item inválido para edição");
      return;
    }
    
    const numericQuantity = parseFloat(editForm.quantity.replace(",", ".")) || 0;
    const numericMin = parseFloat(editForm.minQuantity.replace(",", ".")) || 0;
    const numericCost = editForm.costPerUnit ? parseFloat(editForm.costPerUnit.replace(",", ".")) : null;
    const numericLength = editForm.lengthMeters ? parseFloat(editForm.lengthMeters.replace(",", ".")) : null;

    const metadata: Record<string, unknown> = {};
    if (editForm.itemType === "tecido") {
      if (numericLength && numericLength > 0) metadata.length_meters = numericLength;
      if (editForm.color) metadata.color = editForm.color;
    }
    if (editForm.notes) metadata.notes = editForm.notes;

    const result = await updateInventoryItem(editForm.id, {
        name: editForm.name,
      quantity: numericQuantity,
        unit: editForm.unit,
      min_quantity: numericMin,
      item_type: editForm.itemType,
      category: editForm.category || null,
      supplier: editForm.supplier || null,
      cost_per_unit: numericCost,
      metadata,
      });
      
      if (result.ok) {
      toast.success("Item atualizado com sucesso");
        setIsEditDialogOpen(false);
        setEditingItem(null);
      invalidateRelated("inventory_items");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      } else {
        toast.error(result.error || "Erro ao atualizar item");
      }
  };

  const handleDeleteItem = async (item: InventoryRow) => {
    if (!item.id) {
      toast.error("Item inválido");
          return;
        }
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"?`)) return;

    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      toast.error("Erro ao excluir item");
          return;
        }

    toast.success("Item excluído com sucesso");
    invalidateRelated("inventory_items");
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  // Funções para seleção múltipla
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    setSelectedItems(filteredItems.map(item => item.id));
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um item para excluir");
      return;
    }
    
    const confirmMessage = `Tem certeza que deseja excluir ${selectedItems.length} item(ns) de estoque?\n\nEsta ação não pode ser desfeita!`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const itemId of selectedItems) {
      try {
        const { error } = await supabase.from("inventory_items").delete().eq("id", itemId);
        if (error) {
          errorCount++;
          logger.error(`Erro ao excluir item ${itemId}:`, error);
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        logger.error(`Erro ao excluir item ${itemId}:`, error);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} item(ns) excluído(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} item(ns) não puderam ser excluídos`);
    }
    
    setSelectedItems([]);
    setIsSelecting(false);
    invalidateRelated("inventory_items");
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/70 sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Estoque</h1>
              <p className="text-sm text-muted-foreground">Controle centralizado de matéria-prima, tecidos e produtos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ajuda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajuda rápida — Estoque</DialogTitle>
                  <DialogDescription>
                    O Estoque é onde você controla matérias-primas, tecidos e produtos acabados. Depois, no Catálogo, você vincula os produtos aos itens do estoque para medir consumo.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 text-sm">
                  <div className="space-y-2">
                    <p className="font-semibold">1) Cadastre seus itens principais</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Crie itens como: “Tecido Algodão”, “Linha preta”, “Zíper 20cm”, “Botão 18mm”.</li>
                      <li>Escolha bem a <strong>unidade</strong> (metros, unidades, kg). Isso melhora a leitura e evita erro no consumo.</li>
                      <li>Defina <strong>mínimo</strong> para o sistema te avisar antes de faltar.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold">2) Importar estoque (se você já tem planilha)</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Use o botão de importação aqui no Estoque para subir seus itens em lote.</li>
                      <li>Depois, no Catálogo, você pode importar produtos já com “Item Estoque” e “Qtd/Un” para vincular automaticamente.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold">3) Alertas automáticos</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Ative “Alertas” para receber por e-mail quando um item ficar baixo/crítico.</li>
                      <li>Se estiver testando, use “Executar agora”.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-muted/10 p-4 text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Dica prática</p>
                    <p>
                      Padronize nomes e unidades. Ex: sempre “metros” para tecido e “unidades” para aviamentos. Isso deixa a importação e a vinculação muito mais “perfeitas”.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {isSelecting && selectedItems.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir {selectedItems.length}
              </Button>
            )}
            {isSelecting && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsSelecting(false);
                  setSelectedItems([]);
                }}
              >
                Cancelar
              </Button>
            )}
            {!isSelecting && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSelecting(true)}
              >
                Selecionar
              </Button>
            )}
            <Dialog
              open={isAlertsDialogOpen}
              onOpenChange={(open) => {
                setIsAlertsDialogOpen(open);
                if (!open) {
                  setAlertForm(ALERT_DEFAULTS);
                }
              }}
            >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BellRing className="mr-2 h-4 w-4" />
                  Alertas
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                <div className="flex min-h-full flex-col">
                  <DialogHeader className="sticky top-0 z-10 bg-card px-6 pt-6 pb-4">
                    <DialogTitle>Alertas automáticos de estoque</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Receba por e-mail os itens que atingirem níveis baixo ou crítico.
                    </p>
              </DialogHeader>
                  <div className="flex-1 px-6">
                    <div className="space-y-6 pb-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Enviar por e-mail</p>
                              <p className="text-sm text-muted-foreground">
                                Um resumo com o estoque baixo ou crítico será enviado automaticamente.
                              </p>
                </div>
                            <Switch
                              checked={alertForm.send_email}
                              onCheckedChange={(checked) => setAlertForm((prev) => ({ ...prev, send_email: checked }))}
                              disabled={isLoadingAlertPreferences || saveAlertsMutation.isPending}
                            />
                </div>
                          <div className="space-y-2">
                            <Label htmlFor="alert-email">E-mail principal</Label>
                            <Input
                              id="alert-email"
                              type="email"
                              placeholder="contato@empresa.com.br"
                              value={alertForm.email}
                              onChange={(event) => setAlertForm((prev) => ({ ...prev, email: event.target.value }))}
                              disabled={!alertForm.send_email}
                            />
                            <p className="text-xs text-muted-foreground">
                              Você receberá um único resumo com todos os itens em atenção.
                            </p>
                            {alertForm.send_email && alertForm.email && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                                <strong>ℹ️ Importante:</strong> Os alertas são executados automaticamente uma vez por dia. 
                                Você também pode clicar em "Executar agora" abaixo para testar imediatamente.
                              </div>
                            )}
                </div>
                </div>
                        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">WhatsApp (em breve)</p>
                              <p className="text-sm text-muted-foreground">Alertas instantâneos pelo WhatsApp chegam na próxima versão.</p>
              </div>
                            <Switch checked={false} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="alert-whatsapp">Número com DDD</Label>
                            <Input
                              id="alert-whatsapp"
                              placeholder="(11) 99999-9999"
                              value={alertForm.whatsapp}
                              onChange={(event) => setAlertForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Alertar estoque baixo</p>
                              <p className="text-sm text-muted-foreground">
                                Envia quando a quantidade ficar abaixo do mínimo que você definiu.
                              </p>
                            </div>
                            <Switch
                              checked={alertForm.notify_low}
                              onCheckedChange={(checked) => setAlertForm((prev) => ({ ...prev, notify_low: checked }))}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Alertar estoque crítico</p>
                              <p className="text-sm text-muted-foreground">
                                Envia quando o item zerar ou ficar negativo.
                              </p>
                            </div>
                            <Switch
                              checked={alertForm.notify_critical}
                              onCheckedChange={(checked) =>
                                setAlertForm((prev) => ({ ...prev, notify_critical: checked }))
                              }
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Frequência</Label>
                            <Select
                              value={alertForm.frequency}
                              onValueChange={(value: "daily" | "weekly") =>
                                setAlertForm((prev) => ({ ...prev, frequency: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Diariamente às 08h</SelectItem>
                                <SelectItem value="weekly">Semanalmente (segunda-feira)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              O horário considera o fuso de Brasília. Ajustes finos estarão disponíveis em breve.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Eventos recentes
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Últimos alertas disparados automaticamente.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetchAlertLogs()}
                            disabled={isLoadingAlertLogs}
                          >
                            Atualizar
                          </Button>
                        </div>
                        {isLoadingAlertLogs ? (
                          <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                            Carregando eventos...
                          </div>
                        ) : alertLogs.length === 0 ? (
                          <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                            Nenhum alerta enviado até agora.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {alertLogs.map((log) => {
                              const payload = (log.payload ?? {}) as Record<string, unknown>;
                              const quantity = payload.quantity ?? payload.quantidade ?? "?";
                              const minQuantity = payload.min_quantity ?? payload.min ?? "?";
                              return (
                                <div key={log.id} className="rounded-lg border border-border/60 bg-background p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={
                                          log.status === "critical"
                                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                                            : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                        }
                                      >
                                        {log.status === "critical" ? "Estoque crítico" : "Estoque baixo"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(log.sent_at).toLocaleString("pt-BR")}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-sm font-semibold text-foreground">
                                    {(payload.name as string) ?? "Item sem nome"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Saldo atual: {quantity} • Mínimo: {minQuantity}
                                  </p>
                                  {payload.supplier && (
                                    <p className="text-xs text-muted-foreground/80">
                                      Fornecedor: {payload.supplier as string}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="sticky bottom-0 z-10 border-t border-border/70 bg-card px-6 py-4">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setIsAlertsDialogOpen(false);
                          setAlertForm(ALERT_DEFAULTS);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Fechar
                      </Button>
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            await triggerAlertsMutation.mutateAsync();
                          }}
                          disabled={
                            triggerAlertsMutation.isPending ||
                            isLoadingAlertPreferences ||
                            isFetchingAlertPreferences
                          }
                          className="w-full sm:w-auto"
                        >
                          {triggerAlertsMutation.isPending ? (
                            "Executando..."
                          ) : (
                            <>
                              <History className="mr-2 h-4 w-4" />
                              Executar agora
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={async () => {
                            const payload: InventoryAlertPreferences = {
                              ...(alertPreferencesData ?? {}),
                              ...alertForm,
                            };
                            await saveAlertsMutation.mutateAsync(payload);
                          }}
                          disabled={
                            saveAlertsMutation.isPending ||
                            triggerAlertsMutation.isPending ||
                            isLoadingAlertPreferences ||
                            isFetchingAlertPreferences ||
                            (!alertForm.notify_low && !alertForm.notify_critical)
                          }
                          className="w-full sm:w-auto"
                        >
                          {saveAlertsMutation.isPending ? "Salvando..." : "Salvar alertas"}
                </Button>
                      </div>
                    </div>
              </DialogFooter>
                </div>
            </DialogContent>
          </Dialog>
            <ImportInventory onImportComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["inventory"] });
            }} />
            <Button variant="outline" size="sm" onClick={() => exportInventoryToCSV(filteredItems)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Dialog open={newItemModalOpen} onOpenChange={(open) => (open ? setNewItemModalOpen(true) : setNewItemModalOpen(false))}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setNewItemModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sticky top-0 z-10 bg-card pb-4">
                  <DialogTitle>Novo item de estoque</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-2">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={newItemState.name}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Ex: Tecido algodão azul"
                      />
        </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input
                        value={newItemState.category}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="Tecidos, Aviamentos..."
                      />
                </div>
              </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={newItemState.itemType}
                        onValueChange={(value: InventoryItemType) =>
                          setNewItemState((prev) => ({
                            ...prev,
                            itemType: value,
                            unit: value === "tecido" ? "metros" : prev.unit,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                    <div className="space-y-2">
                      <Label>Fornecedor</Label>
                      <Input
                        value={newItemState.supplier}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, supplier: event.target.value }))}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItemState.quantity}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, quantity: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade *</Label>
                      <Input
                        value={newItemState.unit}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, unit: event.target.value }))}
                        placeholder="un, kg, m..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mínimo</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItemState.minQuantity}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, minQuantity: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Custo unitário</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItemState.costPerUnit}
                        onChange={(event) => setNewItemState((prev) => ({ ...prev, costPerUnit: event.target.value }))}
                        placeholder="Ex: 45,90"
                      />
                    </div>
                    {newItemState.itemType === "tecido" && (
                      <div className="space-y-2">
                        <Label>Metragem total (m)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItemState.lengthMeters}
                          onChange={(event) => setNewItemState((prev) => ({ ...prev, lengthMeters: event.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {newItemState.itemType === "tecido" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <Input
                          value={newItemState.color}
                          onChange={(event) => setNewItemState((prev) => ({ ...prev, color: event.target.value }))}
                        />
                    </div>
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={newItemState.notes}
                      onChange={(event) => setNewItemState((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Informações adicionais sobre o item"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="sticky bottom-0 z-10 bg-card pt-4">
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => setNewItemModalOpen(false)} className="w-full sm:w-auto">
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateItem} className="w-full sm:w-auto">
                      Salvar item
                    </Button>
                  </div>
                </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Valor total</CardDescription>
              <CardTitle className="text-2xl">
                {summary.totalValue > 0 ? formatCurrency({ value: summary.totalValue, currency: "BRL" }) : "R$ 0,00"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Somatório considerando custo unitário informado</p>
                </CardContent>
              </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Itens cadastrados</CardDescription>
              <CardTitle className="text-2xl">{summary.totalItems}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{summary.totalQuantity.toFixed(2)} unidades no estoque</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Estoque baixo</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{summary.lowCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Itens abaixo do nível mínimo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Estoque crítico</CardDescription>
              <CardTitle className="text-2xl text-destructive">{summary.criticalCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Itens zerados ou negativos</p>
                </CardContent>
              </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {ITEM_TYPE_OPTIONS.map((option) => {
            const info = summary.byType[option.value];
            return (
              <Card key={option.value} className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{option.label}</CardTitle>
                    <Badge variant="outline" className="bg-muted/30">
                      {info.count} itens
                    </Badge>
          </div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Valor estimado{" "}
                    <span className="font-semibold text-foreground">
                      {info.value > 0 ? formatCurrency({ value: info.value, currency: "BRL" }) : "R$ 0,00"}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                className="max-w-sm"
                placeholder="Buscar por nome ou fornecedor..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            {!isSelecting && (
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as InventoryItemType | "all")}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isSelecting && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectedItems.length === filteredItems.length ? deselectAll : selectAll}
                >
                  {selectedItems.length === filteredItems.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <PackageSearch className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando estoque...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Nenhum item encontrado</p>
                <p className="text-sm text-muted-foreground">Cadastre um item ou ajuste os filtros de busca</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const statusInfo = computeStatusInfo(item.status);
                const metadata = (item.metadata ?? {}) as Record<string, unknown>;
                const totalValue = item.total_cost ?? (item.cost_per_unit ?? 0) * (item.quantity ?? 0);
            
            return (
              <Card
                    key={item.id}
                    className="border border-border/70 transition-all hover:border-primary/60 hover:shadow-md"
              >
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isSelecting && (
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                                className="mt-1"
                              />
                            )}
                            <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                            <Badge variant="secondary">{getItemTypeLabel(item.item_type)}</Badge>
                            {statusInfo.badge}
                          </div>
                        <p className="text-sm text-muted-foreground">
                            Unidade mínima: <span className="font-medium text-foreground">{item.min_quantity ?? 0}</span>{" "}
                            {item.unit}
                        </p>
                          {item.supplier && (
                            <p className="text-sm text-muted-foreground">
                              Fornecedor: <span className="font-medium text-foreground">{item.supplier}</span>
                            </p>
                          )}
                          {item.category && (
                        <p className="text-sm text-muted-foreground">
                              Categoria: <span className="font-medium text-foreground">{item.category}</span>
                        </p>
                          )}
                          {metadata?.notes && (
                            <p className="text-xs text-muted-foreground/90">Obs.: {String(metadata.notes)}</p>
                          )}
                    </div>

                        <div className="flex items-center gap-6">
                      <div className="text-right">
                            <p className="text-2xl font-semibold text-foreground">
                              {Number(item.quantity ?? 0).toFixed(2)}
                            </p>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                            {item.cost_per_unit && (
                              <p className="text-xs text-muted-foreground/90">
                                {formatCurrency({ value: item.cost_per_unit, currency: "BRL" })}/un
                              </p>
                            )}
                            {totalValue > 0 && (
                              <p className="text-xs font-medium text-foreground">
                                Total: {formatCurrency({ value: totalValue, currency: "BRL" })}
                              </p>
                            )}
                      </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4" />
                        </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item)}>
                              <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                      <Separator />

                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                            {statusInfo.icon}
                            {statusInfo.message}
                          </p>
                        </div>
                        {item.item_type === "tecido" && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Metragem disponível</p>
                            <p className="text-sm font-medium text-foreground">
                              {metadata?.length_meters ? `${metadata.length_meters} m` : "-"}
                            </p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Atualizado</p>
                          <p className="text-sm font-medium text-foreground">
                            {item.updated_at ? new Date(item.updated_at).toLocaleString("pt-BR") : "-"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Código interno</p>
                          <p className="text-sm font-mono text-muted-foreground/80">{item.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
          )}
        </section>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-card pb-4">
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
                <Label>Nome *</Label>
              <Input
                value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={editForm.category}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={editForm.itemType}
                  onValueChange={(value: InventoryItemType) =>
                    setEditForm((prev) => ({
                      ...prev,
                      itemType: value,
                      unit: value === "tecido" ? "metros" : prev.unit,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  value={editForm.supplier}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, supplier: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.quantity}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Input
                  value={editForm.unit}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, unit: event.target.value }))}
                />
            </div>
            <div className="space-y-2">
                <Label>Mínimo</Label>
              <Input
                type="number"
                  min="0"
                  step="0.01"
                value={editForm.minQuantity}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, minQuantity: event.target.value }))}
              />
            </div>
          </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Custo unitário</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.costPerUnit}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, costPerUnit: event.target.value }))}
                />
              </div>
              {editForm.itemType === "tecido" && (
                <div className="space-y-2">
                  <Label>Metragem total (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.lengthMeters}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lengthMeters: event.target.value }))}
                  />
                </div>
              )}
            </div>

            {editForm.itemType === "tecido" && (
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  value={editForm.color}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, color: event.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={editForm.notes}
                onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 z-10 bg-card pt-4">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
              <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                Salvar alterações
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
