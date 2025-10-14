import { supabase } from "./client";

export type InventoryRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  status: string;
};

export async function listInventory(): Promise<InventoryRow[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, min_quantity, status")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as InventoryRow[];
  } catch {
    return [
      { id: "i1", name: "Linha Preta", quantity: 45, unit: "bobinas", min_quantity: 20, status: "ok" },
      { id: "i2", name: "Linha Branca", quantity: 32, unit: "bobinas", min_quantity: 20, status: "ok" },
      { id: "i3", name: "Linha Azul", quantity: 8, unit: "bobinas", min_quantity: 15, status: "low" },
      { id: "i4", name: "Tecido Algodão", quantity: 150, unit: "metros", min_quantity: 50, status: "ok" },
      { id: "i5", name: "Tecido Poliéster", quantity: 25, unit: "metros", min_quantity: 40, status: "low" },
      { id: "i6", name: "Zíperes", quantity: 3, unit: "unidades", min_quantity: 20, status: "critical" },
      { id: "i7", name: "Botões", quantity: 180, unit: "unidades", min_quantity: 100, status: "ok" },
      { id: "i8", name: "Elástico", quantity: 12, unit: "metros", min_quantity: 15, status: "low" },
    ];
  }
}

export async function updateInventoryItem(id: string, input: { name?: string; quantity?: number; unit?: string; min_quantity?: number }): Promise<{ ok: boolean; data?: InventoryRow; error?: string }> {
  try {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.min_quantity !== undefined) updateData.min_quantity = input.min_quantity;
    
    const { data, error } = await supabase
      .from("inventory_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return { ok: true, data: data as InventoryRow };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao atualizar item do estoque" };
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
  materials: any;
  workHours: number;
  unitPrice: number;
  profitMargin: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    console.log("🔍 Tentando salvar produto:", productData);
    
    const { data, error } = await supabase
      .from("atelie_products")
      .insert({
        name: productData.name,
        type: productData.type,
        materials: productData.materials,
        work_hours: productData.workHours,
        unit_price: productData.unitPrice,
        profit_margin: productData.profitMargin,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("❌ Erro ao salvar produto:", error);
      throw error;
    }
    
    console.log("✅ Produto salvo com sucesso:", data);
    return { ok: true, id: data?.id };
  } catch (e: any) {
    console.error("❌ Erro na função saveProduct:", e);
    return { ok: false, error: e?.message ?? "Erro ao salvar produto" };
  }
}

export async function getProducts(): Promise<ProductRow[]> {
  try {
    console.log("🔍 Buscando produtos do catálogo...");
    
    const { data, error } = await supabase
      .from("atelie_products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("❌ Erro ao buscar produtos:", error);
      throw error;
    }
    
    console.log("✅ Produtos encontrados:", data?.length || 0);
    return (data ?? []) as ProductRow[];
  } catch (e: any) {
    console.error("❌ Erro na função getProducts:", e);
    return [];
  }
}


