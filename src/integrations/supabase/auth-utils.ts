import { supabase } from "./client";
import { checkDatabaseHealth } from "./config";

// Função para obter o empresa_id do usuário logado
export async function getCurrentEmpresaId(): Promise<string> {
  try {
    console.log("Buscando empresa_id do usuário...");
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("Usuário não logado, buscando primeira empresa disponível");
      // Buscar primeira empresa disponível
      const { data: empresas, error: empresasError } = await supabase
        .from("empresas")
        .select("id")
        .limit(1)
        .single();
      
      if (empresasError) {
        console.error("Erro ao buscar empresa:", empresasError);
        throw new Error("Erro ao buscar empresa");
      }
      
      if (empresas?.id) {
        console.log("Empresa encontrada:", empresas.id);
        return empresas.id;
      }
      
      throw new Error("Nenhuma empresa encontrada");
    }

    console.log("Usuário logado:", user.id);
    
    // Buscar empresa do usuário
    const { data, error } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      console.log("Usuário não tem empresa associada, buscando primeira empresa disponível");
      // Buscar primeira empresa disponível
      const { data: empresas, error: empresasError } = await supabase
        .from("empresas")
        .select("id")
        .limit(1)
        .single();
      
      if (empresasError) {
        console.error("Erro ao buscar empresa:", empresasError);
        throw new Error("Erro ao buscar empresa");
      }
      
      if (empresas?.id) {
        console.log("Empresa encontrada:", empresas.id);
        return empresas.id;
      }
      
      throw new Error("Nenhuma empresa encontrada");
    }

    console.log("Empresa do usuário encontrada:", data.empresa_id);
    return data.empresa_id;
  } catch (error) {
    console.error("Erro ao obter empresa_id:", error);
    throw error;
  }
}

// Função para verificar se o usuário tem acesso a uma empresa
export async function hasAccessToEmpresa(empresaId: string): Promise<boolean> {
  try {
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      // Se o banco não está funcionando, retornar false
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data, error } = await supabase
      .from("user_empresas")
      .select("id")
      .eq("user_id", user.id)
      .eq("empresa_id", empresaId)
      .single();

    return !error && !!data;
  } catch (error) {
    // Em caso de erro, retornar false
    return false;
  }
}
