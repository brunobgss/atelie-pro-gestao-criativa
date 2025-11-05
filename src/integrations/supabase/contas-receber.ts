import { supabase } from './client';
import { getCurrentEmpresaId } from './auth-utils';

export interface ContaReceber {
  id?: string;
  empresa_id?: string;
  cliente_id?: string;
  pedido_id?: string;
  descricao: string;
  categoria?: string;
  valor_total: number;
  valor_recebido: number;
  data_vencimento: string;
  data_recebimento?: string;
  status: 'pendente' | 'recebido' | 'atrasado' | 'cancelado';
  forma_pagamento?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listarContasReceber(filtros?: {
  status?: string;
  cliente_id?: string;
  pedido_id?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<ContaReceber[]> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return [];
    }

    let query = supabase
      .from('contas_receber')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.cliente_id) {
      query = query.eq('cliente_id', filtros.cliente_id);
    }

    if (filtros?.pedido_id) {
      query = query.eq('pedido_id', filtros.pedido_id);
    }

    if (filtros?.data_inicio) {
      query = query.gte('data_vencimento', filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte('data_vencimento', filtros.data_fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar contas a receber:', error);
      return [];
    }

    // Atualizar status para 'atrasado' se necessário
    const contas = (data || []) as ContaReceber[];
    const hoje = new Date().toISOString().split('T')[0];
    
    return contas.map(conta => {
      if (conta.status === 'pendente' && conta.data_vencimento < hoje) {
        return { ...conta, status: 'atrasado' as const };
      }
      return conta;
    });
  } catch (error) {
    console.error('Erro ao listar contas a receber:', error);
    return [];
  }
}

export async function criarContaReceber(conta: Omit<ContaReceber, 'id' | 'created_at' | 'updated_at' | 'empresa_id' | 'valor_recebido'>): Promise<{ ok: boolean; data?: ContaReceber; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { data, error } = await supabase
      .from('contas_receber')
      .insert({
        ...conta,
        empresa_id: empresaId,
        valor_recebido: 0,
        status: conta.status || 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conta a receber:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ContaReceber };
  } catch (error: any) {
    console.error('Erro ao criar conta a receber:', error);
    return { ok: false, error: error.message || 'Erro ao criar conta a receber' };
  }
}

export async function atualizarContaReceber(id: string, conta: Partial<ContaReceber>): Promise<{ ok: boolean; data?: ContaReceber; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    // Atualizar status baseado no recebimento
    const updates: any = { ...conta, updated_at: new Date().toISOString() };
    
    if (conta.valor_recebido !== undefined && conta.valor_total !== undefined) {
      if (conta.valor_recebido >= conta.valor_total) {
        updates.status = 'recebido';
        updates.data_recebimento = conta.data_recebimento || new Date().toISOString().split('T')[0];
      } else if (conta.valor_recebido > 0) {
        updates.status = 'pendente';
      }
    }

    const { data, error } = await supabase
      .from('contas_receber')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar conta a receber:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ContaReceber };
  } catch (error: any) {
    console.error('Erro ao atualizar conta a receber:', error);
    return { ok: false, error: error.message || 'Erro ao atualizar conta a receber' };
  }
}

export async function deletarContaReceber(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const empresaId = await getCurrentEmpresaId();
    if (!empresaId) {
      return { ok: false, error: 'Usuário não tem empresa associada' };
    }

    const { error } = await supabase
      .from('contas_receber')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao deletar conta a receber:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao deletar conta a receber:', error);
    return { ok: false, error: error.message || 'Erro ao deletar conta a receber' };
  }
}

