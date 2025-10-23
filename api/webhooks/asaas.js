// api/webhooks/asaas.js - Webhook ASAAS
export default async function handler(req, res) {
  console.log('🔔 Webhook ASAAS recebido:', req.method, req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - CORS preflight');
    return res.status(200).end();
  }

  // Aceitar apenas POST para webhooks
  if (req.method !== 'POST') {
    console.error('❌ Método não permitido para webhook:', req.method);
    return res.status(405).json({ 
      error: 'Método não permitido. Webhooks ASAAS só aceitam POST.',
      success: false
    });
  }

  try {
    const webhookData = req.body;
    console.log('📨 Dados do webhook:', webhookData);

    // Verificar se é um evento válido do ASAAS
    if (!webhookData.event || !webhookData.payment) {
      console.error('❌ Dados do webhook inválidos:', webhookData);
      return res.status(400).json({ 
        error: 'Dados do webhook inválidos',
        success: false
      });
    }

    // Processar diferentes tipos de eventos
    switch (webhookData.event) {
      case 'PAYMENT_CREATED':
        console.log('✅ Pagamento criado:', webhookData.payment.id);
        // Aqui você pode atualizar o status no seu banco de dados
        break;
      
      case 'PAYMENT_RECEIVED':
        console.log('💰 Pagamento recebido:', webhookData.payment.id);
        // Ativar premium do usuário
        await activatePremium(webhookData.payment);
        break;
      
      case 'PAYMENT_CONFIRMED':
        console.log('✅ Pagamento confirmado:', webhookData.payment.id);
        // Ativar premium do usuário (backup para PAYMENT_RECEIVED)
        await activatePremium(webhookData.payment);
        break;
      
      case 'PAYMENT_OVERDUE':
        console.log('⚠️ Pagamento em atraso:', webhookData.payment.id);
        // Desativar premium quando pagamento está em atraso
        await deactivatePremiumForOverdue(webhookData.payment);
        break;
      
      case 'PAYMENT_DELETED':
        console.log('🗑️ Pagamento deletado:', webhookData.payment.id);
        // Desativar premium quando pagamento é deletado
        await deactivatePremiumForDeleted(webhookData.payment);
        break;

      case 'SUBSCRIPTION_CREATED':
        console.log('🔄 Assinatura criada:', webhookData.subscription.id);
        break;

      case 'SUBSCRIPTION_UPDATED':
        console.log('🔄 Assinatura atualizada:', webhookData.subscription.id);
        break;

      case 'SUBSCRIPTION_DELETED':
        console.log('🗑️ Assinatura deletada:', webhookData.subscription.id);
        // Desativar premium quando assinatura é cancelada
        await deactivatePremiumForSubscriptionDeleted(webhookData.subscription);
        break;
      
      default:
        console.log('ℹ️ Evento não tratado:', webhookData.event);
    }

    // Responder com sucesso para o ASAAS
    console.log('✅ Webhook processado com sucesso');
    return res.status(200).json({ 
      success: true,
      message: 'Webhook processado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

// Função para ativar premium do usuário
async function activatePremium(payment) {
  try {
    console.log('🔄 Ativando premium para pagamento:', payment.id);
    console.log('🔄 External Reference:', payment.externalReference);
    console.log('🔄 Payment Value:', payment.value);
    
    // Verificar se a API Key do Supabase está configurada
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis do Supabase não configuradas');
      console.error('❌ SUPABASE_URL:', process.env.SUPABASE_URL ? 'SIM' : 'NÃO');
      console.error('❌ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SIM' : 'NÃO');
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Calcular data de expiração e tipo de plano baseado no valor do pagamento
    let expirationDate;
    let planType;
    
    if (payment.value === 39.00) {
      // Plano mensal - 30 dias
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      planType = 'monthly';
    } else if (payment.value === 390.00) {
      // Plano anual - 365 dias (R$ 390,00 anual)
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 365);
      planType = 'yearly';
    } else {
      console.error('❌ Valor de pagamento não reconhecido:', payment.value);
      return;
    }

    console.log('🔄 Data de expiração calculada:', expirationDate.toISOString());
    console.log('🔄 Tipo de plano:', planType);

    // Primeiro, verificar se a empresa existe
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('id', payment.externalReference)
      .single();

    if (empresaError) {
      console.error('❌ Erro ao buscar empresa:', empresaError);
      return;
    }

    if (!empresaData) {
      console.error('❌ Empresa não encontrada:', payment.externalReference);
      return;
    }

    console.log('✅ Empresa encontrada:', empresaData.nome);

    // Atualizar empresa como premium
    const { data, error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(), // Usar trial_end_date como data de expiração
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao ativar premium:', error);
      console.error('❌ Detalhes do erro:', error.message);
    } else {
      console.log('✅ Premium ativado com sucesso para empresa:', payment.externalReference);
      console.log('✅ Dados atualizados:', data);
    }

  } catch (error) {
    console.error('❌ Erro na função activatePremium:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

// Função para desativar premium quando pagamento está em atraso
async function deactivatePremiumForOverdue(payment) {
  try {
    console.log('⚠️ Desativando premium por pagamento em atraso:', payment.id);
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por atraso:', error);
    } else {
      console.log('✅ Premium desativado por atraso para empresa:', payment.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por atraso:', error);
  }
}

// Função para desativar premium quando pagamento é deletado
async function deactivatePremiumForDeleted(payment) {
  try {
    console.log('🗑️ Desativando premium por pagamento deletado:', payment.id);
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por pagamento deletado:', error);
    } else {
      console.log('✅ Premium desativado por pagamento deletado para empresa:', payment.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por pagamento deletado:', error);
  }
}

// Função para desativar premium quando assinatura é cancelada
async function deactivatePremiumForSubscriptionDeleted(subscription) {
  try {
    console.log('🗑️ Desativando premium por assinatura cancelada:', subscription.id);
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.externalReference);

    if (error) {
      console.error('❌ Erro ao desativar premium por assinatura cancelada:', error);
    } else {
      console.log('✅ Premium desativado por assinatura cancelada para empresa:', subscription.externalReference);
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium por assinatura cancelada:', error);
  }
}
