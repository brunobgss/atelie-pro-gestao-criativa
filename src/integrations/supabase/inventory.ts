import { supabase } from "./client";

export type InventoryItemType = "materia_prima" | "tecido" | "produto_acabado";

export type InventoryRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  status: string;
  item_type: InventoryItemType;
  category?: string | null;
  supplier?: string | null;
  cost_per_unit?: number | null;
  total_cost?: number | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
  empresa_id?: string;
};

export type InventoryUpdateInput = {
  name?: string;
  quantity?: number;
  unit?: string;
  min_quantity?: number;
  item_type?: InventoryItemType;
  category?: string | null;
  supplier?: string | null;
  cost_per_unit?: number | null;
  metadata?: Record<string, unknown> | null;
};

export async function listInventory(): Promise<InventoryRow[]> {
  try {
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return [];
    }

    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, min_quantity, status, item_type, category, supplier, cost_per_unit, total_cost, metadata, updated_at, empresa_id")
      .eq("empresa_id", userEmpresa.empresa_id)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as InventoryRow[];
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    return [];
  }
}

export async function updateInventoryItem(id: string, input: InventoryUpdateInput): Promise<{ ok: boolean; data?: InventoryRow; error?: string }> {
  try {
    const normalizedId = String(id).trim();

    if (!normalizedId) {
      return { ok: false, error: "ID inválido" };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(normalizedId)) {
      return { ok: false, error: "ID não é um UUID válido" };
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = String(input.name);
    if (input.quantity !== undefined) updateData.quantity = Number(input.quantity);
    if (input.unit !== undefined) updateData.unit = String(input.unit);
    if (input.min_quantity !== undefined) updateData.min_quantity = Number(input.min_quantity);
    if (input.item_type !== undefined) updateData.item_type = input.item_type;
    if (input.category !== undefined) updateData.category = input.category ?? null;
    if (input.supplier !== undefined) updateData.supplier = input.supplier ?? null;
    if (input.cost_per_unit !== undefined) updateData.cost_per_unit = input.cost_per_unit !== null ? Number(input.cost_per_unit) : null;
    if (input.metadata !== undefined) updateData.metadata = input.metadata ?? {};
    updateData.updated_at = new Date().toISOString();

    const { data: existingItem, error: checkError } = await supabase
      .from("inventory_items")
      .select("id, quantity, min_quantity, cost_per_unit, empresa_id")
      .eq("id", normalizedId)
      .single();

    if (checkError) {
      return { ok: false, error: `Item não encontrado: ${checkError.message}` };
    }

    if (!existingItem?.empresa_id) {
      return { ok: false, error: "Item não tem empresa associada" };
    }

    const { data: userEmpresas } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    const hasAccess = userEmpresas?.some((ue) => ue.empresa_id === existingItem.empresa_id);
    if (!hasAccess) {
      return { ok: false, error: "Usuário não tem permissão para editar este item" };
    }

    const finalQuantity = input.quantity !== undefined ? Number(input.quantity) : Number(existingItem.quantity ?? 0);
    const finalMinQuantity = input.min_quantity !== undefined ? Number(input.min_quantity) : Number(existingItem.min_quantity ?? 0);
    const finalCostPerUnit = input.cost_per_unit !== undefined
      ? (input.cost_per_unit !== null ? Number(input.cost_per_unit) : null)
      : (existingItem.cost_per_unit ?? null);

    // Calcular status baseado na quantidade e mínimo
    let newStatus = "ok";
    if (finalQuantity <= 0) {
      newStatus = "critical";
    } else if (finalQuantity < finalMinQuantity) {
      newStatus = "low";
    }
    updateData.status = newStatus;

    if (finalCostPerUnit !== null) {
      updateData.total_cost = Number((finalCostPerUnit || 0) * (finalQuantity || 0));
    }

    const { data, error } = await supabase
      .from("inventory_items")
      .update(updateData)
      .eq("id", normalizedId)
      .select("id, name, quantity, unit, min_quantity, status, item_type, category, supplier, cost_per_unit, total_cost, metadata, updated_at, empresa_id");

    if (error) {
      return { ok: false, error: `Erro do banco: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: "Item não encontrado para atualização" };
    }

    return { ok: true, data: data[0] as InventoryRow };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string })?.message ?? "Erro ao atualizar item do estoque" };
  }
}

export type ProductRow = {
  id: string;
  name: string;
  type: string;
  materials: any;
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  created_at: string;
};

export async function saveProduct(productData: {
  name: string;
  type: string;
  materials: unknown;
  workHours: number;
  unitPrice: number;
  profitMargin: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("atelie_products")
      .insert({
        name: productData.name,
        type: productData.type,
        materials: productData.materials,
        work_hours: productData.workHours,
        unit_price: productData.unitPrice,
        profit_margin: productData.profitMargin,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return { ok: true, id: data?.id };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string })?.message ?? "Erro ao salvar produto" };
  }
}

export async function getProducts(): Promise<ProductRow[]> {
  try {
    const { data, error } = await supabase
      .from("atelie_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as ProductRow[];
  } catch (e: unknown) {
    return [];
  }
}


