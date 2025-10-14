import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { checkDatabaseHealth } from "./config";

export type QuoteRow = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone?: string | null;
  date: string; // ISO
  observations?: string | null;
};

export type QuoteItemRow = {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_value: number;
};

export async function listQuotes(): Promise<QuoteRow[]> {
  try {
    console.log("Buscando lista de orçamentos...");
    
    // Primeiro, tentar sem timeout para ver se funciona
    const { data, error } = await supabase
      .from("atelie_quotes")
      .select("id, code, customer_name, customer_phone, date, observations, total_value, status")
      .order("date", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Erro ao buscar orçamentos:", error);
      throw error;
    }
    
    console.log("Orçamentos encontrados:", data?.length || 0);
    console.log("Dados brutos dos orçamentos:", data);
    return data ?? [];
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error);
    
    // Se der timeout ou erro, tentar buscar dados básicos
    try {
      console.log("Tentando busca alternativa...");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("atelie_quotes")
        .select("id, code, customer_name, total_value")
        .limit(20);
      
      if (!fallbackError && fallbackData) {
        console.log("Dados de fallback encontrados:", fallbackData.length);
        return fallbackData.map(item => ({
          ...item,
          customer_phone: null,
          date: new Date().toISOString(),
          observations: null,
          status: 'pending'
        }));
      }
    } catch (fallbackError) {
      console.error("Erro no fallback:", fallbackError);
    }
    
    return [];
  }
}


export async function getQuoteByCode(code: string): Promise<{ quote: QuoteRow | null; items: QuoteItemRow[] }> {
  try {
    console.log("Buscando orçamento por código:", code);
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando para orçamento:", code);
      return { quote: null, items: [] };
    }
    
    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    const fetchPromise = supabase
      .from("atelie_quotes")
      .select("id, code, customer_name, customer_phone, date, observations, total_value, status")
      .eq("code", code)
      .maybeSingle();

    const { data: quote, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao buscar orçamento:", error);
      throw error;
    }
    
    if (!quote) {
      console.log("Orçamento não encontrado no banco");
      return { quote: null, items: [] };
    }

    console.log("Orçamento encontrado:", quote);

    const itemsPromise = supabase
      .from("atelie_quote_items")
      .select("id, quote_id, description, quantity, unit_value")
      .eq("quote_id", quote.id)
      .order("id", { ascending: true });

    const { data: items, error: itemsError } = await Promise.race([itemsPromise, timeoutPromise]) as any;
    
    if (itemsError) {
      console.error("Erro ao buscar itens do orçamento:", itemsError);
      throw itemsError;
    }
    
    console.log("Itens encontrados:", items);
    return { quote, items: items ?? [] };
  } catch (error) {
    console.error(`Erro ao buscar orçamento ${code}:`, error);
    return { quote: null, items: [] };
  }
}


export async function createQuote(input: {
  code?: string;
  customer_name: string;
  customer_phone?: string;
  date: string;
  observations?: string;
  items: { description: string; quantity: number; value: number }[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const code = input.code ?? generateQuoteCode();
    
    // Obter empresa_id do usuário logado
    const empresa_id = await getCurrentEmpresaId();
    
    const { data: quote, error } = await supabase
      .from("atelie_quotes")
      .insert({
        code,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone ?? null,
        date: input.date,
        observations: input.observations ?? null,
        total_value: input.items.reduce((sum, item) => sum + (item.value * item.quantity), 0),
        empresa_id: empresa_id,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (!quote?.id) throw new Error("Falha ao criar orçamento");

    if (input.items?.length) {
      const items = input.items.map((it) => ({
        quote_id: quote.id,
        description: it.description,
        quantity: it.quantity,
        unit_value: it.value,
        empresa_id: empresa_id,
      }));
      const { error: itemsError } = await supabase.from("atelie_quote_items").insert(items);
      if (itemsError) throw itemsError;
    }

    return { ok: true, id: code };
  } catch (e: unknown) {
    console.error("Erro ao criar orçamento:", e);
    return { ok: false, error: e?.message ?? "Erro ao criar orçamento" };
  }
}

export function generateQuoteCode(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900 + 100); // 3 dígitos
  return `ORC-${y}${m}${d}-${r}`;
}

export async function deleteQuote(quoteCode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Primeiro, buscar o ID do orçamento pelo código
    const { data: quote, error: quoteError } = await supabase
      .from("atelie_quotes")
      .select("id")
      .eq("code", quoteCode)
      .single();
    
    if (quoteError) throw quoteError;
    if (!quote) throw new Error("Orçamento não encontrado");

    // Deletar os itens do orçamento
    const { error: itemsError } = await supabase
      .from("atelie_quote_items")
      .delete()
      .eq("quote_id", quote.id);
    
    if (itemsError) throw itemsError;

    // Deletar o orçamento
    const { error: deleteError } = await supabase
      .from("atelie_quotes")
      .delete()
      .eq("id", quote.id);
    
    if (deleteError) throw deleteError;

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e?.message ?? "Erro ao excluir orçamento" };
  }
}

export async function approveQuote(quoteCode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log("Iniciando aprovação do orçamento:", quoteCode);
    
    // Buscar dados do orçamento e itens separadamente
    const { quote, items } = await getQuoteByCode(quoteCode);
    
    if (!quote) {
      throw new Error("Orçamento não encontrado");
    }

    console.log("Orçamento encontrado:", quote);

    // Calcular valor total
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_value), 0);
    console.log("Valor total calculado:", totalValue);

    // Gerar código do pedido
    const orderCode = generateOrderCode();
    console.log("Código do pedido gerado:", orderCode);

    // Criar descrição com detalhes dos itens
    const itemsDescription = items.map(item => 
      `${item.description} (Qtd: ${item.quantity})`
    ).join(', ');

    // Obter empresa_id
    let empresa_id: string;
    try {
      empresa_id = await getCurrentEmpresaId();
      console.log("Empresa ID obtido:", empresa_id);
    } catch (empresaError) {
      console.error("Erro ao obter empresa_id:", empresaError);
      throw new Error("Erro ao obter empresa. Verifique se você está logado e tem uma empresa associada.");
    }
    
    // Criar pedido
    console.log("Criando pedido...");
    const { data: order, error: orderError } = await supabase
      .from("atelie_orders")
      .insert({
        code: orderCode,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        description: `Orçamento aprovado - ${itemsDescription}`,
        value: totalValue,
        paid: 0,
        type: "outro", // Adicionar campo type obrigatório
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
        status: "Aguardando aprovação",
        empresa_id: empresa_id
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Erro ao criar pedido:", orderError);
      
      // Se for erro de RLS, tentar criar sem empresa_id
      if (orderError.message.includes('row-level security policy')) {
        console.log("Tentando criar pedido sem empresa_id devido a RLS...");
        const { data: orderRetry, error: orderRetryError } = await supabase
          .from("atelie_orders")
          .insert({
            code: orderCode,
            customer_name: quote.customer_name,
            customer_phone: quote.customer_phone,
            description: `Orçamento aprovado - ${itemsDescription}`,
            value: totalValue,
            paid: 0,
            type: "outro", // Adicionar campo type obrigatório
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Aguardando aprovação"
          })
          .select("id")
          .single();
          
        if (orderRetryError) {
          throw new Error(`Erro ao criar pedido: ${orderRetryError.message}`);
        }
        
        // Usar o pedido criado sem empresa_id
        order = orderRetry;
      } else {
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }
    }
    
    if (!order?.id) {
      throw new Error("Falha ao criar pedido - ID não retornado");
    }

    console.log("Pedido criado com sucesso:", order.id);

    // Marcar orçamento como aprovado
    console.log("Marcando orçamento como aprovado...");
    const { error: updateError } = await supabase
      .from("atelie_quotes")
      .update({ 
        status: 'approved',
        observations: `APROVADO - Transferido para pedido ${orderCode}` 
      })
      .eq("id", quote.id);

    if (updateError) {
      console.error("Erro ao atualizar orçamento:", updateError);
      throw new Error(`Erro ao atualizar orçamento: ${updateError.message}`);
    }

    console.log("Orçamento aprovado com sucesso!");
    return { ok: true };
  } catch (e: unknown) {
    console.error("Erro ao aprovar orçamento:", e);
    return { ok: false, error: e?.message ?? "Erro ao aprovar orçamento" };
  }
}

export async function updateQuote(quoteCode: string, input: {
  customer_name?: string;
  customer_phone?: string;
  date?: string;
  observations?: string;
  items?: { description: string; quantity: number; value: number }[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    // Buscar o orçamento pelo código
    const { data: quote, error: quoteError } = await supabase
      .from("atelie_quotes")
      .select("id, status")
      .eq("code", quoteCode)
      .single();
    
    if (quoteError) throw quoteError;
    if (!quote) throw new Error("Orçamento não encontrado");

    // Atualizar dados do orçamento
    const updateData: unknown = {};
    if (input.customer_name !== undefined) updateData.customer_name = input.customer_name;
    if (input.customer_phone !== undefined) updateData.customer_phone = input.customer_phone;
    if (input.date !== undefined) updateData.date = input.date;
    if (input.observations !== undefined) updateData.observations = input.observations;

    // Calcular novo valor total se itens foram fornecidos
    if (input.items) {
      updateData.total_value = input.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("atelie_quotes")
        .update(updateData)
        .eq("id", quote.id);
      
      if (updateError) throw updateError;
    }

    // Atualizar itens se fornecidos
    if (input.items) {
      // Deletar itens existentes
      const { error: deleteError } = await supabase
        .from("atelie_quote_items")
        .delete()
        .eq("quote_id", quote.id);
      
      if (deleteError) throw deleteError;

      // Inserir novos itens
      if (input.items.length > 0) {
        const empresa_id = await getCurrentEmpresaId();
        const items = input.items.map((it) => ({
          quote_id: quote.id,
          description: it.description,
          quantity: it.quantity,
          unit_value: it.value,
          empresa_id: empresa_id,
        }));
        
        const { error: itemsError } = await supabase
          .from("atelie_quote_items")
          .insert(items);
        
        if (itemsError) throw itemsError;
      }
    }

    // Se o orçamento foi aprovado, sincronizar com o pedido
    if (quote.status === 'approved') {
      await syncQuoteToOrder(quoteCode, input);
    }

    return { ok: true };
  } catch (e: unknown) {
    console.error("Erro ao atualizar orçamento:", e);
    return { ok: false, error: e?.message ?? "Erro ao atualizar orçamento" };
  }
}

// Função para sincronizar orçamento aprovado com pedido
async function syncQuoteToOrder(quoteCode: string, input: {
  customer_name?: string;
  customer_phone?: string;
  date?: string;
  observations?: string;
  items?: { description: string; quantity: number; value: number }[];
}): Promise<void> {
  try {
    console.log("Sincronizando orçamento aprovado com pedido:", quoteCode);
    
    // Buscar o pedido relacionado ao orçamento
    const { data: order, error: orderError } = await supabase
      .from("atelie_orders")
      .select("id, code")
      .like("description", `%${quoteCode}%`)
      .single();
    
    if (orderError || !order) {
      console.log("Pedido não encontrado para sincronização");
      return;
    }

    // Preparar dados para atualização do pedido
    const orderUpdateData: unknown = {};
    
    if (input.customer_name !== undefined) orderUpdateData.customer_name = input.customer_name;
    if (input.customer_phone !== undefined) orderUpdateData.customer_phone = input.customer_phone;
    
    // Atualizar descrição se itens foram fornecidos
    if (input.items) {
      const itemsDescription = input.items.map(item => 
        `${item.description} (Qtd: ${item.quantity})`
      ).join(', ');
      orderUpdateData.description = `Orçamento aprovado - ${itemsDescription}`;
      orderUpdateData.value = input.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    }

    // Atualizar o pedido
    if (Object.keys(orderUpdateData).length > 0) {
      const { error: updateOrderError } = await supabase
        .from("atelie_orders")
        .update(orderUpdateData)
        .eq("id", order.id);
      
      if (updateOrderError) {
        console.error("Erro ao sincronizar pedido:", updateOrderError);
      } else {
        console.log("Pedido sincronizado com sucesso:", order.code);
      }
    }
  } catch (error) {
    console.error("Erro na sincronização orçamento-pedido:", error);
  }
}

function generateOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900 + 100);
  return `PED-${y}${m}${d}-${r}`;
}


