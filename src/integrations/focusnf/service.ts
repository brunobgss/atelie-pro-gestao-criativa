import { supabase } from "../supabase/client";
import { getCurrentEmpresaId } from "../supabase/auth-utils";

export interface FocusNFConfig {
  id?: string;
  empresa_id: string;
  token_producao?: string;
  token_homologacao?: string;
  ambiente: 'homologacao' | 'producao';
  cnpj_emitente: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  telefone?: string;
  email?: string;
  certificado_arquivo?: string; // Base64 do certificado A1 (.pfx/.p12)
  certificado_senha?: string; // Senha do certificado
  regime_tributario?: 'simples_nacional' | 'simples_nacional_excesso_sublimite' | 'regime_normal'; // Regime tributário
  ativo?: boolean;
}

export interface FocusNFNota {
  id?: string;
  empresa_id: string;
  order_id?: string;
  order_code?: string;
  ref: string;
  tipo_nota: 'NFe' | 'NFSe' | 'NFCe' | 'CTe' | 'MDFe' | 'NFCom' | 'MDe';
  status: string;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  valor_total?: number;
  xml_url?: string;
  danfe_url?: string;
  ambiente?: string;
  erro_mensagem?: string;
}

export interface NotaItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface EmitirNotaParams {
  orderCode: string;
  tipoNota?: 'NFe' | 'NFSe' | 'NFCe';
  cliente?: {
    nome: string;
    cpf_cnpj?: string;
    email?: string;
    telefone?: string;
    endereco?: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
  };
  valorTotal?: number;
  items?: NotaItem[]; // Múltiplos itens (opcional, se não fornecido, cria item genérico)
}

class FocusNFService {
  private async makeRequest(action: string, data: unknown) {
    console.log(`🔄 Focus NF Request: ${action}`, data);

    // Obter token de autenticação do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    const response = await fetch('/api/focusnf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
      body: JSON.stringify({ action, data: { ...data as any, authToken } }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ Focus NF API Error: ${response.status}`, responseData);
      throw new Error(responseData.error || 'Erro desconhecido');
    }

    console.log(`✅ Focus NF Response: ${action}`, responseData);
    return responseData;
  }

  async saveConfig(config: FocusNFConfig): Promise<{ ok: boolean; data?: FocusNFConfig; error?: string }> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) {
        return { ok: false, error: 'Empresa não encontrada' };
      }

      const { data: existing } = await supabase
        .from('focusnf_config')
        .select('id')
        .eq('empresa_id', empresa_id)
        .maybeSingle();

      // Formatar dados antes de salvar (remover pontuação)
      const configData = {
        ...config,
        cnpj_emitente: config.cnpj_emitente?.replace(/\D/g, '') || config.cnpj_emitente,
        endereco_cep: config.endereco_cep?.replace(/\D/g, '') || config.endereco_cep,
        telefone: config.telefone?.replace(/\D/g, '') || config.telefone,
        endereco_uf: config.endereco_uf?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2) || config.endereco_uf,
        empresa_id,
        ativo: true, // Garantir que sempre seja ativo quando salvar
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('focusnf_config')
          .update(configData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('focusnf_config')
          .insert(configData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      return { ok: true, data: result as FocusNFConfig };
    } catch (e: any) {
      console.error('Erro ao salvar configuração Focus NF:', e);
      return { ok: false, error: e.message || 'Erro ao salvar configuração' };
    }
  }

  async getConfig(): Promise<FocusNFConfig | null> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) return null;

      const { data, error } = await supabase
        .from('focusnf_config')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;
      return data as FocusNFConfig | null;
    } catch (e) {
      console.error('Erro ao buscar configuração:', e);
      return null;
    }
  }

  async emitirNota(params: EmitirNotaParams): Promise<{ ok: boolean; data?: FocusNFNota; error?: string }> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) {
        return { ok: false, error: 'Empresa não encontrada' };
      }

      // Salvar nota no banco primeiro
      // Referência deve ter no máximo 44 caracteres (limite da Focus NF)
      // Formato: NFE-{orderCode}-{timestamp}
      const timestamp = Date.now().toString().slice(-10); // Últimos 10 dígitos do timestamp
      const ref = `NFE-${params.orderCode}-${timestamp}`.substring(0, 44);
      const { data: notaData, error: notaError } = await supabase
        .from('focusnf_notas')
        .insert({
          empresa_id,
          order_code: params.orderCode,
          ref,
          tipo_nota: params.tipoNota || 'NFe',
          status: 'processando_autorizacao',
          valor_total: params.valorTotal || 0,
          ambiente: 'homologacao', // Será atualizado depois
        })
        .select()
        .single();

      if (notaError) {
        console.error('Erro ao criar nota no banco:', notaError);
      }

      // Chamar API para emitir nota
      try {
        const result = await this.makeRequest('emitirNota', { ...params, empresaId: empresa_id, ref });
        
        if (result.success && result.data && notaData) {
          // Atualizar nota no banco com dados da API (sucesso)
          await supabase
            .from('focusnf_notas')
            .update({
              status: result.data.status,
              numero: result.data.numero,
              serie: result.data.serie,
              chave_acesso: result.data.chave_acesso,
              xml_url: result.data.xml_url,
              danfe_url: result.data.danfe_url,
              ambiente: result.data.ambiente,
              dados_retornados: result.data.dados_retornados,
              updated_at: new Date().toISOString(),
            })
            .eq('id', notaData.id);
        } else if (notaData) {
          // Atualizar nota no banco com erro
          await supabase
            .from('focusnf_notas')
            .update({
              status: 'erro_emissao',
              erro_mensagem: result.error || 'Erro desconhecido ao emitir nota',
              updated_at: new Date().toISOString(),
            })
            .eq('id', notaData.id);
        }

        return { ok: result.success, data: result.data, error: result.error };
      } catch (error: any) {
        // Se houver erro na requisição, atualizar nota com erro
        if (notaData) {
          await supabase
            .from('focusnf_notas')
            .update({
              status: 'erro_emissao',
              erro_mensagem: error.message || 'Erro ao emitir nota',
              updated_at: new Date().toISOString(),
            })
            .eq('id', notaData.id);
        }
        throw error;
      }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erro ao emitir nota' };
    }
  }

  async consultarNota(ref: string): Promise<{ ok: boolean; data?: FocusNFNota; error?: string }> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      const result = await this.makeRequest('consultarNota', { ref, empresaId: empresa_id });
      return { ok: result.success, data: result.data, error: result.error };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erro ao consultar nota' };
    }
  }

  async listarNotas(orderCode?: string): Promise<FocusNFNota[]> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) return [];

      let query = supabase
        .from('focusnf_notas')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false });

      if (orderCode) {
        query = query.eq('order_code', orderCode);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as FocusNFNota[];
    } catch (e) {
      console.error('Erro ao listar notas:', e);
      return [];
    }
  }

  async cancelarNota(ref: string, justificativa: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      const result = await this.makeRequest('cancelarNota', { ref, justificativa, empresaId: empresa_id });
      return { ok: result.success, error: result.error };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erro ao cancelar nota' };
    }
  }

  async emitirCartaCorrecao(ref: string, correcao: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const empresa_id = await getCurrentEmpresaId();
      const result = await this.makeRequest('emitirCartaCorrecao', { ref, correcao, empresaId: empresa_id });
      return { ok: result.success, error: result.error };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erro ao emitir carta de correção' };
    }
  }
}

export const focusNFService = new FocusNFService();

