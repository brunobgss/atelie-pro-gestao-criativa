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
        // Aqui você pode ativar a assinatura do usuário
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
