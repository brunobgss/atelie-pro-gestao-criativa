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

    // Limpar valores vazios para evitar conflitos com constraints únicas
    // Campos opcionais com valores vazios devem ser null, não string vazia
    const cleanValue = (value: string | undefined | null): string | null => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };

    const cleanedFornecedor = {
      ...fornecedor,
      cnpj: cleanValue(fornecedor.cnpj),
      cpf: cleanValue(fornecedor.cpf),
      email: cleanValue(fornecedor.email),
      telefone: cleanValue(fornecedor.telefone),
      celular: cleanValue(fornecedor.celular),
      razao_social: cleanValue(fornecedor.razao_social),
      inscricao_estadual: cleanValue(fornecedor.inscricao_estadual),
      endereco_logradouro: cleanValue(fornecedor.endereco_logradouro),
      endereco_numero: cleanValue(fornecedor.endereco_numero),
      endereco_complemento: cleanValue(fornecedor.endereco_complemento),
      endereco_bairro: cleanValue(fornecedor.endereco_bairro),
      endereco_cidade: cleanValue(fornecedor.endereco_cidade),
      endereco_uf: cleanValue(fornecedor.endereco_uf),
      endereco_cep: cleanValue(fornecedor.endereco_cep),
      observacoes: cleanValue(fornecedor.observacoes),
    };

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        ...cleanedFornecedor,
        empresa_id: empresaId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar fornecedor:', error);
      console.error('Detalhes do erro:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fornecedorData: {
          nome_fantasia: fornecedor.nome_fantasia,
          cnpj: fornecedor.cnpj,
          cpf: fornecedor.cpf,
          email: fornecedor.email,
          telefone: fornecedor.telefone,
          celular: fornecedor.celular
        }
      });
      
      // Tratar erros de constraint única de forma mais amigável
      if (error.code === '23505') { // Violation of unique constraint
        const errorMessage = error.message?.toLowerCase() || '';
        const errorDetails = error.details?.toLowerCase() || '';
        const errorHint = error.hint?.toLowerCase() || '';
        const fullErrorText = `${errorMessage} ${errorDetails} ${errorHint}`;
        
        console.log('🔍 Erro de constraint única detectado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullErrorText,
          fornecedorData: {
            cnpj: cleanedFornecedor.cnpj,
            cpf: cleanedFornecedor.cpf,
            email: cleanedFornecedor.email,
            telefone: cleanedFornecedor.telefone,
            celular: cleanedFornecedor.celular
          }
        });
        
        // Verificar CNPJ (mais específico primeiro)
        if (fullErrorText.includes('fornecedores_cnpj') || fullErrorText.includes('cnpj_key') || 
            (fullErrorText.includes('cnpj') && (fullErrorText.includes('unique') || fullErrorText.includes('duplicate')))) {
          return { ok: false, error: 'Este CNPJ já está cadastrado. Por favor, verifique se o fornecedor já existe na lista ou use um CNPJ diferente.' };
        }
        
        // Verificar CPF (mais específico primeiro)
        if (fullErrorText.includes('fornecedores_cpf') || fullErrorText.includes('cpf_key') || 
            (fullErrorText.includes('cpf') && (fullErrorText.includes('unique') || fullErrorText.includes('duplicate')))) {
          return { ok: false, error: 'Este CPF já está cadastrado. Por favor, verifique se o fornecedor já existe na lista ou use um CPF diferente.' };
        }
        
        // Verificar email (caso tenha constraint única)
        if (fullErrorText.includes('fornecedores_email') || fullErrorText.includes('email_key') || 
            (fullErrorText.includes('email') && (fullErrorText.includes('unique') || fullErrorText.includes('duplicate')))) {
          return { ok: false, error: 'Este email já está cadastrado. Por favor, verifique se o fornecedor já existe na lista ou use um email diferente.' };
        }
        
        // Verificar telefone (caso tenha constraint única)
        if (fullErrorText.includes('fornecedores_telefone') || fullErrorText.includes('telefone_key') || 
            (fullErrorText.includes('telefone') && (fullErrorText.includes('unique') || fullErrorText.includes('duplicate')))) {
          return { ok: false, error: 'Este telefone já está cadastrado. Por favor, verifique se o fornecedor já existe na lista ou use um telefone diferente.' };
        }
        
        // Verificar celular (caso tenha constraint única)
        if (fullErrorText.includes('fornecedores_celular') || fullErrorText.includes('celular_key') || 
            (fullErrorText.includes('celular') && (fullErrorText.includes('unique') || fullErrorText.includes('duplicate')))) {
          return { ok: false, error: 'Este celular já está cadastrado. Por favor, verifique se o fornecedor já existe na lista ou use um celular diferente.' };
        }
        
        // Mensagem genérica mais útil - tentar identificar qual campo está duplicado
        if (fullErrorText.includes('duplicate key') || fullErrorText.includes('unique constraint')) {
          // Verificar se há dados duplicados baseado nos campos preenchidos
          if (cleanedFornecedor.cnpj) {
            return { ok: false, error: 'Já existe um fornecedor cadastrado com este CNPJ. Por favor, verifique a lista de fornecedores ou use um CNPJ diferente.' };
          }
          if (cleanedFornecedor.cpf) {
            return { ok: false, error: 'Já existe um fornecedor cadastrado com este CPF. Por favor, verifique a lista de fornecedores ou use um CPF diferente.' };
          }
          if (cleanedFornecedor.email) {
            return { ok: false, error: 'Já existe um fornecedor cadastrado com este email. Por favor, verifique a lista de fornecedores ou use um email diferente.' };
          }
          if (cleanedFornecedor.telefone) {
            return { ok: false, error: 'Já existe um fornecedor cadastrado com este telefone. Por favor, verifique a lista de fornecedores ou use um telefone diferente.' };
          }
          if (cleanedFornecedor.celular) {
            return { ok: false, error: 'Já existe um fornecedor cadastrado com este celular. Por favor, verifique a lista de fornecedores ou use um celular diferente.' };
          }
          return { ok: false, error: 'Já existe um fornecedor cadastrado com estes dados. Por favor, verifique a lista de fornecedores e os dados informados (CNPJ, CPF, email ou telefone podem estar duplicados).' };
        }
      }
      
      // Tratar outros erros
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: 'Você não tem permissão para realizar esta ação. Verifique se você está logado corretamente.' };
      }
      
      return { ok: false, error: error.message || 'Erro ao criar fornecedor. Tente novamente ou entre em contato com o suporte.' };
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
      console.error('Detalhes do erro:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fornecedorData: fornecedor
      });
      
      // Tratar erros de constraint única de forma mais amigável
      if (error.code === '23505') { // Violation of unique constraint
        const errorMessage = error.message?.toLowerCase() || '';
        const errorDetails = error.details?.toLowerCase() || '';
        const errorHint = error.hint?.toLowerCase() || '';
        const fullErrorText = `${errorMessage} ${errorDetails} ${errorHint}`;
        
        // Verificar CNPJ
        if (fullErrorText.includes('cnpj') || fullErrorText.includes('fornecedores_cnpj')) {
          return { ok: false, error: 'Este CNPJ já está cadastrado para outro fornecedor. Por favor, use um CNPJ diferente ou verifique a lista de fornecedores.' };
        }
        
        // Verificar CPF
        if (fullErrorText.includes('cpf') || fullErrorText.includes('fornecedores_cpf')) {
          return { ok: false, error: 'Este CPF já está cadastrado para outro fornecedor. Por favor, use um CPF diferente ou verifique a lista de fornecedores.' };
        }
        
        // Verificar email (caso tenha constraint única)
        if (fullErrorText.includes('email') || fullErrorText.includes('fornecedores_email')) {
          return { ok: false, error: 'Este email já está cadastrado para outro fornecedor. Por favor, use um email diferente ou verifique a lista de fornecedores.' };
        }
        
        // Verificar telefone (caso tenha constraint única)
        if (fullErrorText.includes('telefone') || fullErrorText.includes('fornecedores_telefone')) {
          return { ok: false, error: 'Este telefone já está cadastrado para outro fornecedor. Por favor, use um telefone diferente ou verifique a lista de fornecedores.' };
        }
        
        // Verificar celular (caso tenha constraint única)
        if (fullErrorText.includes('celular') || fullErrorText.includes('fornecedores_celular')) {
          return { ok: false, error: 'Este celular já está cadastrado para outro fornecedor. Por favor, use um celular diferente ou verifique a lista de fornecedores.' };
        }
        
        // Mensagem genérica mais útil
        if (fullErrorText.includes('duplicate key') || fullErrorText.includes('unique constraint')) {
          if (fornecedor.cnpj) {
            return { ok: false, error: 'Já existe outro fornecedor cadastrado com este CNPJ. Por favor, verifique a lista de fornecedores ou use um CNPJ diferente.' };
          }
          if (fornecedor.cpf) {
            return { ok: false, error: 'Já existe outro fornecedor cadastrado com este CPF. Por favor, verifique a lista de fornecedores ou use um CPF diferente.' };
          }
          return { ok: false, error: 'Já existe outro fornecedor cadastrado com estes dados. Por favor, verifique a lista de fornecedores e os dados informados (CNPJ, CPF, email ou telefone podem estar duplicados).' };
        }
      }
      
      // Tratar outros erros
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        return { ok: false, error: 'Você não tem permissão para realizar esta ação. Verifique se você está logado corretamente.' };
      }
      
      return { ok: false, error: error.message || 'Erro ao atualizar fornecedor. Tente novamente ou entre em contato com o suporte.' };
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

