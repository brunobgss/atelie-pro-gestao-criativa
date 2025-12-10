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
  status: "Aguardando aprovação" | "Em produção" | "Finalizando" | "Pronto" | "Aguardando retirada" | "Entregue" | "Cancelado";
  file_url?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  observations?: string | null;
  created_at?: string;
  updated_at?: string;
  empresa_id?: string | null;
  personalizations?: OrderPersonalizationRow[];
};

export type OrderPersonalizationRow = {
  id: string;
  order_id: string;
  empresa_id: string;
  person_name: string;
  size?: string | null;
  quantity: number;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrderPersonalizationInput = {
  person_name: string;
  size?: string;
  quantity: number;
  notes?: string;
};

export async function listOrders(): Promise<OrderRow[]> {
  try {
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
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return [];
    }

    const { data, error } = await (supabase
      .from("atelie_orders" as any)
      .select("id, code, customer_name, customer_phone, type, description, value, paid, delivery_date, status, file_url, created_at")
      .eq("empresa_id", userEmpresa.empresa_id)
      .neq("status", "Cancelado") // Excluir pedidos cancelados das listagens
      .order("created_at", { ascending: false })
      .limit(500) as any); // Aumentar limite para garantir que todos os pedidos sejam buscados
    
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

function resolveOrderFilter(identifier: string): { column: "id" | "code"; value: string } {
  const value = identifier.trim();
  const column = isUUID(value) ? "id" : "code";
  return { column, value };
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
    
    const fetchPromise = (supabase
      .from("atelie_orders" as any)
      .select("*")
      .eq(isUuid ? "id" : "code", code.trim())
      .maybeSingle() as any);

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

    const personalizationsPromise = (supabase
      .from("atelie_order_personalizations" as any)
      .select("id, order_id, empresa_id, person_name, size, quantity, notes, created_at, updated_at")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true }) as any);

    const personalizationsResult = await Promise.race([personalizationsPromise, timeoutPromise]) as any;
    const personalizationsError = personalizationsResult?.error;
    const personalizationsData = personalizationsResult?.data as OrderPersonalizationRow[] | undefined;

    if (personalizationsError) {
      console.error("Erro ao buscar personalizações do pedido:", personalizationsError);
      throw personalizationsError;
    }

    return {
      ...(data as OrderRow),
      personalizations: personalizationsData ?? [],
    };
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
  file_url?: string;
  personalizations?: OrderPersonalizationInput[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const code = input.code ?? generateOrderCode();
    console.log("Código do pedido gerado:", code);
    
    // Obter empresa_id do usuário logado
    const empresa_id = await getCurrentEmpresaId();
    
    const { data, error } = await (supabase
      .from("atelie_orders" as any)
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
        file_url: input.file_url ?? null,
        empresa_id
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Erro ao criar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao criar pedido" };
    }

    console.log("Pedido criado com sucesso:", data);

    const orderData = data as any;
    if (input.personalizations?.length && orderData?.id) {
      const personalizations = input.personalizations
        .filter((p) => p.person_name?.trim())
        .map((p) => ({
          order_id: orderData.id,
          empresa_id,
          person_name: p.person_name.trim(),
          size: p.size?.trim() || null,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || null,
        }));

      if (personalizations.length) {
        const { error: personalizationsError } = await (supabase
          .from("atelie_order_personalizations" as any)
          .insert(personalizations) as any);

        if (personalizationsError) {
          console.error("Erro ao salvar personalizações do pedido:", personalizationsError);
        }
      }
    }

    // SINCRONIZAÇÃO: Criar receita imediatamente se houver valor pago
    if (input.paid && input.paid > 0 && orderData?.code) {
      console.log("Criando receita automaticamente para pedido:", orderData.code);
      try {
        const { error: receitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: orderData.code,
            customer_name: input.customer_name || "Sem nome",
            description: `Pagamento do pedido ${orderData.code}`,
            amount: input.paid,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: "realizada",
            empresa_id: empresa_id,
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (receitaError) {
          console.error("Erro ao criar receita automaticamente:", receitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada automaticamente com sucesso");
        }
      } catch (receitaErr: any) {
        console.error("Erro ao criar receita:", receitaErr);
        // Não falhar aqui, apenas logar
      }
    }

    return { ok: true, id: orderData.id };
  } catch (e: unknown) {
    console.error("Erro ao criar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao criar pedido" };
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
    
    if (!code || code.trim() === "") {
      console.error("Identificador do pedido inválido");
      return { ok: false, error: "Pedido inválido" };
    }

    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();

    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }

    const { column, value } = resolveOrderFilter(code);

    // Preparar dados para atualização
    const updateData: Partial<OrderRow> & { updated_at: string } = {
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

    const updatePromise = (supabase
      .from("atelie_orders" as any)
      .update(updateData)
      .eq(column, value)
      .select()
      .single() as any);

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao atualizar pedido" };
    }
    
    if (!data) {
      console.error("Pedido não encontrado para atualização", { code, column, value });
      return { ok: false, error: "Pedido não encontrado" };
    }

    const updatedOrder = data as OrderRow;
    const effectiveOrderCode = updatedOrder.code;

    // Se o campo 'paid' foi alterado, atualizar também a tabela de receitas
    if (paid !== undefined) {
      console.log("Campo 'paid' foi alterado, atualizando tabela de receitas...");

      // Buscar se já existe receita para este pedido
      const { data: existingReceita } = await (supabase
        .from("atelie_receitas" as any)
        .select("id")
        .eq("order_code", effectiveOrderCode)
        .maybeSingle() as any);

      if (existingReceita) {
        // Atualizar receita existente
        const { error: updateReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .update({ 
            amount: paid,
            updated_at: new Date().toISOString()
          })
          .eq("order_code", effectiveOrderCode) as any);

        if (updateReceitaError) {
          console.error("Erro ao atualizar receita:", updateReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita atualizada com sucesso");
        }
      } else if (updatedOrder.empresa_id) {
        // Criar nova receita com todos os campos obrigatórios
        const { error: createReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: effectiveOrderCode,
            customer_name: updatedOrder.customer_name || "Sem nome",
            description: `Pagamento do pedido ${effectiveOrderCode}`,
            amount: paid,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: paid > 0 ? "pago" : "pendente",
            empresa_id: updatedOrder.empresa_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (createReceitaError) {
          console.error("Erro ao criar receita:", createReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada com sucesso");
        }
      }
    }

    console.log("Pedido atualizado com sucesso:", updatedOrder);
    return { ok: true, data: updatedOrder };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao atualizar pedido" };
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
    file_url: string;
    personalizations: OrderPersonalizationInput[];
  }>
): Promise<{ ok: boolean; data?: OrderRow; error?: string }> {
  try {
    console.log(`Atualizando pedido completo ${orderCode}:`, updates);
    
    if (!orderCode || orderCode.trim() === "") {
      console.error("Identificador do pedido inválido");
      return { ok: false, error: "Pedido inválido" };
    }

    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();

    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }

    const { column, value } = resolveOrderFilter(orderCode);

    const { personalizations, ...restUpdates } = updates ?? {};

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(restUpdates ?? {}).filter(([, v]) => v !== undefined)
    ) as typeof restUpdates;

    // Preparar dados para atualização
    const updateData = {
      ...sanitizedUpdates,
      updated_at: new Date().toISOString()
    };

    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const updatePromise = (supabase
      .from("atelie_orders" as any)
      .update(updateData)
      .eq(column, value)
      .select()
      .single() as any);

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao atualizar pedido" };
    }

    if (!data) {
      console.error("Pedido não encontrado para atualização", { orderCode, column, value });
      return { ok: false, error: "Pedido não encontrado" };
    }

    const updatedOrder = data as OrderRow;
    const effectiveOrderCode = updatedOrder.code;
    const paidValue = sanitizedUpdates.paid;

    // Se o campo 'paid' foi alterado, atualizar também a tabela de receitas
    if (paidValue !== undefined) {
      console.log("Campo 'paid' foi alterado, atualizando tabela de receitas...");

      // Buscar se já existe receita para este pedido
      const { data: existingReceita } = await (supabase
        .from("atelie_receitas" as any)
        .select("id")
        .eq("order_code", effectiveOrderCode)
        .maybeSingle() as any);

      if (existingReceita) {
        // Atualizar receita existente
        const { error: updateReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .update({ 
            amount: paidValue,
            updated_at: new Date().toISOString()
          })
          .eq("order_code", effectiveOrderCode) as any);

        if (updateReceitaError) {
          console.error("Erro ao atualizar receita:", updateReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita atualizada com sucesso");
        }
      } else if (updatedOrder.empresa_id) {
        // Criar nova receita com todos os campos obrigatórios
        const { error: createReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: effectiveOrderCode,
            customer_name: updatedOrder.customer_name || "Sem nome",
            description: `Pagamento do pedido ${effectiveOrderCode}`,
            amount: paidValue,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: paidValue > 0 ? "pago" : "pendente",
            empresa_id: updatedOrder.empresa_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (createReceitaError) {
          console.error("Erro ao criar receita:", createReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada com sucesso");
        }
      }
    }

    if (personalizations && updatedOrder.id) {
      console.log("Atualizando personalizações do pedido:", personalizations.length);

      const { error: deletePersonalizationsError } = await (supabase
        .from("atelie_order_personalizations" as any)
        .delete()
        .eq("order_id", updatedOrder.id) as any);

      if (deletePersonalizationsError) {
        console.error("Erro ao remover personalizações do pedido:", deletePersonalizationsError);
      } else if (personalizations.length) {
        const empresa_id = updatedOrder.empresa_id ?? (await getCurrentEmpresaId());
        const sanitizedPersonalizations = personalizations
          .filter((p) => p.person_name?.trim())
          .map((p) => ({
            order_id: updatedOrder.id,
            empresa_id,
            person_name: p.person_name.trim(),
            size: p.size?.trim() || null,
            quantity: p.quantity ?? 1,
            notes: p.notes?.trim() || null,
          }));

        if (sanitizedPersonalizations.length) {
          const { error: insertPersonalizationsError } = await (supabase
            .from("atelie_order_personalizations" as any)
            .insert(sanitizedPersonalizations) as any);

          if (insertPersonalizationsError) {
            console.error("Erro ao salvar personalizações do pedido:", insertPersonalizationsError);
          }
        }
      }
    }

    const { data: orderPersonalizations, error: personalizationsError } = await (supabase
      .from("atelie_order_personalizations" as any)
      .select("id, order_id, empresa_id, person_name, size, quantity, notes, created_at, updated_at")
      .eq("order_id", updatedOrder.id)
      .order("created_at", { ascending: true }) as any);

    if (personalizationsError) {
      console.error("Erro ao carregar personalizações atualizadas:", personalizationsError);
    } else {
      updatedOrder.personalizations = orderPersonalizations ?? [];
    }

    console.log("Pedido atualizado com sucesso:", updatedOrder);
    return { ok: true, data: updatedOrder };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao atualizar pedido" };
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