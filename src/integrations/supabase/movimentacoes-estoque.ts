import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface MovimentacaoEstoque {
  id?: string;
  empresa_id?: string;
  produto_id?: string;
  variacao_id?: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'perda' | 'devolucao';
  quantidade: number;
  quantidade_anterior?: number;
  quantidade_atual?: number;
  motivo?: string;
  origem?: string;
  origem_id?: string;
  lote?: string;
  data_validade?: string;
  valor_unitario?: number;
  usuario_id?: string;
  created_at?: string;
}

export async function listarMovimentacoes(filtros?: {
  produto_id?: string;
  variacao_id?: string;
  tipo_movimentacao?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<MovimentacaoEstoque[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (filtros?.produto_id) {
      query = query.eq('produto_id', filtros.produto_id);
    }

    if (filtros?.variacao_id) {
      query = query.eq('variacao_id', filtros.variacao_id);
    }

    if (filtros?.tipo_movimentacao) {
      query = query.eq('tipo_movimentacao', filtros.tipo_movimentacao);
    }

    if (filtros?.data_inicio) {
      query = query.gte('created_at', filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte('created_at', filtros.data_fim + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar movimentações:', error);
      return [];
    }

    return (data || []) as MovimentacaoEstoque[];
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    return [];
  }
}

export async function criarMovimentacao(movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at' | 'empresa_id' | 'usuario_id'>): Promise<{ ok: boolean; data?: MovimentacaoEstoque; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();

    // Buscar quantidade anterior do estoque
    let quantidadeAnterior = 0;
    if (movimentacao.variacao_id) {
      const { data: variacao } = await supabase
        .from('produto_variacoes')
        .select('estoque_atual')
        .eq('id', movimentacao.variacao_id)
        .single();
      quantidadeAnterior = variacao?.estoque_atual || 0;
    } else if (movimentacao.produto_id) {
      const { data: produto } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', movimentacao.produto_id)
        .single();
      quantidadeAnterior = produto?.quantity || 0;
    }

    // Calcular quantidade atual
    let quantidadeAtual = quantidadeAnterior;
    if (movimentacao.tipo_movimentacao === 'entrada' || movimentacao.tipo_movimentacao === 'devolucao') {
      quantidadeAtual = quantidadeAnterior + movimentacao.quantidade;
    } else if (movimentacao.tipo_movimentacao === 'saida' || movimentacao.tipo_movimentacao === 'perda') {
      quantidadeAtual = quantidadeAnterior - movimentacao.quantidade;
    } else if (movimentacao.tipo_movimentacao === 'ajuste') {
      quantidadeAtual = movimentacao.quantidade; // Em ajuste, a quantidade é o valor final
    }

    // Criar movimentação
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        ...movimentacao,
        empresa_id: empresaId,
        usuario_id: user?.id,
        quantidade_anterior: quantidadeAnterior,
        quantidade_atual: quantidadeAtual,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar movimentação:', error);
      return { ok: false, error: error.message };
    }

    // Atualizar estoque
    if (movimentacao.variacao_id) {
      await supabase
        .from('produto_variacoes')
        .update({ estoque_atual: quantidadeAtual, updated_at: new Date().toISOString() })
        .eq('id', movimentacao.variacao_id);
    } else if (movimentacao.produto_id) {
      await supabase
        .from('inventory_items')
        .update({ quantity: quantidadeAtual })
        .eq('id', movimentacao.produto_id);
    }

    return { ok: true, data: data as MovimentacaoEstoque };
  } catch (error: any) {
    console.error('Erro ao criar movimentação:', error);
    return { ok: false, error: error.message || 'Erro ao criar movimentação' };
  }
}

