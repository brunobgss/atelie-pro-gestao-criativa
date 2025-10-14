import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { checkDatabaseHealth } from "./config";

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  type: string;
  description?: string | null;
  value: number;
  paid: number;
  delivery_date?: string | null;
  status: "Aguardando aprovação" | "Em produção" | "Pronto" | "Aguardando retirada" | "Entregue" | "Cancelado";
  file_url?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  observations?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listOrders(): Promise<OrderRow[]> {
  try {
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return [];
    }

    const { data, error } = await supabase
      .from("atelie_orders")
      .select("id, code, customer_name, customer_phone, type, description, value, paid, delivery_date, status, file_url")
      .order("created_at", { ascending: false })
      .limit(100);
    
    console.log("Pedidos encontrados no banco:", data?.length, "pedidos");
    if (data && data.length > 0) {
      console.log("Primeiro pedido:", { id: data[0].id, code: data[0].code });
    }
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  } catch {
    return [];
  }
}

// Função para detectar se é UUID ou código
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function getOrderByCode(code: string): Promise<OrderRow | null> {
  try {
    console.log("Buscando pedido por código:", code);
    
    if (!code || code.trim() === '') {
      console.error("Código do pedido inválido:", code);
      return null;
    }
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando para pedido:", code);
      return null;
    }

    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    // Detectar se é UUID ou código e buscar adequadamente
    const isUuid = isUUID(code.trim());
    console.log("Tipo de identificador:", isUuid ? "UUID" : "Código");
    
    const fetchPromise = supabase
      .from("atelie_orders")
      .select("*")
      .eq(isUuid ? "id" : "code", code.trim())
      .maybeSingle();

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao buscar pedido:", error);
      return null;
    }
    
    if (!data) {
      console.log("Pedido não encontrado:", code);
      return null;
    }
    
    console.log("Pedido encontrado:", data);
    return data as OrderRow;
  } catch (e: unknown) {
    console.error("Erro ao buscar pedido:", e);
    return null;
  }
}

export async function createOrder(input: {
  code?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  type: string;
  description: string;
  value: number;
  paid?: number;
  delivery_date?: string;
  status?: string;
  observations?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const code = input.code ?? generateOrderCode();
    console.log("Código do pedido gerado:", code);
    
    // Obter empresa_id do usuário logado
    const empresa_id = await getCurrentEmpresaId();
    
    const { data, error } = await supabase
      .from("atelie_orders")
      .insert({
        code,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone ?? null,
        customer_email: input.customer_email ?? null,
        type: input.type,
        description: input.description,
        value: input.value,
        paid: input.paid ?? 0,
        delivery_date: input.delivery_date ?? null,
        status: input.status ?? "Aguardando aprovação",
        observations: input.observations ?? null,
        empresa_id
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar pedido:", error);
      return { ok: false, error: error.message };
    }

    console.log("Pedido criado com sucesso:", data);
    return { ok: true, id: data.id };
  } catch (e: unknown) {
    console.error("Erro ao criar pedido:", e);
    return { ok: false, error: e.message };
  }
}

export async function updateOrderStatus(
  code: string,
  status?: OrderRow['status'],
  paid?: number,
  description?: string
): Promise<{ ok: boolean; data?: OrderRow; error?: string }> {
  try {
    console.log(`Atualizando pedido ${code}:`, { status, paid });
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }
    
    // Preparar dados para atualização
    const updateData: unknown = {
      updated_at: new Date().toISOString()
    };
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (paid !== undefined) {
      updateData.paid = paid;
    }
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const updatePromise = supabase
      .from("atelie_orders")
      .update(updateData)
      .eq("code", code)
      .select()
      .single();

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: error.message };
    }
    
    console.log("Pedido atualizado com sucesso:", data);
    return { ok: true, data: data as OrderRow };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: e.message };
  }
}

export async function updateOrder(
  orderCode: string,
  updates: Partial<{
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    type: string;
    description: string;
    value: number;
    paid: number;
    delivery_date: string;
    status: string;
    observations: string;
  }>
): Promise<{ ok: boolean; data?: OrderRow; error?: string }> {
  try {
    console.log(`Atualizando pedido completo ${orderCode}:`, updates);
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }
    
    // Preparar dados para atualização
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const updatePromise = supabase
      .from("atelie_orders")
      .update(updateData)
      .eq("code", orderCode)
      .select()
      .single();

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: error.message };
    }
    
    console.log("Pedido atualizado com sucesso:", data);
    return { ok: true, data: data as OrderRow };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: e.message };
  }
}

export function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PED-${year}${month}${day}-${random}`;
}