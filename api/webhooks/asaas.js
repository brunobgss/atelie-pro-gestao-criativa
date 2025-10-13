// api/webhooks/asaas.js
// Endpoint para receber webhooks do ASAAS no Vercel

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    console.log('🔔 Webhook ASAAS recebido:', {
      event: payload.event,
      payment: payload.payment ? {
        id: payload.payment.id,
        value: payload.payment.value,
        status: payload.payment.status,
        externalReference: payload.payment.externalReference
      } : null,
      subscription: payload.subscription ? {
        id: payload.subscription.id,
        status: payload.subscription.status
      } : null
    });
    
    // Processar diferentes tipos de eventos
    switch (payload.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(payload);
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(payload);
        break;
      case 'PAYMENT_REFUNDED':
        await handlePaymentRefunded(payload);
        break;
      case 'SUBSCRIPTION_CREATED':
        await handleSubscriptionCreated(payload);
        break;
      case 'SUBSCRIPTION_CANCELED':
        await handleSubscriptionCanceled(payload);
        break;
      default:
        console.log('Evento não tratado:', payload.event);
    }
    
    // Responder com sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event: payload.event,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

// Função para processar pagamento recebido
async function handlePaymentReceived(payload) {
  const { payment } = payload;
  
  console.log('💰 Pagamento recebido:', {
    id: payment.id,
    value: payment.value,
    customer: payment.customer,
    externalReference: payment.externalReference,
    status: payment.status
  });
  
  // Aqui você faria a atualização no Supabase
  // Por enquanto, vamos apenas logar
  console.log('✅ Pagamento processado com sucesso');
  
  // TODO: Implementar atualização no Supabase
  /*
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  await supabase
    .from('empresas')
    .update({
      is_premium: true,
      status: 'active',
      subscription_id: payment.id,
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', payment.externalReference);
  */
}

// Função para processar pagamento em atraso
async function handlePaymentOverdue(payload) {
  const { payment } = payload;
  
  console.log('⚠️ Pagamento em atraso:', {
    id: payment.id,
    customer: payment.customer,
    dueDate: payment.dueDate
  });
  
  // TODO: Enviar email de lembrete
  // TODO: Marcar como pendente no banco
}

// Função para processar reembolso
async function handlePaymentRefunded(payload) {
  const { payment } = payload;
  
  console.log('↩️ Pagamento reembolsado:', {
    id: payment.id,
    customer: payment.customer
  });
  
  // TODO: Reverter para trial
  // TODO: Desativar recursos premium
}

// Função para processar assinatura criada
async function handleSubscriptionCreated(payload) {
  const { subscription } = payload;
  
  console.log('🎉 Assinatura criada:', {
    id: subscription.id,
    customer: subscription.customer,
    value: subscription.value,
    status: subscription.status
  });
}

// Função para processar assinatura cancelada
async function handleSubscriptionCanceled(payload) {
  const { subscription } = payload;
  
  console.log('❌ Assinatura cancelada:', {
    id: subscription.id,
    customer: subscription.customer,
    status: subscription.status
  });
  
  // TODO: Reverter para trial
  // TODO: Desativar recursos premium
}