import { supabase } from "./client";

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
  value: number;
};

export async function listQuotes(): Promise<QuoteRow[]> {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, code, customer_name, customer_phone, date, observations")
      .order("date", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    // Fallback mock
    return [
      { id: "mock-1", code: "ORC-001", customer_name: "Roberto Alves", customer_phone: null, date: "2025-10-08", observations: "Valores válidos por 7 dias." },
      { id: "mock-2", code: "ORC-002", customer_name: "Escola Municipal", customer_phone: null, date: "2025-10-07", observations: null },
      { id: "mock-3", code: "ORC-003", customer_name: "Mariana Souza", customer_phone: null, date: "2025-10-09", observations: null },
    ];
  }
}

export async function getQuoteByCode(code: string): Promise<{ quote: QuoteRow | null; items: QuoteItemRow[] }> {
  try {
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, code, customer_name, customer_phone, date, observations")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!quote) return { quote: null, items: [] };

    const { data: items, error: itemsError } = await supabase
      .from("quote_items")
      .select("id, quote_id, description, quantity, value")
      .eq("quote_id", quote.id)
      .order("id", { ascending: true });
    if (itemsError) throw itemsError;
    return { quote, items: items ?? [] };
  } catch {
    // Fallback mock to ORC-001
    if (code !== "ORC-001") return { quote: null, items: [] };
    const quote: QuoteRow = {
      id: "mock-1",
      code: "ORC-001",
      customer_name: "Roberto Alves",
      customer_phone: null,
      date: "2025-10-08",
      observations: "Valores válidos por 7 dias.",
    };
    const items: QuoteItemRow[] = [
      { id: "i1", quote_id: "mock-1", description: "Camiseta bordada - modelo A", quantity: 50, value: 20 },
      { id: "i2", quote_id: "mock-1", description: "Camiseta bordada - modelo B", quantity: 50, value: 30 },
    ];
    return { quote, items };
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
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        code,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone ?? null,
        date: input.date,
        observations: input.observations ?? null,
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
        value: it.value,
      }));
      const { error: itemsError } = await supabase.from("quote_items").insert(items);
      if (itemsError) throw itemsError;
    }

    return { ok: true, id: code };
  } catch (e: any) {
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


