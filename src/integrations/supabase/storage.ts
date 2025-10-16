import { supabase } from "./client";

export async function uploadOrderFile(file: File, orderCode: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    console.log("Iniciando upload do arquivo:", file.name, "para pedido:", orderCode);
    
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Usuário não autenticado");
      return { ok: false, error: "Usuário não autenticado" };
    }
    
    const bucket = "orders";
    const path = `${orderCode}/${Date.now()}-${file.name}`;
    
    console.log("Upload para bucket:", bucket, "path:", path);
    console.log("Usuário autenticado:", user.id);
    
    // Verificar se o bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error("Erro ao listar buckets:", bucketError);
    } else {
      console.log("Buckets disponíveis:", buckets?.map(b => b.id));
    }
    
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { 
      upsert: true, 
      cacheControl: "3600" 
    });
    
    if (error) {
      console.error("Erro no upload:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      });
      
      // Se for erro de RLS ou bucket não existe, retornar erro mas não falhar o pedido
      if (error.message.includes('row-level security policy') || 
          error.message.includes('Bucket not found') ||
          error.message.includes('not found') ||
          error.message.includes('permission denied') ||
          error.message.includes('unauthorized')) {
        console.log("Bucket não configurado ou erro de RLS, continuando sem arquivo");
        return { ok: false, error: "Upload não disponível - pedido será criado sem arquivo" };
      }
      
      throw error;
    }
    
    console.log("Upload realizado com sucesso:", data);
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log("URL pública gerada:", urlData.publicUrl);
    
    return { ok: true, url: urlData.publicUrl };
  } catch (e: unknown) {
    console.error("Erro no upload:", e);
    return { ok: false, error: e?.message ?? "Falha no upload" };
  }
}


