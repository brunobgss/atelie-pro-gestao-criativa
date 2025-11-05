import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface PedidoCompra {
  id?: string;
  empresa_id?: string;
  fornecedor_id: string;
  codigo: string;
  data_emissao: string;
  data_entrega_prevista?: string;
  valor_total: number;
  status: 'pendente' | 'enviado' | 'recebido' | 'cancelado';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PedidoCompraItem {
  id?: string;
  pedido_compra_id: string;
  produto_id?: string;
  variacao_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  quantidade_recebida: number;
  created_at?: string;
  updated_at?: string;
}

export async function listarPedidosCompra(filtros?: {
  status?: string;
  fornecedor_id?: string;
}): Promise<PedidoCompra[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from('pedidos_compra')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_emissao', { ascending: false });

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.fornecedor_id) {
      query = query.eq('fornecedor_id', filtros.fornecedor_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar pedidos de compra:', error);
      return [];
    }

    return (data || []) as PedidoCompra[];
  } catch (error) {
    console.error('Erro ao listar pedidos de compra:', error);
    return [];
  }
}

export async function getPedidoCompra(id: string): Promise<PedidoCompra | null> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return null;
    }

    const { data, error } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single();

    if (error) {
      console.error('Erro ao buscar pedido de compra:', error);
      return null;
    }

    return data as PedidoCompra;
  } catch (error) {
    console.error('Erro ao buscar pedido de compra:', error);
    return null;
  }
}

export async function getPedidoCompraItens(pedidoCompraId: string): Promise<PedidoCompraItem[]> {
  try {
    const { data, error } = await supabase
      .from('pedidos_compra_itens')
      .select('*')
      .eq('pedido_compra_id', pedidoCompraId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar itens do pedido de compra:', error);
      return [];
    }

    return (data || []) as PedidoCompraItem[];
  } catch (error) {
    console.error('Erro ao buscar itens do pedido de compra:', error);
    return [];
  }
}

export async function criarPedidoCompra(pedido: Omit<PedidoCompra, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>, itens: Omit<PedidoCompraItem, 'id' | 'pedido_compra_id' | 'created_at' | 'updated_at' | 'quantidade_recebida' | 'valor_total'>[]): Promise<{ ok: boolean; data?: PedidoCompra; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Gerar código único se não fornecido
    let codigo = pedido.codigo;
    if (!codigo) {
      const timestamp = Date.now();
      codigo = `COMP-${timestamp}`;
    }

    // Calcular valor total
    const valorTotal = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);

    // Criar pedido
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .insert({
        ...pedido,
        codigo,
        empresa_id: empresaId,
        valor_total: valorTotal,
        status: pedido.status || 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (pedidoError) {
      console.error('Erro ao criar pedido de compra:', pedidoError);
      return { ok: false, error: pedidoError.message };
    }

    // Criar itens
    if (itens.length > 0) {
      const itensData = itens.map(item => ({
        ...item,
        pedido_compra_id: pedidoData.id,
        quantidade_recebida: 0,
        valor_total: item.quantidade * item.valor_unitario,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: itensError } = await supabase
        .from('pedidos_compra_itens')
        .insert(itensData);

      if (itensError) {
        console.error('Erro ao criar itens do pedido:', itensError);
        // Deletar pedido se falhar ao criar itens
        await supabase.from('pedidos_compra').delete().eq('id', pedidoData.id);
        return { ok: false, error: itensError.message };
      }
    }

    return { ok: true, data: pedidoData as PedidoCompra };
  } catch (error: any) {
    console.error('Erro ao criar pedido de compra:', error);
    return { ok: false, error: error.message || 'Erro ao criar pedido de compra' };
  }
}

export async function atualizarPedidoCompra(id: string, pedido: Partial<PedidoCompra>): Promise<{ ok: boolean; data?: PedidoCompra; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('pedidos_compra')
      .update({
        ...pedido,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pedido de compra:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as PedidoCompra };
  } catch (error: any) {
    console.error('Erro ao atualizar pedido de compra:', error);
    return { ok: false, error: error.message || 'Erro ao atualizar pedido de compra' };
  }
}

export async function receberPedidoCompra(id: string, itensRecebidos: { item_id: string; quantidade: number }[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Atualizar quantidade recebida dos itens
    for (const itemRecebido of itensRecebidos) {
      const { error: itemError } = await supabase
        .from('pedidos_compra_itens')
        .update({
          quantidade_recebida: itemRecebido.quantidade,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemRecebido.item_id);

      if (itemError) {
        console.error('Erro ao atualizar item recebido:', itemError);
        return { ok: false, error: itemError.message };
      }
    }

    // Verificar se todos os itens foram recebidos
    const itens = await getPedidoCompraItens(id);
    const todosRecebidos = itens.every(item => item.quantidade_recebida >= item.quantidade);

    // Atualizar status do pedido
    const status = todosRecebidos ? 'recebido' : 'enviado';
    const result = await atualizarPedidoCompra(id, { status });

    if (!result.ok) {
      return result;
    }

    // TODO: Criar movimentações de estoque quando implementarmos estoque avançado

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao receber pedido de compra:', error);
    return { ok: false, error: error.message || 'Erro ao receber pedido de compra' };
  }
}

export async function deletarPedidoCompra(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Deletar itens primeiro (cascade)
    await supabase
      .from('pedidos_compra_itens')
      .delete()
      .eq('pedido_compra_id', id);

    // Deletar pedido
    const { error } = await supabase
      .from('pedidos_compra')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao deletar pedido de compra:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao deletar pedido de compra:', error);
    return { ok: false, error: error.message || 'Erro ao deletar pedido de compra' };
  }
}

