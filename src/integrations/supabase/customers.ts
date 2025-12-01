import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { ErrorMessages } from "@/utils/errorMessages";

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
    let empresa_id: string;
    try {
      empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) {
        console.error("❌ Erro ao obter empresa do usuário");
        return { ok: false, error: ErrorMessages.empresaNotFound() };
      }
    } catch (empresaError: any) {
      console.error("❌ Erro ao obter empresa_id:", empresaError);
      // Se já tem mensagem formatada, usar ela; senão, usar mensagem padrão
      const errorMessage = empresaError?.message?.includes('⏱️') 
        ? empresaError.message 
        : ErrorMessages.empresaNotFound();
      return { ok: false, error: errorMessage };
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
      // Melhorar mensagem de erro para RLS
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: ErrorMessages.permissionDenied() };
      }
      throw new Error(ErrorMessages.saveError("o cliente"));
    }
    
    console.log("✅ Cliente criado com sucesso:", data.id);
    return { ok: true, id: data?.id, data: data };
  } catch (e: unknown) {
    console.error("❌ Erro na função createCustomer:", e);
    // Se já tem mensagem formatada, usar ela; senão, usar mensagem padrão
    const errorMessage = (e as any)?.message?.includes('⏱️') 
      ? (e as any).message 
      : ErrorMessages.saveError("o cliente");
    return { ok: false, error: errorMessage };
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

export async function getCustomers(): Promise<CustomerRow[]> {
  try {
    console.log("🔍 Buscando clientes...");
    
    // Obter empresa_id do usuário logado
    const empresa_id = await getCurrentEmpresaId();
    
    if (!empresa_id) {
      console.error("❌ Erro ao obter empresa do usuário");
      return [];
    }
    
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar clientes:", error);
      throw error;
    }

    console.log("✅ Clientes encontrados:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("❌ Erro ao buscar clientes:", error);
    throw error;
  }
}


