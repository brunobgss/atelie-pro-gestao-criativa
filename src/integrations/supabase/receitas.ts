import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { mapPaymentToOrderStatus } from "@/utils/statusConstants";
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
    
    // Obter empresa_id do usuário logado
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();
    
    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return [];
    }
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return [];
    }

    const { data, error } = await supabase
      .from("atelie_receitas")
      .select("*")
      .eq("empresa_id", userEmpresa.empresa_id)
      .order("payment_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erro ao buscar receitas:", error);
      return [];
    }

    console.log("Receitas encontradas:", data?.length || 0);
    return data ?? [];
  } catch (e: unknown) {
    console.error("Erro ao buscar receitas:", e);
    return [];
  }
}

// Função para buscar receita por código do pedido
export async function getReceitaByOrderCode(orderCode: string): Promise<ReceitaRow | null> {
  try {
    console.log("Buscando receita por código do pedido:", orderCode);
    
    // Obter empresa_id do usuário logado
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();
    
    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return null;
    }
    
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
      .eq("empresa_id", userEmpresa.empresa_id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar receita:", error);
      return null;
    }

    console.log("Receita encontrada:", data);
    return data as ReceitaRow;
  } catch (e: unknown) {
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
    const empresa_id = await getCurrentEmpresaId();
    
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
      .maybeSingle();

    if (error) {
      console.error("Erro ao criar receita:", error);
      return { ok: false, error: error.message };
    }

    console.log("Receita criada com sucesso:", data);
    return { ok: true, id: data.id };
  } catch (e: unknown) {
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
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar receita:", error);
      return { ok: false, error: error.message };
    }

    console.log("Receita atualizada com sucesso:", data);
    return { ok: true, data: data as ReceitaRow };
  } catch (e: unknown) {
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
  } catch (e: unknown) {
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
    
    // Buscar o pedido para obter o valor total e customer_name
    const { data: order, error: orderError } = await supabase
      .from("atelie_orders")
      .select("id, value, paid, empresa_id, customer_name")
      .eq("code", orderCode)
      .maybeSingle();

    if (orderError || !order) {
      console.error("Erro ao buscar pedido:", orderError);
      return { ok: false, error: "Pedido não encontrado" };
    }

    // Calcular novo valor pago baseado no status
    let newPaidValue = 0;
    
    if (status === 'pago') {
      newPaidValue = order.value; // Pago = valor total
    } else if (status === 'pendente') {
      newPaidValue = 0; // Pendente = nada pago
    } else if (status === 'parcial') {
      // Manter valor atual ou metade se for 0
      newPaidValue = order.paid > 0 ? order.paid : order.value / 2;
    }
    
    // IMPORTANTE: Criar/Atualizar registro na tabela RECEITAS, não apenas order.paid
    // Buscar se já existe receita para este pedido
    const { data: existingReceita } = await supabase
      .from("atelie_receitas")
      .select("id")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (existingReceita) {
      // Atualizar receita existente
      const { error: updateReceitaError } = await supabase
        .from("atelie_receitas")
        .update({ 
          amount: newPaidValue,
          updated_at: new Date().toISOString()
        })
        .eq("order_code", orderCode);

      if (updateReceitaError) {
        console.error("Erro ao atualizar receita:", updateReceitaError);
        return { ok: false, error: updateReceitaError.message };
      }
    } else {
      // Criar nova receita com todos os campos obrigatórios
      const receitaData = {
        order_code: orderCode,
        customer_name: order.customer_name || "Sem nome",
        description: `Pagamento do pedido ${orderCode}`, // Campo obrigatório
        amount: newPaidValue,
        payment_method: "Dinheiro", // Método padrão
        payment_date: new Date().toISOString().split('T')[0], // Data de hoje
        status: newPaidValue > 0 ? "Pago" : "Pendente",
        empresa_id: order.empresa_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("Tentando criar receita com dados:", receitaData);
      
      const { error: createReceitaError } = await supabase
        .from("atelie_receitas")
        .insert(receitaData);

      if (createReceitaError) {
        console.error("Erro detalhado ao criar receita:", JSON.stringify(createReceitaError, null, 2));
        // Não falhar aqui, apenas logar
      } else {
        console.log("Receita criada com sucesso!");
      }
    }
    
    // Atualizar também order.paid para compatibilidade (DEPRECATED - não usar mais)
    const { error: updateError } = await supabase
      .from("atelie_orders")
      .update({ 
        paid: newPaidValue,
        updated_at: new Date().toISOString()
      })
      .eq("code", orderCode);

    if (updateError) {
      console.error("Erro ao atualizar order.paid:", updateError);
      // Não retornar erro aqui, pois a receita já foi atualizada
    }

    console.log("Status de pagamento atualizado com sucesso");
    return { ok: true };
  } catch (e: unknown) {
    console.error("Erro ao atualizar status de pagamento:", e);
    return { ok: false, error: e.message };
  }
}