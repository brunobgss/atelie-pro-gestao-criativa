// api/asaas/subscriptions.js
// API intermediária para criar assinaturas no ASAAS

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId, planType, companyId } = req.body;

    // Validar dados obrigatórios
    if (!customerId || !planType) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: customerId, planType' 
      });
    }

    // Configurar dados da assinatura baseado no plano
    let subscriptionData;
    
    if (planType === 'monthly') {
      subscriptionData = {
        customer: customerId,
        billingType: 'PIX',
        value: 39.00,
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: 'Assinatura Mensal - Ateliê Pro',
        externalReference: companyId || 'temp-company',
        split: [
          {
            walletId: process.env.ASAAS_WALLET_ID,
            totalValue: 39.00,
            description: 'Comissão Ateliê Pro'
          }
        ]
      };
    } else if (planType === 'yearly') {
      subscriptionData = {
        customer: customerId,
        billingType: 'PIX',
        value: 390.00,
        nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cycle: 'YEARLY',
        description: 'Assinatura Anual - Ateliê Pro',
        externalReference: companyId || 'temp-company',
        split: [
          {
            walletId: process.env.ASAAS_WALLET_ID,
            totalValue: 390.00,
            description: 'Comissão Ateliê Pro'
          }
        ]
      };
    } else {
      return res.status(400).json({ 
        error: 'Tipo de plano inválido. Use: monthly ou yearly' 
      });
    }

    // Fazer chamada para ASAAS
    const asaasResponse = await fetch('https://www.asaas.com/api/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.VITE_ASAAS_API_KEY
      },
      body: JSON.stringify(subscriptionData)
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error('Erro ASAAS:', asaasData);
      return res.status(400).json({ 
        error: 'Erro ao criar assinatura no ASAAS',
        details: asaasData 
      });
    }

    console.log('✅ Assinatura criada no ASAAS:', asaasData);

    // Retornar dados da assinatura criada
    res.status(200).json({
      success: true,
      subscription: asaasData
    });

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}
