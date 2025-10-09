import { supabase } from "./client";

export async function uploadOrderFile(file: File, orderCode: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const bucket = "orders"; // crie este bucket no Supabase Storage
    const path = `${orderCode}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Falha no upload" };
  }
}


