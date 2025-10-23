// api/asaas/subscription/[id].js - Verificar status de subscription no Asaas
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID da subscription é obrigatório' });
  }

  try {
    console.log('🔍 Verificando subscription no Asaas:', id);

    // Verificar se a API Key está configurada
    if (!process.env.ASAAS_API_KEY) {
      console.error('❌ ASAAS_API_KEY não configurada');
      return res.status(500).json({ 
        error: 'Configuração do Asaas não encontrada',
        success: false
      });
    }

    // Fazer requisição para o Asaas
    const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${id}`, {
      method: 'GET',
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Erro na API do Asaas:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: 'Erro ao verificar subscription no Asaas',
        success: false,
        status: response.status
      });
    }

    const subscriptionData = await response.json();
    console.log('✅ Subscription verificada:', subscriptionData.id, subscriptionData.status);

    // Retornar dados relevantes
    return res.status(200).json({
      success: true,
      data: {
        id: subscriptionData.id,
        status: subscriptionData.status,
        cycle: subscriptionData.cycle,
        nextDueDate: subscriptionData.nextDueDate,
        value: subscriptionData.value,
        description: subscriptionData.description,
        customer: subscriptionData.customer,
        externalReference: subscriptionData.externalReference
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar subscription:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      success: false,
      details: error.message
    });
  }
}
