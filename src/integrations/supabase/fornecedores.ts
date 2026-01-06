import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface Fornecedor {
  id?: string;
  empresa_id?: string;
  nome_fantasia: string;
  razao_social?: string;
  cnpj?: string;
  cpf?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  observacoes?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome_fantasia', { ascending: true });

    if (error) {
      console.error('Erro ao listar fornecedores:', error);
      return [];
    }

    return (data || []) as Fornecedor[];
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    return [];
  }
}

export async function criarFornecedor(fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>): Promise<{ ok: boolean; data?: Fornecedor; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        ...fornecedor,
        empresa_id: empresaId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar fornecedor:', error);
      
      // Tratar erros de constraint única de forma mais amigável
      if (error.code === '23505') { // Violation of unique constraint
        if (error.message?.includes('fornecedores_cnpj_key')) {
          return { ok: false, error: 'Este CNPJ já está cadastrado. Por favor, verifique se o fornecedor já existe ou use um CNPJ diferente.' };
        }
        if (error.message?.includes('fornecedores_cpf_key')) {
          return { ok: false, error: 'Este CPF já está cadastrado. Por favor, verifique se o fornecedor já existe ou use um CPF diferente.' };
        }
        if (error.message?.includes('duplicate key')) {
          return { ok: false, error: 'Já existe um fornecedor com estes dados. Por favor, verifique os dados informados.' };
        }
      }
      
      // Tratar outros erros
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: 'Você não tem permissão para realizar esta ação.' };
      }
      
      return { ok: false, error: error.message || 'Erro ao criar fornecedor' };
    }

    return { ok: true, data: data as Fornecedor };
  } catch (error: any) {
    console.error('Erro ao criar fornecedor:', error);
    return { ok: false, error: error.message || 'Erro ao criar fornecedor' };
  }
}

export async function atualizarFornecedor(id: string, fornecedor: Partial<Fornecedor>): Promise<{ ok: boolean; data?: Fornecedor; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('fornecedores')
      .update({
        ...fornecedor,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      
      // Tratar erros de constraint única de forma mais amigável
      if (error.code === '23505') { // Violation of unique constraint
        if (error.message?.includes('fornecedores_cnpj_key')) {
          return { ok: false, error: 'Este CNPJ já está cadastrado para outro fornecedor. Por favor, use um CNPJ diferente.' };
        }
        if (error.message?.includes('fornecedores_cpf_key')) {
          return { ok: false, error: 'Este CPF já está cadastrado para outro fornecedor. Por favor, use um CPF diferente.' };
        }
        if (error.message?.includes('duplicate key')) {
          return { ok: false, error: 'Já existe outro fornecedor com estes dados. Por favor, verifique os dados informados.' };
        }
      }
      
      // Tratar outros erros
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: 'Você não tem permissão para realizar esta ação.' };
      }
      
      return { ok: false, error: error.message || 'Erro ao atualizar fornecedor' };
    }

    return { ok: true, data: data as Fornecedor };
  } catch (error: any) {
    console.error('Erro ao atualizar fornecedor:', error);
    return { ok: false, error: error.message || 'Erro ao atualizar fornecedor' };
  }
}

export async function deletarFornecedor(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Soft delete (marcar como inativo)
    const { error } = await supabase
      .from('fornecedores')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao deletar fornecedor:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao deletar fornecedor:', error);
    return { ok: false, error: error.message || 'Erro ao deletar fornecedor' };
  }
}

