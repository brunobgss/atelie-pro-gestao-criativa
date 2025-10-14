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
    // NORMALIZAR ID - REMOVER ESPAÇOS E GARANTIR FORMATO
    const normalizedId = String(id).trim();
    
    console.log("🔄 Atualizando item do estoque:", { id: normalizedId, input });
    console.log("🔍 Tipo do ID:", typeof normalizedId);
    console.log("🔍 ID original:", id);
    console.log("🔍 ID normalizado:", normalizedId);
    console.log("🔍 IDs são iguais:", id === normalizedId);
    
    // Verificar se o ID é válido
    if (!normalizedId || normalizedId === '') {
      console.error("❌ ID inválido ou vazio");
      return { ok: false, error: "ID inválido" };
    }
    
    // Verificar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(normalizedId)) {
      console.error("❌ ID não é um UUID válido:", normalizedId);
      return { ok: false, error: "ID não é um UUID válido" };
    }
    
    // Preparar dados de forma mais segura
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = String(input.name);
    if (input.quantity !== undefined) updateData.quantity = Number(input.quantity);
    if (input.unit !== undefined) updateData.unit = String(input.unit);
    if (input.min_quantity !== undefined) updateData.min_quantity = Number(input.min_quantity);
    
    console.log("📝 Dados para atualização:", updateData);
    
    // Primeiro, verificar se o item existe especificamente
    console.log("🔍 DEBUG: Verificando se item existe...");
    const { data: existingItem, error: checkError } = await supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, min_quantity, empresa_id")
      .eq("id", normalizedId)
      .single();
    
    console.log("🔍 Resultado da verificação:", { existingItem, checkError });
    
    // Verificar se o item tem empresa_id
    if (existingItem && !existingItem.empresa_id) {
      console.error("❌ Item não tem empresa_id definido!");
      return { ok: false, error: "Item não tem empresa associada" };
    }
    
    if (checkError) {
      console.error("❌ Erro ao verificar item:", checkError);
      return { ok: false, error: `Item não encontrado: ${checkError.message}` };
    }
    
    if (!existingItem) {
      console.error("❌ Item não existe no banco de dados");
      return { ok: false, error: "Item não encontrado no banco de dados" };
    }
    
    console.log("✅ Item encontrado, prosseguindo com atualização...");
    
    // Atualizar diretamente
    console.log("🔄 Executando atualização direta...");
    console.log("🔍 Query: UPDATE inventory_items SET", updateData, "WHERE id =", normalizedId);
    
    const { data, error } = await supabase
      .from("inventory_items")
      .update(updateData)
      .eq("id", normalizedId)
      .select("*");
    
    console.log("📊 Resultado da query:", { data, error });
    
    if (error) {
      console.error("❌ Erro do Supabase:", error);
      return { ok: false, error: `Erro do banco: ${error.message}` };
    }
    
    if (!data || data.length === 0) {
      console.error("❌ Nenhum item encontrado para atualizar");
      console.error("❌ ID usado na query:", normalizedId);
      console.error("❌ Dados enviados:", updateData);
      console.error("❌ Resultado da query:", { data, error });
      return { ok: false, error: "Item não encontrado para atualização" };
    }
    
    console.log("✅ Item atualizado com sucesso:", data[0]);
    return { ok: true, data: data[0] as InventoryRow };
  } catch (e: unknown) {
    console.error("❌ Erro na atualização:", e);
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
  materials: unknown;
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
  } catch (e: unknown) {
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
  } catch (e: unknown) {
    console.error("❌ Erro na função getProducts:", e);
    return [];
  }
}


