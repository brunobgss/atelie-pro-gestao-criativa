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
      
      case 'PAYMENT_OVERDUE':
        console.log('⚠️ Pagamento em atraso:', webhookData.payment.id);
        // Aqui você pode notificar o usuário sobre o atraso
        break;
      
      case 'PAYMENT_DELETED':
        console.log('🗑️ Pagamento deletado:', webhookData.payment.id);
        // Aqui você pode cancelar a assinatura
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
    
    // Verificar se a API Key do Supabase está configurada
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis do Supabase não configuradas');
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Calcular data de expiração baseada no valor do pagamento
    let expirationDate;
    if (payment.value === 39.00) {
      // Plano mensal - 30 dias
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
    } else if (payment.value === 390.00) {
      // Plano anual - 365 dias (R$ 390,00 anual)
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 365);
    } else {
      console.error('❌ Valor de pagamento não reconhecido:', payment.value);
      return;
    }

    // Atualizar empresa como premium
    const { data, error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        asaas_subscription_id: payment.id,
        current_period_end: expirationDate.toISOString(),
        plan_type: payment.value === 39.00 ? 'monthly' : 'yearly',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.externalReference);

    if (error) {
      console.error('❌ Erro ao ativar premium:', error);
    } else {
      console.log('✅ Premium ativado com sucesso para empresa:', payment.externalReference);
    }

  } catch (error) {
    console.error('❌ Erro na função activatePremium:', error);
  }
}
