import { supabase } from "./client";

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  type: string;
  description?: string | null;
  value: number;
  paid: number;
  delivery_date?: string | null;
  status: "Aguardando aprovação" | "Em produção" | "Pronto" | "Aguardando retirada";
  file_url?: string | null;
};

export async function listOrders(): Promise<OrderRow[]> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, code, customer_name, type, description, value, paid, delivery_date, status, file_url")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  } catch {
    return [
      { id: "m1", code: "PED-001", customer_name: "Maria Silva", type: "Bordado Computadorizado", description: "Logo empresa em 50 camisetas", value: 850, paid: 425, delivery_date: "2025-10-12", status: "Em produção", file_url: null },
      { id: "m2", code: "PED-002", customer_name: "João Santos", type: "Uniforme Escolar", description: "15 uniformes tam. P-M-G", value: 1200, paid: 1200, delivery_date: "2025-10-10", status: "Pronto", file_url: null },
      { id: "m3", code: "PED-003", customer_name: "Ana Costa", type: "Personalizado", description: "Toalhinhas com bordado nome", value: 320, paid: 160, delivery_date: "2025-10-15", status: "Aguardando aprovação", file_url: null },
      { id: "m4", code: "PED-004", customer_name: "Pedro Oliveira", type: "Camiseta Estampada", description: "30 camisetas estampa personalizada", value: 600, paid: 300, delivery_date: "2025-10-13", status: "Em produção", file_url: null },
    ];
  }
}

export async function getOrderByCode(code: string): Promise<OrderRow | null> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, code, customer_name, type, description, value, paid, delivery_date, status, file_url")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    return (data as OrderRow) ?? null;
  } catch {
    return (await listOrders()).find((o) => o.code === code) ?? null;
  }
}

export function generateOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900 + 100);
  return `PED-${y}${m}${d}-${r}`;
}

export async function createOrder(input: {
  code?: string;
  customer_name: string;
  type: string;
  description?: string;
  value: number;
  paid?: number;
  delivery_date?: string;
  status?: OrderRow["status"];
  file_url?: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    const code = input.code ?? generateOrderCode();
    const { error } = await supabase.from("orders").insert({
      code,
      customer_name: input.customer_name,
      type: input.type,
      description: input.description ?? null,
      value: input.value,
      paid: input.paid ?? 0,
      delivery_date: input.delivery_date ?? null,
      status: input.status ?? "Aguardando aprovação",
      file_url: input.file_url ?? null,
    });
    if (error) throw error;
    return { ok: true, code };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao criar pedido" };
  }
}


