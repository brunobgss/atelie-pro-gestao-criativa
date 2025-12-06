import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { ErrorMessages } from "@/utils/errorMessages";

export type CustomerRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
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

export async function updateCustomer(id: string, input: { name?: string; phone?: string; email?: string; address?: string }): Promise<{ ok: boolean; data?: CustomerRow; error?: string }> {
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
    
    const updateData: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string | null;
    } = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    
    // Só incluir address se não for undefined (pode ser null para limpar)
    if (input.address !== undefined) {
      updateData.address = input.address;
    }
    
    console.log("📝 Dados para atualização:", updateData);
    
    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select("*");
    
    if (error) {
      console.error("❌ Erro do Supabase na atualização:", error);
      
      // Se o erro for sobre a coluna address não existir, tentar novamente sem ela
      if (error.message?.includes("address") && error.message?.includes("schema cache")) {
        console.warn("⚠️ Coluna address não encontrada, tentando atualizar sem esse campo");
        const updateDataWithoutAddress: {
          name?: string;
          phone?: string;
          email?: string;
        } = {};
        
        if (input.name !== undefined) updateDataWithoutAddress.name = input.name;
        if (input.phone !== undefined) updateDataWithoutAddress.phone = input.phone;
        if (input.email !== undefined) updateDataWithoutAddress.email = input.email;
        
        const { data: retryData, error: retryError } = await supabase
          .from("customers")
          .update(updateDataWithoutAddress)
          .eq("id", id)
          .select("*");
        
        if (retryError) {
          console.error("❌ Erro ao atualizar cliente (sem address):", retryError);
          if (retryError.message?.includes('row-level security') || retryError.message?.includes('RLS')) {
            return { ok: false, error: "Sem permissão para atualizar este cliente" };
          }
          return { ok: false, error: retryError.message || "Erro ao atualizar cliente" };
        }
        
        console.log("✅ Cliente atualizado com sucesso (sem address):", retryData[0]);
        return { ok: true, data: retryData[0] as CustomerRow };
      }
      
      // Melhorar mensagem de erro
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: "Sem permissão para atualizar este cliente" };
      }
      // Se o erro for sobre updated_at não existir, tentar novamente sem o trigger
      if (error.message?.includes('updated_at') && error.message?.includes('has no field')) {
        console.warn("⚠️ Coluna updated_at não encontrada, tentando atualizar novamente");
        // O erro pode ser do trigger, mas vamos tentar novamente
        // Se persistir, o usuário precisa executar o script SQL para adicionar a coluna
        return { 
          ok: false, 
          error: "Erro: a coluna 'updated_at' não existe na tabela. Execute o script SQL 'adicionar-coluna-updated_at-customers.sql' no Supabase." 
        };
      }
      
      if (error.message?.includes('updated_at')) {
        // Se o erro for sobre updated_at, pode ser que o trigger não esteja funcionando
        // Mas não devemos falhar por isso, apenas logar
        console.warn("⚠️ Aviso sobre updated_at (pode ser ignorado se o trigger estiver configurado):", error.message);
      }
      return { ok: false, error: error.message || "Erro ao atualizar cliente" };
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
    const errorMessage = (e as any)?.message || "Erro ao atualizar cliente";
    // Filtrar mensagens de erro estranhas que podem vir de traduções incorretas
    if (errorMessage.includes('disco') || errorMessage.includes('Novo')) {
      console.warn("⚠️ Mensagem de erro estranha detectada, usando mensagem genérica");
      return { ok: false, error: "Erro ao atualizar cliente. Verifique se todos os campos estão corretos." };
    }
    return { ok: false, error: errorMessage };
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


