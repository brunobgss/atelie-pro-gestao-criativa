import { supabase } from "./client";
import { checkDatabaseHealth } from "./config";

// Função para obter o empresa_id do usuário logado
export async function getCurrentEmpresaId(): Promise<string> {
  try {
    console.log("Buscando empresa_id do usuário...");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Erro ao obter usuário:", userError);
      throw new Error("Erro ao verificar autenticação. Por favor, faça login novamente.");
    }
    
    if (!user) {
      console.log("Usuário não logado - acesso negado");
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    console.log("Usuário logado:", user.id);
    
    // Buscar empresa do usuário
    const { data, error } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar empresa do usuário:", error);
      // Se for erro de RLS, dar mensagem mais clara
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        throw new Error("Erro de permissão ao acessar dados da empresa. Entre em contato com o suporte.");
      }
      // Se não encontrou registro, pode ser que o usuário não tenha empresa associada
      if (error.code === 'PGRST116') {
        throw new Error("Usuário não tem empresa associada. Entre em contato com o suporte para vincular uma empresa.");
      }
      throw new Error(`Erro ao buscar empresa: ${error.message || 'Erro desconhecido'}`);
    }

    if (!data || !data.empresa_id) {
      console.log("Usuário não tem empresa associada - acesso negado");
      throw new Error("Usuário não tem empresa associada. Entre em contato com o suporte para vincular uma empresa.");
    }

    console.log("Empresa do usuário encontrada:", data.empresa_id);
    return data.empresa_id;
  } catch (error: any) {
    console.error("Erro ao obter empresa_id:", error);
    // Re-throw com mensagem melhorada se ainda não tiver
    if (error.message) {
      throw error;
    }
    throw new Error("Erro ao identificar empresa. Tente fazer logout e login novamente.");
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
