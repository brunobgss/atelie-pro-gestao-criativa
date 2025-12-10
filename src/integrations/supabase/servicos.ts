import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { ErrorMessages } from "@/utils/errorMessages";

export type ServicoRow = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string | null;
  preco_padrao: number;
  tempo_estimado?: number | null;
  categoria?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function listServicos(filters?: { ativo?: boolean; categoria?: string }): Promise<ServicoRow[]> {
  try {
    const empresa_id = await getCurrentEmpresaId();
    if (!empresa_id) {
      console.error("❌ Erro ao obter empresa do usuário");
      return [];
    }

    let query = supabase
      .from("atelie_servicos")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (filters?.ativo !== undefined) {
      query = query.eq("ativo", filters.ativo);
    }

    if (filters?.categoria) {
      query = query.eq("categoria", filters.categoria);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Erro ao listar serviços:", error);
      return [];
    }

    return data || [];
  } catch (e: unknown) {
    console.error("❌ Erro na função listServicos:", e);
    return [];
  }
}

export async function getServico(id: string): Promise<ServicoRow | null> {
  try {
    const empresa_id = await getCurrentEmpresaId();
    if (!empresa_id) {
      console.error("❌ Erro ao obter empresa do usuário");
      return null;
    }

    const { data, error } = await supabase
      .from("atelie_servicos")
      .select("*")
      .eq("id", id)
      .eq("empresa_id", empresa_id)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar serviço:", error);
      return null;
    }

    return data;
  } catch (e: unknown) {
    console.error("❌ Erro na função getServico:", e);
    return null;
  }
}

export async function createServico(input: {
  nome: string;
  descricao?: string;
  preco_padrao?: number;
  tempo_estimado?: number;
  categoria?: string;
  ativo?: boolean;
}): Promise<{ ok: boolean; id?: string; data?: ServicoRow; error?: string }> {
  try {
    console.log("➕ Criando serviço no banco:", input);

    const empresa_id = await getCurrentEmpresaId();
    if (!empresa_id) {
      console.error("❌ Erro ao obter empresa do usuário");
      return { ok: false, error: ErrorMessages.empresaNotFound() };
    }

    console.log("✅ Empresa encontrada:", empresa_id);

    const { data, error } = await supabase
      .from("atelie_servicos")
      .insert({
        empresa_id: empresa_id,
        nome: input.nome,
        descricao: input.descricao ?? null,
        preco_padrao: input.preco_padrao ?? 0,
        tempo_estimado: input.tempo_estimado ?? null,
        categoria: input.categoria ?? null,
        ativo: input.ativo ?? true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Erro ao criar serviço:", error);
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: ErrorMessages.permissionDenied() };
      }
      throw new Error(ErrorMessages.saveError("o serviço"));
    }

    console.log("✅ Serviço criado com sucesso:", data.id);
    return { ok: true, id: data?.id, data: data };
  } catch (e: unknown) {
    console.error("❌ Erro na função createServico:", e);
    const errorMessage = (e as any)?.message?.includes('⏱️')
      ? (e as any).message
      : ErrorMessages.saveError("o serviço");
    return { ok: false, error: errorMessage };
  }
}

export async function updateServico(
  id: string,
  input: {
    nome?: string;
    descricao?: string;
    preco_padrao?: number;
    tempo_estimado?: number;
    categoria?: string;
    ativo?: boolean;
  }
): Promise<{ ok: boolean; data?: ServicoRow; error?: string }> {
  try {
    console.log("🔍 Atualizando serviço:", { id, input });

    const empresa_id = await getCurrentEmpresaId();
    if (!empresa_id) {
      return { ok: false, error: ErrorMessages.empresaNotFound() };
    }

    // Verificar se o serviço existe e pertence à empresa
    const { data: existingServico, error: fetchError } = await supabase
      .from("atelie_servicos")
      .select("id, nome")
      .eq("id", id)
      .eq("empresa_id", empresa_id)
      .single();

    if (fetchError || !existingServico) {
      console.error("❌ Serviço não encontrado:", fetchError);
      return { ok: false, error: "Serviço não encontrado" };
    }

    const updateData: {
      nome?: string;
      descricao?: string | null;
      preco_padrao?: number;
      tempo_estimado?: number | null;
      categoria?: string | null;
      ativo?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.nome !== undefined) updateData.nome = input.nome;
    if (input.descricao !== undefined) updateData.descricao = input.descricao || null;
    if (input.preco_padrao !== undefined) updateData.preco_padrao = input.preco_padrao;
    if (input.tempo_estimado !== undefined) updateData.tempo_estimado = input.tempo_estimado || null;
    if (input.categoria !== undefined) updateData.categoria = input.categoria || null;
    if (input.ativo !== undefined) updateData.ativo = input.ativo;

    const { data, error } = await supabase
      .from("atelie_servicos")
      .update(updateData)
      .eq("id", id)
      .eq("empresa_id", empresa_id)
      .select("*")
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar serviço:", error);
      return { ok: false, error: error.message || "Erro ao atualizar serviço" };
    }

    console.log("✅ Serviço atualizado com sucesso");
    return { ok: true, data: data };
  } catch (e: unknown) {
    console.error("❌ Erro na função updateServico:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao atualizar serviço" };
  }
}

export async function deleteServico(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresa_id = await getCurrentEmpresaId();
    if (!empresa_id) {
      return { ok: false, error: ErrorMessages.empresaNotFound() };
    }

    const { error } = await supabase
      .from("atelie_servicos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresa_id);

    if (error) {
      console.error("❌ Erro ao deletar serviço:", error);
      return { ok: false, error: error.message || "Erro ao deletar serviço" };
    }

    console.log("✅ Serviço deletado com sucesso");
    return { ok: true };
  } catch (e: unknown) {
    console.error("❌ Erro na função deleteServico:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao deletar serviço" };
  }
}

