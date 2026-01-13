import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';
import { ErrorMessages } from '@/utils/errorMessages';

export interface ProductRow {
  id: string;
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  empresa_id?: string;
  inventory_items?: string[] | string; // IDs dos itens de estoque vinculados (array ou JSON string)
  inventory_quantities?: number[] | string; // Quantidades por unidade (array ou JSON string)
}

export async function createProduct(input: {
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  image_url?: string;
}): Promise<{ ok: boolean; id?: string; data?: ProductRow; error?: string }> {
  try {
    console.log("🔍 Criando produto:", input);
    
    // Obter empresa do usuário
    let empresaId: string;
    try {
      empresaId = await getCurrentEmpresaId();
      if (!empresaId) {
        return { ok: false, error: ErrorMessages.empresaNotFound() };
      }
    } catch (empresaError: any) {
      console.error("Erro ao obter empresa_id:", empresaError);
      // Se já tem mensagem formatada, usar ela; senão, usar mensagem padrão
      const errorMessage = empresaError?.message?.includes('⏱️') 
        ? empresaError.message 
        : ErrorMessages.empresaNotFound();
      return { ok: false, error: errorMessage };
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
        image_url: input.image_url || null,
        empresa_id: empresaId,
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Erro ao criar produto:", error);
      // Melhorar mensagem de erro para RLS
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: ErrorMessages.permissionDenied() };
      }
      return { ok: false, error: ErrorMessages.saveError("o produto") };
    }

    console.log("✅ Produto criado com sucesso:", data);
    return { ok: true, id: data.id, data: data as ProductRow };
  } catch (e: unknown) {
    console.error("❌ Erro na função createProduct:", e);
    // Se já tem mensagem formatada, usar ela; senão, usar mensagem padrão
    const errorMessage = (e as any)?.message?.includes('⏱️') 
      ? (e as any).message 
      : ErrorMessages.saveError("o produto");
    return { ok: false, error: errorMessage };
  }
}

export async function updateProduct(id: string, input: {
  name?: string;
  type?: string;
  materials?: string[];
  work_hours?: number;
  unit_price?: number;
  profit_margin?: number;
  image_url?: string;
  inventory_items?: string[]; // IDs dos itens de estoque vinculados
  inventory_quantities?: number[]; // Quantidades por unidade
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
    console.error("🔍 [getProducts] Buscando produtos...");
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      console.error("❌ [getProducts] Usuário não tem empresa associada");
      return [];
    }

    console.error(`🏢 [getProducts] Buscando produtos da empresa: ${empresaId}`);

    // Supabase tem limite máximo de 1000 registros por query
    // Precisamos fazer paginação para buscar todos os produtos
    const allProducts: ProductRow[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("atelie_products")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`❌ [getProducts] Erro ao buscar produtos (offset ${offset}):`, error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allProducts.push(...(data as ProductRow[]));
      console.error(`📦 [getProducts] Buscados ${data.length} produtos (total acumulado: ${allProducts.length})`);

      // Se retornou menos que o pageSize, não há mais produtos
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    console.error(`✅ [getProducts] Total de produtos encontrados: ${allProducts.length}`);
    if (allProducts.length > 0) {
      console.error(`📦 [getProducts] Primeiros produtos:`, allProducts.slice(0, 5).map(p => ({ 
        id: p.id, 
        name: p.name, 
        empresa_id: p.empresa_id,
        type: p.type 
      })));
    }
    return allProducts;
  } catch (e: unknown) {
    console.error("❌ [getProducts] Erro na função getProducts:", e);
    return [];
  }
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  try {
    console.log("🔍 Buscando produto por ID:", id);
    
    // Obter empresa do usuário
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
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
