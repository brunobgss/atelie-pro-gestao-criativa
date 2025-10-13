import { supabase } from "./client";
import { checkDatabaseHealth } from "./config";

export interface ReceitaRow {
  id: string;
  empresa_id: string;
  order_id?: string;
  order_code: string;
  customer_name: string;
  description?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Função para buscar receitas
export async function listReceitas(): Promise<ReceitaRow[]> {
  try {
    console.log("Buscando receitas...");
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return [];
    }

    const { data, error } = await supabase
      .from("atelie_receitas")
      .select("*")
      .order("payment_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erro ao buscar receitas:", error);
      return [];
    }

    console.log("Receitas encontradas:", data?.length || 0);
    return data ?? [];
  } catch (e: any) {
    console.error("Erro ao buscar receitas:", e);
    return [];
  }
}

// Função para buscar receita por código do pedido
export async function getReceitaByOrderCode(orderCode: string): Promise<ReceitaRow | null> {
  try {
    console.log("Buscando receita por código do pedido:", orderCode);
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return null;
    }

    const { data, error } = await supabase
      .from("atelie_receitas")
      .select("*")
      .eq("order_code", orderCode)
      .single();

    if (error) {
      console.error("Erro ao buscar receita:", error);
      return null;
    }

    console.log("Receita encontrada:", data);
    return data as ReceitaRow;
  } catch (e: any) {
    console.error("Erro ao buscar receita:", e);
    return null;
  }
}

// Função para criar receita
export async function createReceita(input: {
  order_code: string;
  customer_name: string;
  description?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    console.log("Criando receita:", input);
    
    // Obter empresa_id do usuário logado
    const empresa_id = "temp-empresa-id"; // TODO: Implementar getCurrentEmpresaId
    
    const { data, error } = await supabase
      .from("atelie_receitas")
      .insert({
        empresa_id,
        order_code: input.order_code,
        customer_name: input.customer_name,
        description: input.description ?? null,
        amount: input.amount,
        payment_method: input.payment_method,
        payment_date: input.payment_date,
        status: input.status ?? "Pago"
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar receita:", error);
      return { ok: false, error: error.message };
    }

    console.log("Receita criada com sucesso:", data);
    return { ok: true, id: data.id };
  } catch (e: any) {
    console.error("Erro ao criar receita:", e);
    return { ok: false, error: e.message };
  }
}

// Função para atualizar receita
export async function updateReceita(
  id: string,
  updates: Partial<{
    description: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    status: string;
  }>
): Promise<{ ok: boolean; data?: ReceitaRow; error?: string }> {
  try {
    console.log(`Atualizando receita ${id}:`, updates);
    
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from("atelie_receitas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar receita:", error);
      return { ok: false, error: error.message };
    }

    console.log("Receita atualizada com sucesso:", data);
    return { ok: true, data: data as ReceitaRow };
  } catch (e: any) {
    console.error("Erro ao atualizar receita:", e);
    return { ok: false, error: e.message };
  }
}

// Função para deletar receita
export async function deleteReceita(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("Deletando receita:", id);
    
    const { error } = await supabase
      .from("atelie_receitas")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar receita:", error);
      return { ok: false, error: error.message };
    }

    console.log("Receita deletada com sucesso");
    return { ok: true };
  } catch (e: any) {
    console.error("Erro ao deletar receita:", e);
    return { ok: false, error: e.message };
  }
}

// Função para atualizar status de pagamento
export async function updatePaymentStatus(
  orderCode: string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log(`Atualizando status de pagamento para ${orderCode}:`, status);
    
    const { data, error } = await supabase
      .from("atelie_receitas")
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("order_code", orderCode);

    if (error) {
      console.error("Erro ao atualizar status de pagamento:", error);
      return { ok: false, error: error.message };
    }

    console.log("Status de pagamento atualizado com sucesso");
    return { ok: true };
  } catch (e: any) {
    console.error("Erro ao atualizar status de pagamento:", e);
    return { ok: false, error: e.message };
  }
}