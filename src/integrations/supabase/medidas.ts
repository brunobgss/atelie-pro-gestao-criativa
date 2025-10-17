import { supabase } from './client';

export interface Medida {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo_peca: 'blusa' | 'vestido' | 'calca' | 'bermuda' | 'saia' | 'outro';
  
  // Medidas superiores
  busto?: number;
  cintura?: number;
  quadril?: number;
  ombro?: number;
  largura_costas?: number;
  cava_manga?: number;
  grossura_braco?: number;
  comprimento_manga?: number;
  cana_braco?: number;
  alca?: number;
  pescoco?: number;
  comprimento?: number;
  
  // Medidas inferiores
  coxa?: number;
  tornozelo?: number;
  comprimento_calca?: number;
  
  // Detalhes e observações
  detalhes_superior?: string;
  detalhes_inferior?: string;
  observacoes?: string;
  
  // Datas
  data_primeira_prova?: string;
  data_entrega?: string;
  
  // Metadados
  created_at: string;
  updated_at: string;
  empresa_id: string;
}

export async function getMedidas(empresaId: string): Promise<Medida[]> {
  try {
    console.log('🔍 Buscando medidas...');
    
    const { data, error } = await supabase
      .from('atelie_medidas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar medidas:', error);
      throw error;
    }

    console.log('✅ Medidas encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar medidas:', error);
    throw error;
  }
}

export async function getMedidasByCliente(clienteId: string): Promise<Medida[]> {
  try {
    console.log('🔍 Buscando medidas do cliente:', clienteId);
    
    const { data, error } = await supabase
      .from('atelie_medidas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar medidas do cliente:', error);
      throw error;
    }

    console.log('✅ Medidas do cliente encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar medidas do cliente:', error);
    throw error;
  }
}

export async function createMedida(medida: Omit<Medida, 'id' | 'created_at' | 'updated_at'>): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    console.log('➕ Criando medida...');
    
    const { data, error } = await supabase
      .from('atelie_medidas')
      .insert([medida])
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao criar medida:', error);
      return { ok: false, error: error.message };
    }

    console.log('✅ Medida criada com sucesso:', data.id);
    return { ok: true, id: data.id };
  } catch (error) {
    console.error('❌ Erro ao criar medida:', error);
    return { ok: false, error: 'Erro interno ao criar medida' };
  }
}

export async function updateMedida(id: string, medida: Partial<Omit<Medida, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>>): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log('✏️ Atualizando medida:', id);
    
    const { error } = await supabase
      .from('atelie_medidas')
      .update({ ...medida, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar medida:', error);
      return { ok: false, error: error.message };
    }

    console.log('✅ Medida atualizada com sucesso');
    return { ok: true };
  } catch (error) {
    console.error('❌ Erro ao atualizar medida:', error);
    return { ok: false, error: 'Erro interno ao atualizar medida' };
  }
}

export async function deleteMedida(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log('🗑️ Deletando medida:', id);
    
    const { error } = await supabase
      .from('atelie_medidas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar medida:', error);
      return { ok: false, error: error.message };
    }

    console.log('✅ Medida deletada com sucesso');
    return { ok: true };
  } catch (error) {
    console.error('❌ Erro ao deletar medida:', error);
    return { ok: false, error: 'Erro interno ao deletar medida' };
  }
}

export async function getMedidaById(id: string): Promise<Medida | null> {
  try {
    console.log('🔍 Buscando medida por ID:', id);
    
    const { data, error } = await supabase
      .from('atelie_medidas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar medida:', error);
      return null;
    }

    console.log('✅ Medida encontrada:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar medida:', error);
    return null;
  }
}
