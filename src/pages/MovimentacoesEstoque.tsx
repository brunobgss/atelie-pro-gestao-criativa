import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  listarMovimentacoes,
  criarMovimentacao,
  MovimentacaoEstoque,
  AjusteSign,
} from "@/integrations/supabase/movimentacoes-estoque";
import { listInventory, InventoryRow } from "@/integrations/supabase/inventory";
import { useSync } from "@/contexts/SyncContext";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type MovimentacaoFormValues = {
  inventory_item_id: string;
  tipo_movimentacao: MovimentacaoEstoque["tipo_movimentacao"];
  ajuste_sign: AjusteSign;
  quantidade: number;
  valor_unitario?: number;
  motivo: string;
  lote?: string;
  data_validade?: string;
};

const MOVEMENT_META = {
  entrada: { label: "Entrada", badge: "bg-emerald-500/15 text-emerald-700", icon: <TrendingUp className="h-3 w-3" /> },
  saida: { label: "Saída", badge: "bg-rose-500/15 text-rose-700", icon: <TrendingDown className="h-3 w-3" /> },
  ajuste: { label: "Ajuste", badge: "bg-blue-500/15 text-blue-700", icon: <RefreshCw className="h-3 w-3" /> },
  transferencia: { label: "Transferência", badge: "bg-purple-500/15 text-purple-700", icon: <ArrowUp className="h-3 w-3" /> },
  perda: { label: "Perda", badge: "bg-orange-500/15 text-orange-700", icon: <AlertTriangle className="h-3 w-3" /> },
  devolucao: { label: "Devolução", badge: "bg-emerald-500/15 text-emerald-700", icon: <ArrowDown className="h-3 w-3" /> },
} as const;

function exportMovimentacoesToCSV(items: MovimentacaoEstoque[], inventoryIndex: Map<string, InventoryRow>) {
  const headers = [
    "Data",
    "Tipo",
    "Item",
    "Quantidade",
    "Unidade",
    "Quantidade Anterior",
    "Quantidade Atual",
    "Valor Unitário",
    "Motivo",
    "Lote",
  ];

  const rows = items.map((mov) => {
    const item = mov.inventory_item_id ? inventoryIndex.get(mov.inventory_item_id) : null;
    const sign =
      mov.tipo_movimentacao === "saida" ||
      mov.tipo_movimentacao === "perda" ||
      (mov.tipo_movimentacao === "ajuste" && mov.ajuste_sign === "decremento")
        ? "-"
        : "+";

    return [
      mov.created_at ? format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
      MOVEMENT_META[mov.tipo_movimentacao]?.label ?? mov.tipo_movimentacao,
      item?.name ?? "-",
      `${sign}${mov.quantidade ?? 0}`,
      item?.unit ?? "",
      mov.quantidade_anterior ?? "",
      mov.quantidade_atual ?? "",
      mov.valor_unitario ?? "",
      mov.motivo ?? "",
      mov.lote ?? "",
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `movimentacoes_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function MovimentacoesEstoque() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<MovimentacaoEstoque["tipo_movimentacao"] | "todos">("todos");
  const [itemFiltro, setItemFiltro] = useState<string>("todos");

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes_estoque"],
    queryFn: () => listarMovimentacoes(),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  const inventoryIndex = useMemo(
    () => new Map<string, InventoryRow>(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems]
  );

  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter((mov) => {
      const item = mov.inventory_item_id ? inventoryIndex.get(mov.inventory_item_id) : null;
      const matchesTipo = tipoFiltro === "todos" || mov.tipo_movimentacao === tipoFiltro;
      const matchesItem = itemFiltro === "todos" || mov.inventory_item_id === itemFiltro;
      const matchesSearch =
        !searchTerm ||
        mov.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTipo && matchesItem && matchesSearch;
    });
  }, [movimentacoes, tipoFiltro, itemFiltro, searchTerm, inventoryIndex]);

  const resumo = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let perdas = 0;

    filteredMovimentacoes.forEach((mov) => {
      if (["entrada", "devolucao", "transferencia"].includes(mov.tipo_movimentacao)) {
        entradas += mov.quantidade ?? 0;
      } else if (mov.tipo_movimentacao === "saida") {
        saidas += mov.quantidade ?? 0;
      } else if (mov.tipo_movimentacao === "perda") {
        perdas += mov.quantidade ?? 0;
      } else if (mov.tipo_movimentacao === "ajuste") {
        if (mov.ajuste_sign === "decremento") saidas += mov.quantidade ?? 0;
        else entradas += mov.quantidade ?? 0;
      }
    });

    return { entradas, saidas, perdas, total: filteredMovimentacoes.length };
  }, [filteredMovimentacoes]);

  const form = useForm<MovimentacaoFormValues>({
    defaultValues: {
      inventory_item_id: "",
      tipo_movimentacao: "entrada",
      ajuste_sign: "incremento",
      quantidade: 0,
      motivo: "",
    },
  });

  const handleOpenDialog = () => {
    form.reset({
      inventory_item_id: "",
      tipo_movimentacao: "entrada",
      ajuste_sign: "incremento",
      quantidade: 0,
      motivo: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (values: MovimentacaoFormValues) => {
    if (!values.inventory_item_id) {
      toast.error("Selecione um item do estoque");
      return;
    }
    if (!values.quantidade || values.quantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }
    if (!values.motivo.trim()) {
      toast.error("Informe o motivo da movimentação");
      return;
    }

    const result = await criarMovimentacao({
      inventory_item_id: values.inventory_item_id,
      tipo_movimentacao: values.tipo_movimentacao,
      ajuste_sign: values.ajuste_sign,
      quantidade: values.quantidade,
      valor_unitario: values.valor_unitario ?? null,
      motivo: values.motivo,
      lote: values.lote,
      data_validade: values.data_validade,
    } as MovimentacaoEstoque);

    if (result.ok) {
      toast.success("Movimentação registrada");
      invalidateRelated("movimentacoes_estoque");
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_estoque"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsDialogOpen(false);
    } else {
      toast.error(result.error || "Erro ao registrar movimentação");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Movimentações de Estoque</h1>
              <p className="text-sm text-muted-foreground">Controle completo das alterações de estoque</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMovimentacoesToCSV(filteredMovimentacoes, inventoryIndex)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova movimentação
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Entradas</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">{resumo.entradas.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Saídas</CardDescription>
              <CardTitle className="text-2xl text-rose-600">{resumo.saidas.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Perdas</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{resumo.perdas.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Movimentações</CardDescription>
              <CardTitle className="text-2xl text-foreground">{resumo.total}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex max-w-md flex-1 items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por item, fornecedor ou motivo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select value={tipoFiltro} onValueChange={(value) => setTipoFiltro(value as typeof tipoFiltro)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                  <SelectItem value="ajuste">Ajustes</SelectItem>
                  <SelectItem value="perda">Perdas</SelectItem>
                  <SelectItem value="devolucao">Devoluções</SelectItem>
                  <SelectItem value="transferencia">Transferências</SelectItem>
                </SelectContent>
              </Select>
              <Select value={itemFiltro} onValueChange={(value) => setItemFiltro(value)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Item" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="todos">Todos os itens</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Carregando movimentações...</span>
            </div>
          ) : filteredMovimentacoes.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Nenhuma movimentação encontrada</p>
                <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre uma nova movimentação</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMovimentacoes.map((mov) => {
                const meta = MOVEMENT_META[mov.tipo_movimentacao] ?? MOVEMENT_META.entrada;
                const item = mov.inventory_item_id ? inventoryIndex.get(mov.inventory_item_id) : null;
                const sign =
                  mov.tipo_movimentacao === "saida" ||
                  mov.tipo_movimentacao === "perda" ||
                  (mov.tipo_movimentacao === "ajuste" && mov.ajuste_sign === "decremento")
                    ? "-"
                    : "+";

                return (
                  <Card key={mov.id} className="border border-border/60 transition hover:border-primary/40 hover:shadow-md">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${meta.badge} flex items-center gap-1`}>
                              {meta.icon}
                              {meta.label}
                            </Badge>
                            {mov.tipo_movimentacao === "ajuste" && (
                              <Badge variant="outline" className="text-xs uppercase">
                                {mov.ajuste_sign === "incremento" ? "Incremento" : "Decremento"}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-foreground">{item?.name ?? "Item do estoque"}</h3>
                          <p className="text-sm text-muted-foreground">{mov.motivo}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>
                              {mov.created_at
                                ? format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "-"}
                            </span>
                            {item?.supplier && <span>Fornecedor: {item.supplier}</span>}
                            {mov.lote && <span>Lote: {mov.lote}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xl font-semibold text-foreground">
                              {sign}
                              {Number(mov.quantidade ?? 0).toFixed(2)} {item?.unit ?? "un"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Antes: {Number(mov.quantidade_anterior ?? 0).toFixed(2)} • Depois:{" "}
                              {Number(mov.quantidade_atual ?? 0).toFixed(2)}
                            </p>
                            {mov.valor_unitario && (
                              <p className="text-xs text-muted-foreground/90">
                                {formatCurrency({ value: mov.valor_unitario, currency: "BRL" })}/un
                              </p>
                            )}
                          </div>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar movimentação</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Item do estoque *</Label>
                <Select
                  value={form.watch("inventory_item_id")}
                  onValueChange={(value) => form.setValue("inventory_item_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.quantity?.toFixed(2)} {item.unit} • {item.supplier ?? "Fornecedor não informado"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={form.watch("tipo_movimentacao")}
                  onValueChange={(value: MovimentacaoEstoque["tipo_movimentacao"]) =>
                    form.setValue("tipo_movimentacao", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.watch("tipo_movimentacao") === "ajuste" && (
              <div className="space-y-2">
                <Label>Tipo de ajuste</Label>
                <Select
                  value={form.watch("ajuste_sign")}
                  onValueChange={(value: AjusteSign) => form.setValue("ajuste_sign", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incremento">Incremento</SelectItem>
                    <SelectItem value="decremento">Decremento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.watch("quantidade") ?? 0}
                  onChange={(event) => form.setValue("quantidade", Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor unitário</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.watch("valor_unitario") ?? ""}
                  onChange={(event) =>
                    form.setValue("valor_unitario", event.target.value ? Number(event.target.value) : undefined)
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                rows={3}
                value={form.watch("motivo")}
                onChange={(event) => form.setValue("motivo", event.target.value)}
                placeholder="Ex: Compra de fornecedor, ajuste de inventário, perda por avaria..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input
                  value={form.watch("lote") ?? ""}
                  onChange={(event) => form.setValue("lote", event.target.value || undefined)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de validade</Label>
                <Input
                  type="date"
                  value={form.watch("data_validade") ?? ""}
                  onChange={(event) => form.setValue("data_validade", event.target.value || undefined)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar movimentação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

