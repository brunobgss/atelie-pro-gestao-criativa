import { supabase } from "./client";

export async function uploadOrderFile(file: File, orderCode: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    console.log("Iniciando upload do arquivo:", file.name, "para pedido:", orderCode);
    
    const bucket = "orders"; // crie este bucket no Supabase Storage
    const path = `${orderCode}/${Date.now()}-${file.name}`;
    
    console.log("Upload para bucket:", bucket, "path:", path);
    
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { 
      upsert: true, 
      cacheControl: "3600" 
    });
    
    if (error) {
      console.error("Erro no upload:", error);
      
      // Se for erro de RLS ou bucket não existe, retornar erro mas não falhar o pedido
      if (error.message.includes('row-level security policy') || 
          error.message.includes('Bucket not found') ||
          error.message.includes('not found')) {
        console.log("Bucket não configurado ou erro de RLS, continuando sem arquivo");
        return { ok: false, error: "Upload não disponível - pedido será criado sem arquivo" };
      }
      
      throw error;
    }
    
    console.log("Upload realizado com sucesso:", data);
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log("URL pública gerada:", urlData.publicUrl);
    
    return { ok: true, url: urlData.publicUrl };
  } catch (e: any) {
    console.error("Erro no upload:", e);
    return { ok: false, error: e?.message ?? "Falha no upload" };
  }
}


