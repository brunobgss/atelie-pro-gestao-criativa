import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";

export type CustomerRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export async function createCustomer(input: { name: string; phone?: string; email?: string }): Promise<{ ok: boolean; id?: string; data?: CustomerRow; error?: string }> {
  try {
    console.log("➕ Criando cliente no banco:", input);
    
    // Obter empresa_id do usuário logado usando a função existente
    const empresa_id = await getCurrentEmpresaId();
    
    if (!empresa_id) {
      console.error("❌ Erro ao obter empresa do usuário");
      return { ok: false, error: "Erro ao identificar empresa do usuário" };
    }
    
    console.log("✅ Empresa encontrada:", empresa_id);
    
    const { data, error } = await supabase
      .from("customers")
      .insert({
        empresa_id: empresa_id,
        name: input.name, 
        phone: input.phone ?? null, 
        email: input.email ?? null
      })
      .select("*")
      .single();
    
    if (error) {
      console.error("❌ Erro ao criar cliente:", error);
      throw error;
    }
    
    console.log("✅ Cliente criado com sucesso:", data.id);
    return { ok: true, id: data?.id, data: data };
  } catch (e: unknown) {
    console.error("❌ Erro na função createCustomer:", e);
    return { ok: false, error: e?.message ?? "Erro ao criar cliente" };
  }
}

export async function updateCustomer(id: string, input: { name?: string; phone?: string; email?: string }): Promise<{ ok: boolean; data?: CustomerRow; error?: string }> {
  try {
    console.log("🔍 Atualizando cliente:", { id, input });
    
    // Primeiro, verificar se o cliente existe
    const { data: existingCustomer, error: fetchError } = await supabase
      .from("customers")
      .select("id, name")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      console.error("❌ Erro ao buscar cliente:", fetchError);
      return { ok: false, error: "Cliente não encontrado" };
    }
    
    if (!existingCustomer) {
      console.error("❌ Cliente não encontrado com ID:", id);
      return { ok: false, error: "Cliente não encontrado" };
    }
    
    console.log("✅ Cliente encontrado:", existingCustomer.name);
    
    const updateData: unknown = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    
    console.log("📝 Dados para atualização:", updateData);
    
    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select("*");
    
    if (error) {
      console.error("❌ Erro do Supabase na atualização:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error("❌ Nenhum cliente retornado após atualização");
      // Tentar buscar o cliente novamente para verificar se foi atualizado
      const { data: updatedClient, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError || !updatedClient) {
        console.error("❌ Cliente não encontrado após atualização");
        return { ok: false, error: "Erro ao atualizar cliente" };
      }
      
      console.log("✅ Cliente atualizado (verificação posterior):", updatedClient);
      return { ok: true, data: updatedClient as CustomerRow };
    }
    
    console.log("✅ Cliente atualizado com sucesso:", data[0]);
    return { ok: true, data: data[0] as CustomerRow };
  } catch (e: unknown) {
    console.error("❌ Erro na função updateCustomer:", e);
    return { ok: false, error: e?.message ?? "Erro ao atualizar cliente" };
  }
}

export async function deleteCustomer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e?.message ?? "Erro ao excluir cliente" };
  }
}


