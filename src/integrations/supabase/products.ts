import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface ProductRow {
  id: string;
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
  empresa_id?: string;
}

export async function createProduct(input: {
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
}): Promise<{ ok: boolean; id?: string; data?: ProductRow; error?: string }> {
  try {
    console.log("🔍 Criando produto:", input);
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Usuário não tem empresa associada" };
    }

    const { data, error } = await supabase
      .from("atelie_products")
      .insert({
        name: input.name,
        type: input.type,
        materials: input.materials,
        work_hours: input.work_hours,
        unit_price: input.unit_price,
        profit_margin: input.profit_margin,
        empresa_id: empresaId,
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Erro ao criar produto:", error);
      return { ok: false, error: error.message };
    }

    console.log("✅ Produto criado com sucesso:", data);
    return { ok: true, id: data.id, data: data as ProductRow };
  } catch (e: unknown) {
    console.error("❌ Erro na função createProduct:", e);
    return { ok: false, error: e?.message ?? "Erro ao criar produto" };
  }
}

export async function updateProduct(id: string, input: {
  name?: string;
  type?: string;
  materials?: string[];
  work_hours?: number;
  unit_price?: number;
  profit_margin?: number;
}): Promise<{ ok: boolean; data?: ProductRow; error?: string }> {
  try {
    console.log("🔍 Atualizando produto:", { id, input });
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Usuário não tem empresa associada" };
    }

    const { data, error } = await supabase
      .from("atelie_products")
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .select("*")
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar produto:", error);
      return { ok: false, error: error.message };
    }

    console.log("✅ Produto atualizado com sucesso:", data);
    return { ok: true, data: data as ProductRow };
  } catch (e: unknown) {
    console.error("❌ Erro na função updateProduct:", e);
    return { ok: false, error: e?.message ?? "Erro ao atualizar produto" };
  }
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("🔍 Deletando produto:", id);
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: "Usuário não tem empresa associada" };
    }

    const { error } = await supabase
      .from("atelie_products")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("❌ Erro ao deletar produto:", error);
      return { ok: false, error: error.message };
    }

    console.log("✅ Produto deletado com sucesso");
    return { ok: true };
  } catch (e: unknown) {
    console.error("❌ Erro na função deleteProduct:", e);
    return { ok: false, error: e?.message ?? "Erro ao deletar produto" };
  }
}

export async function getProducts(): Promise<ProductRow[]> {
  try {
    console.log("🔍 Buscando produtos...");
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      console.error("❌ Usuário não tem empresa associada");
      return [];
    }

    const { data, error } = await supabase
      .from("atelie_products")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erro ao buscar produtos:", error);
      return [];
    }

    console.log("✅ Produtos encontrados:", data?.length || 0);
    return (data as ProductRow[]) || [];
  } catch (e: unknown) {
    console.error("❌ Erro na função getProducts:", e);
    return [];
  }
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  try {
    console.log("🔍 Buscando produto por ID:", id);
    
    // Obter empresa do usuário
    const userEmpresa = await getCurrentUserEmpresa();
    if (!userEmpresa) {
      console.error("❌ Usuário não tem empresa associada");
      return null;
    }

    const { data, error } = await supabase
      .from("atelie_products")
      .select("*")
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar produto:", error);
      return null;
    }

    console.log("✅ Produto encontrado:", data);
    return data as ProductRow;
  } catch (e: unknown) {
    console.error("❌ Erro na função getProductById:", e);
    return null;
  }
}
