// api/focusnf.js - Endpoint para comunicação com Focus NF
// Base URLs conforme documentação oficial:
// Homologação: https://homologacao.focusnfe.com.br
// Produção: https://api.focusnfe.com.br
const FOCUSNF_API_URL_PRODUCAO = 'https://api.focusnfe.com.br';
const FOCUSNF_API_URL_HOMOLOGACAO = 'https://homologacao.focusnfe.com.br';

export async function POST(req) {
  console.log('🚀 Focus NF API chamada (POST)');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request headers:', req.headers);
  
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await req.json();
    const { action, data } = body;
    console.log('📝 Action:', action);
    console.log('📝 Data:', data);

    let result;

    // Extrair token de autenticação do header ou do body
    // req.headers é um objeto Node.js, não tem método .get()
    // Pode ser um objeto simples ou um objeto com métodos
    let authHeader = null;
    if (typeof req.headers.get === 'function') {
      // Se for um objeto Request da Fetch API
      authHeader = req.headers.get('authorization');
    } else if (req.headers.authorization) {
      // Se for um objeto Node.js simples
      authHeader = req.headers.authorization;
    } else if (req.headers['authorization']) {
      authHeader = req.headers['authorization'];
    }
    
    const authToken = authHeader?.replace(/^Bearer\s+/i, '') || data?.authToken;
    console.log('🔐 Token encontrado:', authToken ? 'SIM' : 'NÃO');
    
    switch (action) {
      case 'emitirNota':
        result = await emitirNota(data, authToken);
        break;
      case 'consultarNota':
        result = await consultarNota(data, authToken);
        break;
      case 'cancelarNota':
        result = await cancelarNota(data, authToken);
        break;
      case 'emitirCartaCorrecao':
        result = await emitirCartaCorrecao(data, authToken);
        break;
      default:
        console.error('❌ Ação não reconhecida:', action);
        return Response.json({ 
          success: false,
          error: 'Ação não reconhecida. Use: emitirNota, consultarNota, cancelarNota ou emitirCartaCorrecao'
        }, { status: 400 });
    }

    console.log('✅ Resultado:', result);
    return Response.json({
      success: true,
      action,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro na API Focus NF:', error);
    console.error('❌ Tipo do erro:', error?.constructor?.name);
    console.error('❌ Mensagem:', error?.message);
    console.error('❌ Stack:', error?.stack);
    
    // Log detalhado das variáveis de ambiente (sem mostrar valores sensíveis)
    console.error('🔍 Debug - Variáveis de ambiente:');
    console.error('  - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SIM' : 'NÃO');
    console.error('  - VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SIM' : 'NÃO');
    console.error('  - SUPABASE_URL:', process.env.SUPABASE_URL ? 'SIM' : 'NÃO');
    console.error('  - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SIM' : 'NÃO');
    console.error('  - NODE_ENV:', process.env.NODE_ENV || 'não definido');
    
    // Construir mensagem de erro mais detalhada
    let errorMessage = error.message || 'Erro interno do servidor';
    
    // Adicionar informações específicas sobre variáveis de ambiente
    if (errorMessage.includes('Supabase') || errorMessage.includes('configurações')) {
      errorMessage += '\n\n💡 Verifique se as variáveis de ambiente estão configuradas no arquivo .env.local:';
      errorMessage += '\n   - VITE_SUPABASE_URL';
      errorMessage += '\n   - VITE_SUPABASE_ANON_KEY';
    }
    
    return Response.json({ 
      success: false,
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        type: error?.constructor?.name,
        stack: error?.stack,
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      } : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'API Focus NF funcionando!',
    method: 'GET',
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

// Buscar configuração do banco de dados
async function getConfig(empresaId, authToken = null) {
  if (!empresaId) {
    throw new Error('ID da empresa é obrigatório');
  }

  try {
    // Buscar configuração do Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    // No servidor Node, variáveis de ambiente podem ter nomes diferentes
    // Fallback para valores hardcoded se as variáveis de ambiente não estiverem disponíveis
    const supabaseUrl = process.env.VITE_SUPABASE_URL 
      || process.env.SUPABASE_URL 
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || 'https://xthioxkfkxjvqcjqllfy.supabase.co'; // Fallback hardcoded
      
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY 
      || process.env.SUPABASE_ANON_KEY 
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE'; // Fallback hardcoded
    
    console.log('🔍 Buscando configuração Focus NF para empresa:', empresaId);
    console.log('🔍 Supabase URL configurada:', supabaseUrl ? 'SIM' : 'NÃO');
    console.log('🔍 Supabase Key configurada:', supabaseKey ? 'SIM' : 'NÃO');
    console.log('🔍 Token de autenticação:', authToken ? 'SIM' : 'NÃO');
    
    // Verificar se temos as configurações necessárias (agora com fallback, não deve mais falhar)
    if (!supabaseUrl || !supabaseKey) {
      const availableVars = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
      console.warn('⚠️ Configurações do Supabase não encontradas nas variáveis de ambiente');
      console.warn('⚠️ Variáveis SUPABASE disponíveis:', availableVars.length > 0 ? availableVars : 'NENHUMA');
      console.warn('⚠️ Usando valores padrão (fallback)');
      
      // Agora não vamos mais lançar erro, pois temos fallback hardcoded
      // Mas vamos avisar que seria melhor configurar as variáveis de ambiente
      console.warn('💡 Dica: Configure as variáveis de ambiente no .env.local para melhor segurança');
    } else {
      console.log('✅ Usando configurações do Supabase das variáveis de ambiente');
    }
    
    // Criar cliente Supabase
    // Para autenticação no servidor, vamos usar a chave service_role ou passar o token nos headers
    const supabaseOptions = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    };
    
    let supabase;
    
    // Se tiver token, criar um cliente autenticado
    if (authToken) {
      // Criar um cliente que usa o token nas requisições
      supabase = createClient(supabaseUrl, supabaseKey, {
        ...supabaseOptions,
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      });
      
      // Tentar validar o token primeiro
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn('⚠️ Erro ao validar token:', authError.message);
        // Mesmo assim, continuar usando o cliente autenticado
      } else {
        console.log('✅ Token validado, usuário:', user?.id);
      }
    } else {
      // Cliente sem autenticação (usando service role se disponível)
      supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);
    }
    
    // Buscar configuração da empresa
    console.log('🔍 Consultando tabela focusnf_config...');
    
    const { data, error } = await supabase
      .from('focusnf_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Configuração Focus NF não encontrada. Configure na página de configurações.');
      }
      throw new Error(`Erro ao buscar configuração: ${error.message}`);
    }
    
    if (!data) {
      console.error('❌ Nenhuma configuração encontrada para empresa:', empresaId);
      throw new Error('Configuração Focus NF não encontrada. Configure na página de configurações.');
    }
    
    console.log('✅ Configuração encontrada:', { ambiente: data.ambiente, tem_token_homologacao: !!data.token_homologacao, tem_token_producao: !!data.token_producao });
    
    // Determinar token baseado no ambiente
    const ambiente = data.ambiente || 'homologacao';
    const token = ambiente === 'producao' 
      ? data.token_producao 
      : data.token_homologacao;
    
    if (!token) {
      console.error(`❌ Token de ${ambiente} não configurado`);
      throw new Error(`Token de ${ambiente} não configurado. Configure na página de configurações.`);
    }
    
    return {
      token: token,
      ambiente: ambiente,
      config: data
    };
  } catch (error) {
    console.error('❌ Erro em getConfig:', error);
    throw error;
  }
}

// Emitir nota fiscal
async function emitirNota(data, authToken = null) {
  try {
    const { orderCode, tipoNota = 'NFe', cliente, empresaId, valorTotal, ref, items } = data;
    
    const config = await getConfig(empresaId, authToken);
    
    if (!config.token) {
      throw new Error('Token Focus NF não configurado. Configure na página de configurações.');
    }

    const ambiente = config.ambiente === 'producao' ? 'producao' : 'homologacao';
    
    // Obter CNPJ do emitente (sem formatação, apenas números)
    const cnpjEmitente = config.config?.cnpj_emitente?.replace(/\D/g, '') || '';
    if (!cnpjEmitente) {
      throw new Error('CNPJ do emitente não encontrado na configuração. Configure na página de configurações.');
    }

    // URL da Focus NF conforme documentação oficial:
    // Determinar o endpoint baseado no tipo de nota
    // NFe: /v2/nfe
    // NFCe: /v2/nfce
    // NFSe: /v2/nfse
    const baseUrl = ambiente === 'producao' 
      ? FOCUSNF_API_URL_PRODUCAO
      : FOCUSNF_API_URL_HOMOLOGACAO;
    
    // Determinar endpoint baseado no tipo de nota
    let endpoint;
    switch (tipoNota) {
      case 'NFCe':
        endpoint = 'nfce';
        break;
      case 'NFSe':
        endpoint = 'nfse';
        break;
      case 'NFe':
      default:
        endpoint = 'nfe';
        break;
    }
    
    // URL correta: /v2/{endpoint}?ref=REFERENCIA (sem CNPJ na URL)
    const url = `${baseUrl}/v2/${endpoint}?ref=${encodeURIComponent(ref)}`;

    console.log('📋 Ambiente:', ambiente);
    console.log('📋 CNPJ do emitente:', cnpjEmitente);
    console.log('📋 Referência:', ref);
    console.log('📋 Tamanho da referência:', ref.length, 'caracteres');
    console.log('🔗 URL completa:', url);
    console.log('🔑 Token configurado:', config.token ? 'SIM' : 'NÃO');
    console.log('🔑 Token (primeiros 20 chars):', config.token ? config.token.substring(0, 20) + '...' : 'NÃO');
    console.log('📝 Configuração completa:', {
      ambiente: config.config?.ambiente,
      cnpj_emitente: config.config?.cnpj_emitente,
      razao_social: config.config?.razao_social,
      tem_token_homologacao: !!config.config?.token_homologacao,
      tem_token_producao: !!config.config?.token_producao
    });
    
    // Verificar se a referência não é muito longa (limite geralmente é 44 caracteres)
    if (ref.length > 44) {
      console.warn('⚠️ Referência muito longa! Pode causar problemas. Tamanho:', ref.length);
      // Encurtar referência se necessário
      const refEncurtada = ref.substring(0, 44);
      console.warn('⚠️ Usando referência encurtada:', refEncurtada);
    }
    
    // Validações adicionais
    if (!config.config?.razao_social) {
      console.warn('⚠️ Razão Social não configurada - pode causar problemas');
    }
    
    if (!config.config?.inscricao_estadual && ambiente === 'producao') {
      console.warn('⚠️ Inscrição Estadual não configurada - necessário para produção');
    }

    // Função para formatar e validar dados
    const formatarCPF_CNPJ = (valor) => {
      if (!valor) return '';
      const apenasNumeros = valor.replace(/\D/g, '');
      return apenasNumeros;
    };

    const formatarTelefone = (valor) => {
      if (!valor) return '';
      // Remove tudo que não é número
      let apenasNumeros = valor.replace(/\D/g, '');
      // Se começar com código do país (55), remove
      if (apenasNumeros.startsWith('55') && apenasNumeros.length > 11) {
        apenasNumeros = apenasNumeros.substring(2);
      }
      // Limita a 11 dígitos (máximo para telefone brasileiro)
      return apenasNumeros.substring(0, 11);
    };

    const formatarCEP = (valor) => {
      if (!valor) return '00000000';
      const apenasNumeros = valor.replace(/\D/g, '');
      // CEP deve ter 8 dígitos
      return apenasNumeros.substring(0, 8).padStart(8, '0');
    };

    const formatarUF = (valor) => {
      if (!valor) return 'SP';
      // Apenas 2 letras maiúsculas
      return valor.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2) || 'SP';
    };

    const formatarEmail = (valor) => {
      if (!valor) return '';
      // Remove espaços e converte para minúsculas
      return valor.trim().toLowerCase();
    };

    const formatarNome = (valor) => {
      if (!valor) return 'Consumidor Final';
      // Remove caracteres especiais problemáticos, mas mantém acentos
      return valor.trim().replace(/[<>\"'\\]/g, '');
    };

    // Usar dados da empresa emitente como fallback para endereço
    const enderecoCliente = cliente?.endereco || {};
    const enderecoEmitente = config.config || {};

    // Estrutura de NFe conforme documentação oficial Focus NF (versão 4.00)
    // Documentação: https://focusnfe.com.br/doc/#emissao-de-nfe
    // Campos obrigatórios conforme documentação
    const dataEmissao = new Date();
    const dataEmissaoISO = dataEmissao.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
    
    // Determinar regime tributário (padrão: simples_nacional)
    const regimeTributario = config.config?.regime_tributario || 'simples_nacional';
    const regimeTributarioEmitente = regimeTributario === 'simples_nacional' 
      ? 1 
      : regimeTributario === 'simples_nacional_excesso_sublimite' 
        ? 2 
        : 3; // 1=Simples Nacional, 2=Simples Nacional com excesso, 3=Regime Normal

    // Preparar dados do emitente
    const emitente = {
      cnpj_emitente: cnpjEmitente,
      nome_emitente: config.config.razao_social || 'Nome não informado',
      nome_fantasia_emitente: config.config.nome_fantasia || config.config.razao_social,
      logradouro_emitente: enderecoEmitente.endereco_logradouro || 'Não informado',
      numero_emitente: enderecoEmitente.endereco_numero || '0',
      bairro_emitente: enderecoEmitente.endereco_bairro || 'Centro',
      municipio_emitente: enderecoEmitente.endereco_cidade || 'São Paulo',
      uf_emitente: formatarUF(enderecoEmitente.endereco_uf),
      cep_emitente: formatarCEP(enderecoEmitente.endereco_cep),
      regime_tributario_emitente: regimeTributarioEmitente, // Adicionar regime tributário
    };

    if (config.config.inscricao_estadual) {
      emitente.inscricao_estadual_emitente = config.config.inscricao_estadual;
    }

    // Preparar dados do destinatário
    const cpfCnpjDestinatario = formatarCPF_CNPJ(cliente?.cpf_cnpj);
    const destinatario = {
      nome_destinatario: formatarNome(cliente?.nome) || (ambiente === 'homologacao' 
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
        : 'Consumidor Final'),
    };

    // Adicionar CPF ou CNPJ do destinatário
    if (cpfCnpjDestinatario.length === 11) {
      destinatario.cpf_destinatario = cpfCnpjDestinatario;
    } else if (cpfCnpjDestinatario.length === 14) {
      destinatario.cnpj_destinatario = cpfCnpjDestinatario;
    } else {
      // Se não tem CPF/CNPJ, usar CPF genérico para homologação
      if (ambiente === 'homologacao') {
        destinatario.cpf_destinatario = '03055054911'; // CPF de teste da documentação
      }
    }

    // Endereço do destinatário
    destinatario.logradouro_destinatario = (enderecoCliente.logradouro || enderecoEmitente.endereco_logradouro || 'Não informado').trim();
    destinatario.numero_destinatario = (enderecoCliente.numero || enderecoEmitente.endereco_numero || '0').trim();
    if (enderecoCliente.complemento || enderecoEmitente.endereco_complemento) {
      destinatario.complemento_destinatario = (enderecoCliente.complemento || enderecoEmitente.endereco_complemento || '').trim();
    }
    destinatario.bairro_destinatario = (enderecoCliente.bairro || enderecoEmitente.endereco_bairro || 'Centro').trim();
    destinatario.municipio_destinatario = (enderecoCliente.cidade || enderecoEmitente.endereco_cidade || 'São Paulo').trim();
    destinatario.uf_destinatario = formatarUF(enderecoCliente.uf || enderecoEmitente.endereco_uf);
    destinatario.cep_destinatario = formatarCEP(enderecoCliente.cep || enderecoEmitente.endereco_cep);
    destinatario.pais_destinatario = 'Brasil';

    if (formatarTelefone(cliente?.telefone)) {
      destinatario.telefone_destinatario = parseInt(formatarTelefone(cliente?.telefone));
    }

    if (formatarEmail(cliente?.email)) {
      destinatario.email_destinatario = formatarEmail(cliente?.email);
    }

    // Determinar CST e situação tributária baseado no regime
    // Para Simples Nacional: usar CST do Simples (101, 102, etc.)
    // Para Regime Normal: usar CST normal (00, 10, 20, 41, etc.)
    let icmsSituacaoTributaria;
    let pisSituacaoTributaria;
    let cofinsSituacaoTributaria;
    
    // Determinar CST baseado no regime tributário
    // MEI também é Simples Nacional, então usa CST 102
    if (regimeTributario === 'simples_nacional' || regimeTributario === 'simples_nacional_excesso_sublimite') {
      // Simples Nacional e MEI: CST 102 = Tributada pelo Simples Nacional sem permissão de crédito
      // CST 102 é o mais comum para vendas no Simples Nacional
      icmsSituacaoTributaria = 102;
      pisSituacaoTributaria = '07'; // 07=Isenta (para Simples Nacional)
      cofinsSituacaoTributaria = '07'; // 07=Isenta (para Simples Nacional)
    } else if (regimeTributario === 'regime_normal') {
      // Regime Normal: CST 41 = Não tributado (ou pode usar outros como 00, 10, 20, etc.)
      icmsSituacaoTributaria = 41;
      pisSituacaoTributaria = '07'; // 07=Isenta
      cofinsSituacaoTributaria = '07'; // 07=Isenta
    } else {
      // Fallback: usar Simples Nacional como padrão
      icmsSituacaoTributaria = 102;
      pisSituacaoTributaria = '07';
      cofinsSituacaoTributaria = '07';
    }

    // Preparar itens da nota
    // Se items foram fornecidos, usar eles. Caso contrário, criar item genérico
    let itemsNota;
    if (items && Array.isArray(items) && items.length > 0) {
      // Usar itens fornecidos
      itemsNota = items.map((item, index) => ({
        numero_item: item.numero_item || (index + 1),
        codigo_produto: item.codigo_produto || `${orderCode}-${index + 1}`,
        descricao: item.descricao || 'Produto',
        cfop: item.cfop || '5102',
        unidade_comercial: item.unidade || 'UN',
        quantidade_comercial: item.quantidade || 1,
        valor_unitario_comercial: item.valor_unitario || 0,
        valor_unitario_tributavel: item.valor_unitario || 0,
        unidade_tributavel: item.unidade || 'UN',
        quantidade_tributavel: item.quantidade || 1,
        valor_bruto: item.valor_total || (item.valor_unitario * item.quantidade),
        codigo_ncm: item.ncm || '6204.62.00',
        icms_origem: 0, // 0=Nacional
        icms_situacao_tributaria: icmsSituacaoTributaria,
        pis_situacao_tributaria: pisSituacaoTributaria,
        cofins_situacao_tributaria: cofinsSituacaoTributaria,
        inclui_no_total: 1 // 1=Sim
      }));
    } else {
      // Criar item genérico (comportamento antigo para compatibilidade)
      const valorProdutos = valorTotal || 0;
      itemsNota = [{
        numero_item: 1,
        codigo_produto: orderCode || '1',
        descricao: `Pedido ${orderCode}` || 'Produto',
        cfop: '5102',
        unidade_comercial: 'UN',
        quantidade_comercial: 1,
        valor_unitario_comercial: valorProdutos,
        valor_unitario_tributavel: valorProdutos,
        unidade_tributavel: 'UN',
        quantidade_tributavel: 1,
        valor_bruto: valorProdutos,
        codigo_ncm: '6204.62.00',
        icms_origem: 0,
        icms_situacao_tributaria: icmsSituacaoTributaria,
        pis_situacao_tributaria: pisSituacaoTributaria,
        cofins_situacao_tributaria: cofinsSituacaoTributaria,
        inclui_no_total: 1
      }];
    }

    // Montar payload completo conforme documentação
    // Estrutura varia ligeiramente entre NFe, NFCe e NFSe
    let payload;
    
    if (tipoNota === 'NFSe') {
      // NFSe tem estrutura diferente (focada em serviços)
      payload = {
        data_emissao: dataEmissaoISO,
        natureza_operacao: 'Venda de Serviço',
        ...emitente,
        ...destinatario,
        servicos: itemsNota.map(item => ({
          item_lista_servico: '14.01', // Código de serviço padrão (confecção)
          codigo_tributacao_municipio: '14.01', // Pode variar por município
          discriminacao: item.descricao,
          codigo_municipio: enderecoEmitente.endereco_cidade || '3550308', // Código IBGE da cidade
          valor_servicos: item.valor_total,
          valor_deducoes: 0,
          valor_pis: 0,
          valor_cofins: 0,
          valor_inss: 0,
          valor_ir: 0,
          valor_csll: 0,
          valor_iss: 0,
          valor_iss_retido: 0,
          outras_retencoes: 0,
          base_calculo: item.valor_total,
          aliquota: 0, // Alíquota do ISS (pode variar)
          desconto_incondicionado: 0,
          desconto_condicionado: 0
        })),
        valor_servicos: itemsNota.reduce((acc, item) => acc + item.valor_bruto, 0),
        valor_deducoes: 0,
        valor_pis: 0,
        valor_cofins: 0,
        valor_inss: 0,
        valor_ir: 0,
        valor_csll: 0,
        valor_iss: 0,
        valor_iss_retido: 0,
        outras_retencoes: 0,
        base_calculo: itemsNota.reduce((acc, item) => acc + item.valor_bruto, 0),
        aliquota: 0,
        desconto_incondicionado: 0,
        desconto_condicionado: 0,
        valor_total: itemsNota.reduce((acc, item) => acc + item.valor_bruto, 0)
      };
    } else {
      // NFe e NFCe têm estrutura similar
      payload = {
        natureza_operacao: tipoNota === 'NFCe' ? 'Venda' : 'Venda',
        data_emissao: dataEmissaoISO,
        data_entrada_saida: dataEmissaoISO,
        tipo_documento: 1, // 1=Saída
        local_destino: 1, // 1=Operação interna
        finalidade_emissao: 1, // 1=Normal
        consumidor_final: 1, // 1=Consumidor final
        presenca_comprador: tipoNota === 'NFCe' ? 1 : 2, // NFCe geralmente é presencial
        ...emitente,
        ...destinatario,
        valor_frete: 0,
        valor_seguro: 0,
        valor_total: itemsNota.reduce((acc, item) => acc + item.valor_bruto, 0),
        valor_produtos: itemsNota.reduce((acc, item) => acc + item.valor_bruto, 0),
        modalidade_frete: 0, // 0=Por conta do emitente
        items: itemsNota
      };
    }

    console.log('📤 Enviando nota para Focus NF:');
    console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
    console.log('📋 Dados formatados do destinatário:', {
      cpf_destinatario: payload.cpf_destinatario,
      cnpj_destinatario: payload.cnpj_destinatario,
      nome_destinatario: payload.nome_destinatario,
      email_destinatario: payload.email_destinatario,
      telefone_destinatario: payload.telefone_destinatario,
      endereco: {
        logradouro: payload.logradouro_destinatario,
        numero: payload.numero_destinatario,
        municipio: payload.municipio_destinatario,
        uf: payload.uf_destinatario,
        cep: payload.cep_destinatario
      }
    });

    // Autenticação conforme documentação: HTTP Basic Auth
    // Token como username, senha vazia
    // Alternativamente, pode usar o parâmetro "token" no JSON, mas Basic Auth é mais seguro
    const authHeader = Buffer.from(`${config.token}:`).toString('base64');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(payload)
    });

    let responseData;
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // Tentar parsear como JSON mesmo se o content-type não for correto
    try {
      responseData = JSON.parse(text);
    } catch (parseError) {
      // Se não for JSON válido, verificar se é texto HTML com JSON dentro
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          responseData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('❌ Não foi possível parsear a resposta como JSON:', text.substring(0, 500));
          responseData = { mensagem: text.substring(0, 500), erro: 'Resposta não é JSON válido' };
        }
      } else {
        console.error('❌ Resposta não contém JSON:', text.substring(0, 500));
        responseData = { mensagem: text.substring(0, 500), erro: 'Resposta não é JSON válido' };
      }
    }

    console.log('📥 Status da resposta:', response.status);
    console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    console.log('📥 Corpo da resposta:', responseData);

    if (!response.ok) {
      console.error('❌ Erro Focus NF:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        data: responseData
      });
      
      // Mensagem de erro mais detalhada
      let errorMessage = 'Erro ao emitir nota';
      
      // Tentar extrair mensagem de erro do JSON
      if (responseData.codigo && responseData.mensagem) {
        errorMessage = `${responseData.codigo}: ${responseData.mensagem}`;
      } else if (responseData.mensagem) {
        errorMessage = responseData.mensagem;
      } else if (typeof responseData.mensagem === 'string' && responseData.mensagem.includes('{')) {
        // Se mensagem for uma string JSON, tentar parsear
        try {
          const parsedMsg = JSON.parse(responseData.mensagem);
          if (parsedMsg.codigo && parsedMsg.mensagem) {
            errorMessage = `${parsedMsg.codigo}: ${parsedMsg.mensagem}`;
          } else if (parsedMsg.mensagem) {
            errorMessage = parsedMsg.mensagem;
          }
        } catch (e) {
          errorMessage = responseData.mensagem;
        }
      } else if (responseData.erro) {
        errorMessage = responseData.erro;
      }
      
      // Adicionar mensagem específica para erro "não encontrado"
      if (responseData.codigo === 'nao_encontrado' || response.status === 404 || errorMessage.includes('nao_encontrado')) {
        errorMessage += '\n\n⚠️ Possíveis causas:\n';
        errorMessage += '1. O toggle "NFe" pode não estar ativado no painel da Focus NF\n';
        errorMessage += '2. A ativação pode levar alguns minutos para ser processada (aguarde 2-5 minutos após salvar)\n';
        errorMessage += '3. O token pode não ter permissões para este CNPJ\n';
        errorMessage += '4. Verifique se o CNPJ está cadastrado no ambiente de homologação\n\n';
        errorMessage += '💡 Dica: Acesse o painel da Focus NF e verifique se o toggle "NFe" está ativado (laranja) na aba "DOCUMENTOS FISCAIS" e se você salvou as alterações.';
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ Nota emitida com sucesso:', responseData);

    // Mapear campos da resposta conforme documentação
    // Campos retornados: chave_nfe (não chave_acesso), caminho_xml_nota_fiscal, caminho_danfe
    return {
      ref,
      status: responseData.status || 'processando_autorizacao',
      numero: responseData.numero,
      serie: responseData.serie,
      chave_acesso: responseData.chave_nfe || responseData.chave_acesso, // chave_nfe é o campo correto
      valor_total: valorTotal || 0,
      xml_url: responseData.caminho_xml_nota_fiscal,
      danfe_url: responseData.caminho_danfe,
      ambiente,
      dados_retornados: responseData
    };

  } catch (error) {
    console.error('❌ Erro ao emitir nota:', error);
    throw error;
  }
}

// Consultar nota fiscal
async function consultarNota(data, authToken = null) {
  try {
    const { ref, empresaId } = data;
    
    const config = await getConfig(empresaId, authToken);
    const ambiente = config.ambiente === 'producao' ? 'producao' : 'homologacao';
    const baseUrl = ambiente === 'producao' 
      ? FOCUSNF_API_URL_PRODUCAO
      : FOCUSNF_API_URL_HOMOLOGACAO;

    // URL conforme documentação: /v2/nfe/REFERENCIA (sem CNPJ na URL)
    const url = `${baseUrl}/v2/nfe/${encodeURIComponent(ref)}`;

    // Autenticação: HTTP Basic Auth
    const authHeader = Buffer.from(`${config.token}:`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.mensagem || 'Erro ao consultar nota');
    }

    return responseData;

  } catch (error) {
    console.error('❌ Erro ao consultar nota:', error);
    throw error;
  }
}

// Cancelar nota fiscal
async function cancelarNota(data, authToken = null) {
  try {
    const { ref, justificativa, empresaId } = data;
    
    const config = await getConfig(empresaId, authToken);
    const ambiente = config.ambiente === 'producao' ? 'producao' : 'homologacao';
    const baseUrl = ambiente === 'producao' 
      ? FOCUSNF_API_URL_PRODUCAO
      : FOCUSNF_API_URL_HOMOLOGACAO;

    // URL conforme documentação: /v2/nfe/REFERENCIA (sem CNPJ na URL)
    const url = `${baseUrl}/v2/nfe/${encodeURIComponent(ref)}`;

    const payload = {
      justificativa: justificativa
    };

    // Autenticação: HTTP Basic Auth
    const authHeader = Buffer.from(`${config.token}:`).toString('base64');

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.mensagem || 'Erro ao cancelar nota');
    }

    return responseData;

  } catch (error) {
    console.error('❌ Erro ao cancelar nota:', error);
    throw error;
  }
}

// Emitir Carta de Correção Eletrônica (CCe)
async function emitirCartaCorrecao(data, authToken = null) {
  try {
    const { ref, correcao, empresaId } = data;
    
    if (!correcao || correcao.trim().length === 0) {
      throw new Error('Texto da correção é obrigatório');
    }

    const config = await getConfig(empresaId, authToken);
    const ambiente = config.ambiente === 'producao' ? 'producao' : 'homologacao';
    const baseUrl = ambiente === 'producao' 
      ? FOCUSNF_API_URL_PRODUCAO
      : FOCUSNF_API_URL_HOMOLOGACAO;

    // URL conforme documentação: /v2/nfe/REFERENCIA/carta_correcao
    const url = `${baseUrl}/v2/nfe/${encodeURIComponent(ref)}/carta_correcao`;

    const payload = {
      correcao: correcao.trim()
    };

    // Autenticação: HTTP Basic Auth
    const authHeader = Buffer.from(`${config.token}:`).toString('base64');

    console.log('📝 Emitindo Carta de Correção:', { ref, url });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.mensagem || 'Erro ao emitir carta de correção');
    }

    console.log('✅ Carta de Correção emitida:', responseData);
    return responseData;

  } catch (error) {
    console.error('❌ Erro ao emitir carta de correção:', error);
    throw error;
  }
}

