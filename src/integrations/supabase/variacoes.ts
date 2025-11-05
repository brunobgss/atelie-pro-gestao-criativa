import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface VariacaoProduto {
  id?: string;
  produto_id: string;
  empresa_id?: string;
  tipo_variacao: 'tamanho' | 'cor' | 'modelo' | 'outro';
  valor: string;
  codigo_barras?: string;
  sku?: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_venda?: number;
  preco_custo?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function listarVariacoes(produtoId?: string): Promise<VariacaoProduto[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from('produto_variacoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('tipo_variacao', { ascending: true })
      .order('valor', { ascending: true });

    if (produtoId) {
      query = query.eq('produto_id', produtoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar variações:', error);
      return [];
    }

    return (data || []) as VariacaoProduto[];
  } catch (error) {
    console.error('Erro ao listar variações:', error);
    return [];
  }
}

export async function criarVariacao(variacao: Omit<VariacaoProduto, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>): Promise<{ ok: boolean; data?: VariacaoProduto; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('produto_variacoes')
      .insert({
        ...variacao,
        empresa_id: empresaId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar variação:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as VariacaoProduto };
  } catch (error: any) {
    console.error('Erro ao criar variação:', error);
    return { ok: false, error: error.message || 'Erro ao criar variação' };
  }
}

export async function atualizarVariacao(id: string, variacao: Partial<VariacaoProduto>): Promise<{ ok: boolean; data?: VariacaoProduto; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('produto_variacoes')
      .update({
        ...variacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar variação:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as VariacaoProduto };
  } catch (error: any) {
    console.error('Erro ao atualizar variação:', error);
    return { ok: false, error: error.message || 'Erro ao atualizar variação' };
  }
}

export async function deletarVariacao(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { error } = await supabase
      .from('produto_variacoes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao deletar variação:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao deletar variação:', error);
    return { ok: false, error: error.message || 'Erro ao deletar variação' };
  }
}

