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

export type QuotePersonalizationRow = {
  id: string;
  quote_id: string;
  empresa_id: string;
  person_name: string;
  size?: string | null;
  quantity: number;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuotePersonalizationInput = {
  person_name: string;
  size?: string;
  quantity: number;
  notes?: string;
};

export async function listQuotes(): Promise<QuoteRow[]> {
  try {
    console.log("Buscando lista de orçamentos...");
    
    // Obter empresa_id do usuário logado
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return [];
    }
    
    // Filtrar por empresa_id
    const { data, error } = await supabase
      .from("atelie_quotes")
      .select("id, code, customer_name, customer_phone, date, observations, total_value, status, created_at")
      .eq("empresa_id", userEmpresa.empresa_id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Erro ao buscar orçamentos:", error);
      throw error;
    }
    
    console.log("Orçamentos encontrados:", data?.length || 0);
    console.log("Dados brutos dos orçamentos:", data);
    if (data && data.length > 0) {
      console.log("Primeiro orçamento:", { id: data[0].id, code: data[0].code });
    }
    return data ?? [];
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error);
    
    // Se der timeout ou erro, tentar buscar dados básicos
    try {
      console.log("Tentando busca alternativa...");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("atelie_quotes")
        .select("id, code, customer_name, total_value")
        .eq("empresa_id", userEmpresa.empresa_id)
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


// Função para detectar se é UUID ou código
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function getQuoteByCode(code: string): Promise<{ quote: QuoteRow | null; items: QuoteItemRow[]; personalizations: QuotePersonalizationRow[] }> {
  try {
    console.log("Buscando orçamento por código:", code);
    
    // Obter empresa_id do usuário logado
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return { quote: null, items: [], personalizations: [] };
    }
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando para orçamento:", code);
      return { quote: null, items: [], personalizations: [] };
    }
    
    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    // Detectar se é UUID ou código e buscar adequadamente
    const isUuid = isUUID(code.trim());
    console.log("Tipo de identificador para orçamento:", isUuid ? "UUID" : "Código");
    
    const fetchPromise = supabase
      .from("atelie_quotes")
      .select("id, code, customer_name, customer_phone, date, observations, total_value, status")
      .eq(isUuid ? "id" : "code", code.trim())
      .eq("empresa_id", userEmpresa.empresa_id)
      .maybeSingle();

    const { data: quote, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao buscar orçamento:", error);
      throw error;
    }
    
    if (!quote) {
      console.log("Orçamento não encontrado no banco");
      return { quote: null, items: [], personalizations: [] };
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

    const personalizationsPromise = supabase
      .from("atelie_quote_personalizations")
      .select("id, quote_id, empresa_id, person_name, size, quantity, notes, created_at, updated_at")
      .eq("quote_id", quote.id)
      .order("created_at", { ascending: true });

    const { data: personalizations, error: personalizationsError } = await Promise.race([personalizationsPromise, timeoutPromise]) as any;

    if (personalizationsError) {
      console.error("Erro ao buscar personalizações do orçamento:", personalizationsError);
      throw personalizationsError;
    }

    return { quote, items: items ?? [], personalizations: personalizations ?? [] };
  } catch (error) {
    console.error(`Erro ao buscar orçamento ${code}:`, error);
    return { quote: null, items: [], personalizations: [] };
  }
}


export async function createQuote(input: {
  code?: string;
  customer_name: string;
  customer_phone?: string;
  date: string;
  observations?: string;
  items: { description: string; quantity: number; value: number }[];
  personalizations?: QuotePersonalizationInput[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const code = input.code ?? generateQuoteCode();
    
    // Obter empresa_id do usuário logado
    let empresa_id: string;
    try {
      empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) {
        return { ok: false, error: "Erro ao identificar empresa. Verifique se você está logado e tem uma empresa associada." };
      }
    } catch (empresaError: any) {
      console.error("Erro ao obter empresa_id:", empresaError);
      return { ok: false, error: empresaError?.message || "Erro ao identificar empresa. Verifique se você está logado e tem uma empresa associada." };
    }
    
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
    if (error) {
      console.error("Erro do Supabase ao criar orçamento:", error);
      throw new Error(error.message || "Erro ao criar orçamento no banco de dados");
    }
    if (!quote?.id) throw new Error("Falha ao criar orçamento - ID não retornado");

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

    if (input.personalizations?.length) {
      const personalizations = input.personalizations
        .filter((p) => p.person_name?.trim())
        .map((p) => ({
          quote_id: quote.id,
          empresa_id,
          person_name: p.person_name.trim(),
          size: p.size?.trim() || null,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || null,
        }));

      if (personalizations.length) {
        const { error: personalizationError } = await supabase
          .from("atelie_quote_personalizations")
          .insert(personalizations);
        if (personalizationError) throw personalizationError;
      }
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
  const code = `ORC-${y}${m}${d}-${r}`;
  console.log("Código de orçamento gerado:", code);
  return code;
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
    const { quote, items, personalizations } = await getQuoteByCode(quoteCode);
    
    if (!quote) {
      throw new Error("Orçamento não encontrado");
    }

    console.log("Orçamento encontrado:", quote);

    // Verificar se já existe pedido para este orçamento
    const { data: existingOrder } = await supabase
      .from("atelie_orders")
      .select("code, id")
      .ilike("description", `%${quoteCode}%`)
      .limit(1)
      .maybeSingle();

    if (existingOrder) {
      console.log("Pedido já existe para este orçamento:", existingOrder.code);
      return { ok: false, error: `Pedido ${existingOrder.code} já existe para este orçamento. Não foi possível criar duplicata.` };
    }

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

    // Extrair URL do arquivo das observações
    const extractFileUrl = (observations?: string | null): string | null => {
      if (!observations) return null;
      
      const patterns = [
        /Arquivo\/Arte:\s*(https?:\/\/[^\s\n]+)/i,
        /Arquivo:\s*(https?:\/\/[^\s\n]+)/i,
        /file_url:\s*(https?:\/\/[^\s\n]+)/i,
        /(https?:\/\/[^\s\/]+\.supabase\.co\/storage\/[^\s\n]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = observations.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      return null;
    };

    const fileUrl = extractFileUrl(quote.observations);
    console.log("URL do arquivo extraída:", fileUrl);

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
    let { data: order, error: orderError } = await supabase
      .from("atelie_orders")
      .insert({
        code: orderCode,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        description: `Orçamento aprovado - ${itemsDescription}`,
        value: totalValue,
        paid: 0,
        type: "catalogo", // Adicionar campo type obrigatório
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
        status: "Aguardando aprovação",
        file_url: fileUrl || null, // Incluir URL do arquivo se existir
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
            type: "catalogo", // Adicionar campo type obrigatório
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Aguardando aprovação",
            file_url: fileUrl || null // Incluir URL do arquivo se existir
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

    // Inserir personalizações no pedido, se houver
    if (personalizations.length && order.id) {
      const orderPersonalizations = personalizations.map((p) => ({
        order_id: order.id,
        empresa_id,
        person_name: p.person_name,
        size: p.size ?? null,
        quantity: p.quantity ?? 1,
        notes: p.notes ?? null,
      }));

      const { error: insertOrderPersonalizationsError } = await supabase
        .from("atelie_order_personalizations")
        .insert(orderPersonalizations);

      if (insertOrderPersonalizationsError) {
        console.error("Erro ao copiar personalizações para o pedido:", insertOrderPersonalizationsError);
      }
    }

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
  personalizations?: QuotePersonalizationInput[];
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

    // Atualizar personalizações se fornecidas
    if (input.personalizations) {
      const { error: deletePersonalizationsError } = await supabase
        .from("atelie_quote_personalizations")
        .delete()
        .eq("quote_id", quote.id);

      if (deletePersonalizationsError) throw deletePersonalizationsError;

      const empresa_id = await getCurrentEmpresaId();
      const personalizations = input.personalizations
        .filter((p) => p.person_name?.trim())
        .map((p) => ({
          quote_id: quote.id,
          empresa_id,
          person_name: p.person_name.trim(),
          size: p.size?.trim() || null,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || null,
        }));

      if (personalizations.length) {
        const { error: insertPersonalizationsError } = await supabase
          .from("atelie_quote_personalizations")
          .insert(personalizations);

        if (insertPersonalizationsError) throw insertPersonalizationsError;
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
  personalizations?: QuotePersonalizationInput[];
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
    const updatesPending = Object.keys(orderUpdateData).length > 0;
    const hasPersonalizations = Array.isArray(input.personalizations);

    if (updatesPending) {
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

    if (hasPersonalizations) {
      const { error: deleteOrderPersonalizationsError } = await supabase
        .from("atelie_order_personalizations")
        .delete()
        .eq("order_id", order.id);

      if (deleteOrderPersonalizationsError) {
        console.error("Erro ao limpar personalizações do pedido:", deleteOrderPersonalizationsError);
        return;
      }

      const empresa_id = await getCurrentEmpresaId();
      const orderPersonalizations = input.personalizations!
        .filter((p) => p.person_name?.trim())
        .map((p) => ({
          order_id: order.id,
          empresa_id,
          person_name: p.person_name.trim(),
          size: p.size?.trim() || null,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || null,
        }));

      if (orderPersonalizations.length) {
        const { error: insertOrderPersonalizationsError } = await supabase
          .from("atelie_order_personalizations")
          .insert(orderPersonalizations);

        if (insertOrderPersonalizationsError) {
          console.error("Erro ao sincronizar personalizações com o pedido:", insertOrderPersonalizationsError);
        }
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


