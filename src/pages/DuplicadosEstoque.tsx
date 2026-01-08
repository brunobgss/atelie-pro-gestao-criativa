import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, GitMerge, RefreshCw } from "lucide-react";
import { listInventory, updateInventoryItem, type InventoryRow } from "@/integrations/supabase/inventory";
import { criarMovimentacao } from "@/integrations/supabase/movimentacoes-estoque";
import { getProducts, updateProduct } from "@/integrations/supabase/products";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEmpresaId } from "@/integrations/supabase/auth-utils";

type DuplicateGroup = {
  key: string;
  name: string;
  items: InventoryRow[];
  totalQuantity: number;
};

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLinks(row: any): { items: string[]; quantities: number[] } {
  let items: string[] = [];
  let quantities: number[] = [];

  if (row?.inventory_items) {
    if (typeof row.inventory_items === "string") {
      try {
        items = JSON.parse(row.inventory_items);
      } catch {
        items = [];
      }
    } else if (Array.isArray(row.inventory_items)) {
      items = row.inventory_items;
    }
  }

  if (row?.inventory_quantities) {
    if (typeof row.inventory_quantities === "string") {
      try {
        quantities = JSON.parse(row.inventory_quantities);
      } catch {
        quantities = [];
      }
    } else if (Array.isArray(row.inventory_quantities)) {
      quantities = row.inventory_quantities;
    }
  }

  const min = Math.min(items.length, quantities.length);
  return {
    items: items.slice(0, min).filter(Boolean),
    quantities: quantities.slice(0, min).map((n: any) => Number(n) || 0),
  };
}

function replaceAndMergeLinks(
  existing: { items: string[]; quantities: number[] },
  primaryId: string,
  duplicateIds: string[]
) {
  const items = [...existing.items];
  const quantities = [...existing.quantities];

  // Reescrever cada duplicateId -> primaryId
  for (const dupId of duplicateIds) {
    // enquanto existirem ocorrências do dupId
    while (true) {
      const idx = items.indexOf(dupId);
      if (idx < 0) break;
      const q = quantities[idx] ?? 0;
      items.splice(idx, 1);
      quantities.splice(idx, 1);

      const primaryIdx = items.indexOf(primaryId);
      if (primaryIdx >= 0) {
        quantities[primaryIdx] = (quantities[primaryIdx] ?? 0) + q;
      } else {
        items.push(primaryId);
        quantities.push(q);
      }
    }
  }

  const min = Math.min(items.length, quantities.length);
  return { items: items.slice(0, min), quantities: quantities.slice(0, min) };
}

export default function DuplicadosEstoque() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  const groups = useMemo(() => {
    const byKey = new Map<string, InventoryRow[]>();
    for (const item of inventory) {
      const key = normalizeKey(item.name || "");
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(item);
      byKey.set(key, list);
    }

    const duplicates: DuplicateGroup[] = [];
    for (const [key, items] of byKey.entries()) {
      if (items.length <= 1) continue;
      const name = items[0]?.name ?? key;
      const totalQuantity = items.reduce((acc, it) => acc + Number(it.quantity ?? 0), 0);
      duplicates.push({ key, name, items, totalQuantity });
    }

    duplicates.sort((a, b) => b.items.length - a.items.length);
    return duplicates;
  }, [inventory]);

  const openMergeDialog = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setPrimaryId(group.items[0]?.id ?? "");
    setSelectedDuplicates(group.items.slice(1).map((i) => i.id));
    setConfirmMerge(false);
    setOpen(true);
  };

  const toggleDuplicate = (id: string) => {
    setSelectedDuplicates((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleMerge = async () => {
    if (!selectedGroup) return;
    if (!primaryId) {
      toast.error("Selecione o item principal");
      return;
    }
    const duplicateIds = selectedDuplicates.filter((id) => id !== primaryId);
    if (duplicateIds.length === 0) {
      toast.error("Selecione ao menos 1 item duplicado para mesclar");
      return;
    }
    if (!confirmMerge) {
      toast.error("Confirme a mesclagem para continuar");
      return;
    }

    setIsMerging(true);
    try {
      const primary = selectedGroup.items.find((i) => i.id === primaryId);
      if (!primary) {
        toast.error("Item principal inválido");
        return;
      }

      // 1) Atualizar vínculos dos produtos do catálogo
      const products = await getProducts();
      let updatedProducts = 0;

      for (const p of products) {
        const links = parseLinks(p);
        const hasAny = duplicateIds.some((d) => links.items.includes(d));
        if (!hasAny) continue;

        const next = replaceAndMergeLinks(links, primaryId, duplicateIds);
        const res = await updateProduct(p.id, {
          inventory_items: next.items,
          inventory_quantities: next.quantities,
        });
        if (res.ok) updatedProducts++;
      }

      // 2) Atualizar vínculos de serviços (direto via Supabase)
      const empresaId = await getCurrentEmpresaId();
      let updatedServices = 0;
      if (empresaId) {
        const { data: servicos, error } = await supabase
          .from("atelie_servicos" as any)
          .select("id, nome, inventory_items, inventory_quantities")
          .eq("empresa_id", empresaId);

        if (!error && Array.isArray(servicos)) {
          for (const s of servicos) {
            const links = parseLinks(s);
            const hasAny = duplicateIds.some((d) => links.items.includes(d));
            if (!hasAny) continue;
            const next = replaceAndMergeLinks(links, primaryId, duplicateIds);
            const { error: updErr } = await supabase
              .from("atelie_servicos" as any)
              .update({
                inventory_items: next.items,
                inventory_quantities: next.quantities,
                updated_at: new Date().toISOString(),
              })
              .eq("id", s.id)
              .eq("empresa_id", empresaId);
            if (!updErr) updatedServices++;
          }
        }
      }

      // 3) Consolidar saldo no item principal e zerar duplicados via movimentações (auditoria)
      const dupItems = selectedGroup.items.filter((i) => duplicateIds.includes(i.id));
      const sumDelta = dupItems.reduce((acc, it) => acc + Number(it.quantity ?? 0), 0);

      // Ajustar principal: soma do saldo de duplicados (pode ser negativo)
      if (sumDelta !== 0) {
        await criarMovimentacao({
          inventory_item_id: primaryId,
          tipo_movimentacao: "ajuste",
          ajuste_sign: sumDelta >= 0 ? "incremento" : "decremento",
          quantidade: Math.abs(sumDelta),
          motivo: `Mesclagem de duplicados (consolidação de saldo)`,
          origem: "merge_duplicados",
          origem_id: null,
        } as any);
      }

      // Zerar duplicados e marcar no nome/metadata para não causarem ambiguidade
      for (const dup of dupItems) {
        const current = Number(dup.quantity ?? 0);
        const toZeroDelta = 0 - current;
        if (toZeroDelta !== 0) {
          await criarMovimentacao({
            inventory_item_id: dup.id,
            tipo_movimentacao: "ajuste",
            ajuste_sign: toZeroDelta >= 0 ? "incremento" : "decremento",
            quantidade: Math.abs(toZeroDelta),
            motivo: `Mesclagem: item consolidado em ${primary.name}`,
            origem: "merge_duplicados",
            origem_id: null,
          } as any);
        }

        const renamed = `INATIVO - ${dup.name} (Mesclado)`;
        const metadata = { ...(dup.metadata ?? {}), merged_into: primaryId, merged_at: new Date().toISOString() };
        await updateInventoryItem(dup.id, {
          name: renamed,
          metadata,
        });
      }

      toast.success(
        `Mesclagem concluída! Atualizados: ${updatedProducts} produto(s) e ${updatedServices} serviço(s).`
      );

      setOpen(false);
      setSelectedGroup(null);
      setPrimaryId("");
      setSelectedDuplicates([]);
      setConfirmMerge(false);

      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_estoque"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao mesclar duplicados");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/70 sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Duplicados do Estoque</h1>
              <p className="text-sm text-muted-foreground">
                Detecte itens com nomes equivalentes e mescle para eliminar ambiguidade.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Por que isso importa?
            </CardTitle>
            <CardDescription>
              Duplicados geram ambiguidade na importação e podem causar baixa no item errado. Mesclar deixa o estoque
              mais seguro e previsível.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A mesclagem consolida o saldo no item principal, move vínculos de produtos/serviços e marca os duplicados
            como inativos para não voltarem a aparecer como “iguais”.
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Carregando...</CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum duplicado detectado. Seu estoque está bem padronizado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <Card key={g.key} className="border border-border/70">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <CardDescription>
                        {g.items.length} itens • saldo total {g.totalQuantity.toFixed(2)}
                      </CardDescription>
                    </div>
                    <Button onClick={() => openMergeDialog(g)} className="gap-2">
                      <GitMerge className="h-4 w-4" />
                      Mesclar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {g.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{it.id}</div>
                      </div>
                      <div className="text-right text-muted-foreground">
                        {Number(it.quantity ?? 0).toFixed(2)} {it.unit}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mesclar duplicados</DialogTitle>
              <DialogDescription>
                Escolha o item principal, selecione os duplicados e confirme. Isso atualiza vínculos de catálogo/serviços
                e consolida o saldo no item principal.
              </DialogDescription>
            </DialogHeader>

            {selectedGroup && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Item principal</div>
                  <Select value={primaryId} onValueChange={setPrimaryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedGroup.items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.name} ({Number(it.quantity ?? 0).toFixed(2)} {it.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Itens duplicados a mesclar</div>
                  <div className="space-y-2">
                    {selectedGroup.items
                      .filter((it) => it.id !== primaryId)
                      .map((it) => (
                        <div key={it.id} className="flex items-start gap-3 rounded-md border p-3">
                          <Checkbox
                            checked={selectedDuplicates.includes(it.id)}
                            onCheckedChange={() => toggleDuplicate(it.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{it.id}</div>
                            <div className="text-xs text-muted-foreground">
                              Saldo: {Number(it.quantity ?? 0).toFixed(2)} {it.unit}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <Checkbox checked={confirmMerge} onCheckedChange={(v) => setConfirmMerge(Boolean(v))} />
                  <div className="text-sm text-amber-800">
                    <div className="font-semibold">Confirmo a mesclagem</div>
                    <div className="text-xs">
                      Os duplicados serão marcados como inativos e seus saldos serão consolidados no item principal.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isMerging}>
                Cancelar
              </Button>
              <Button onClick={handleMerge} disabled={isMerging || !confirmMerge}>
                {isMerging ? "Mesclando..." : "Mesclar agora"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

