import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface ContaPagar {
  id?: string;
  empresa_id?: string;
  fornecedor_id?: string;
  descricao: string;
  categoria?: string;
  valor_total: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  forma_pagamento?: string;
  observacoes?: string;
  pedido_compra_id?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listarContasPagar(filtros?: {
  status?: string;
  fornecedor_id?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<ContaPagar[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from('contas_pagar')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.fornecedor_id) {
      query = query.eq('fornecedor_id', filtros.fornecedor_id);
    }

    if (filtros?.data_inicio) {
      query = query.gte('data_vencimento', filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte('data_vencimento', filtros.data_fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar contas a pagar:', error);
      return [];
    }

    // Atualizar status para 'atrasado' se necessário
    const contas = (data || []) as ContaPagar[];
    const hoje = new Date().toISOString().split('T')[0];
    
    return contas.map(conta => {
      if (conta.status === 'pendente' && conta.data_vencimento < hoje) {
        return { ...conta, status: 'atrasado' as const };
      }
      return conta;
    });
  } catch (error) {
    console.error('Erro ao listar contas a pagar:', error);
    return [];
  }
}

export async function criarContaPagar(conta: Omit<ContaPagar, 'id' | 'created_at' | 'updated_at' | 'empresa_id' | 'valor_pago'>): Promise<{ ok: boolean; data?: ContaPagar; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('contas_pagar')
      .insert({
        ...conta,
        empresa_id: empresaId,
        valor_pago: 0,
        status: conta.status || 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conta a pagar:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ContaPagar };
  } catch (error: any) {
    console.error('Erro ao criar conta a pagar:', error);
    return { ok: false, error: error.message || 'Erro ao criar conta a pagar' };
  }
}

export async function atualizarContaPagar(id: string, conta: Partial<ContaPagar>): Promise<{ ok: boolean; data?: ContaPagar; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Atualizar status baseado no pagamento
    const updates: any = { ...conta, updated_at: new Date().toISOString() };
    
    if (conta.valor_pago !== undefined && conta.valor_total !== undefined) {
      if (conta.valor_pago >= conta.valor_total) {
        updates.status = 'pago';
        updates.data_pagamento = conta.data_pagamento || new Date().toISOString().split('T')[0];
      } else if (conta.valor_pago > 0) {
        updates.status = 'pendente';
      }
    }

    const { data, error } = await supabase
      .from('contas_pagar')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar conta a pagar:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ContaPagar };
  } catch (error: any) {
    console.error('Erro ao atualizar conta a pagar:', error);
    return { ok: false, error: error.message || 'Erro ao atualizar conta a pagar' };
  }
}

export async function deletarContaPagar(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { error } = await supabase
      .from('contas_pagar')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao deletar conta a pagar:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao deletar conta a pagar:', error);
    return { ok: false, error: error.message || 'Erro ao deletar conta a pagar' };
  }
}

