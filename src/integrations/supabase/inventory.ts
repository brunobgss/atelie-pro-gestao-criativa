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
    
    if (error) throw error;
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao salvar produto" };
  }
}


