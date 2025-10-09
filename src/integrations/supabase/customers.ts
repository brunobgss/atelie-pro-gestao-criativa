import { supabase } from "./client";

export type CustomerRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export async function createCustomer(input: { name: string; phone?: string; email?: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .insert({ name: input.name, phone: input.phone ?? null, email: input.email ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao criar cliente" };
  }
}


