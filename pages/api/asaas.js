// pages/api/asaas.js
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Aceitar GET para teste
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'API ASAAS funcionando via Next.js!',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { action, data } = req.body;

    // Verificar se a API Key está configurada
    if (!process.env.VITE_ASAAS_API_KEY) {
      return res.status(500).json({ 
        error: 'ASAAS_API_KEY não configurada no Vercel' 
      });
    }

    console.log(`🔄 ASAAS Action: ${action}`, data);

    let result;

    switch (action) {
      case 'createCustomer':
        result = await createCustomer(data);
        break;
      case 'createSubscription':
        result = await createSubscription(data);
        break;
      default:
        return res.status(400).json({ 
          error: 'Ação não reconhecida. Use: createCustomer ou createSubscription' 
        });
    }

    console.log(`✅ ASAAS Success: ${action}`, result);
    res.status(200).json({
      success: true,
      action,
      data: result
    });

  } catch (error) {
    console.error('❌ ASAAS Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}

// Função para criar cliente no ASAAS
async function createCustomer(customerData) {
  const { name, email, phone, cpfCnpj } = customerData;

  // Validar dados obrigatórios
  if (!name || !email) {
    throw new Error('Dados obrigatórios: name, email');
  }

  const payload = {
    name,
    email,
    notificationDisabled: false
  };

  // Adicionar campos opcionais se fornecidos
  if (phone) payload.phone = phone;
  if (cpfCnpj) payload.cpfCnpj = cpfCnpj;

  console.log('🔑 API Key configurada:', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');
  console.log('🔑 Primeiros 10 caracteres da API Key:', process.env.VITE_ASAAS_API_KEY?.substring(0, 10) + '...');
  
  const response = await fetch('https://www.asaas.com/api/v3/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Erro ASAAS createCustomer:', data);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar cliente'}`);
  }

  return data;
}

// Função para criar assinatura no ASAAS
async function createSubscription(subscriptionData) {
  const { customerId, planType, companyId } = subscriptionData;

  // Validar dados obrigatórios
  if (!customerId || !planType) {
    throw new Error('Dados obrigatórios: customerId, planType');
  }

  // Configurar dados da assinatura baseado no plano
  let payload;
  
  if (planType === 'monthly') {
    payload = {
      customer: customerId,
      billingType: 'PIX',
      value: 39.00,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: companyId || 'temp-company'
    };
  } else if (planType === 'yearly') {
    payload = {
      customer: customerId,
      billingType: 'PIX',
      value: 390.00,
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'YEARLY',
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: companyId || 'temp-company'
    };
  } else {
    throw new Error('Tipo de plano inválido. Use: monthly ou yearly');
  }

  console.log('🔑 API Key configurada (subscription):', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');
  console.log('🔑 Primeiros 10 caracteres da API Key (subscription):', process.env.VITE_ASAAS_API_KEY?.substring(0, 10) + '...');
  
  const response = await fetch('https://www.asaas.com/api/v3/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Erro ASAAS createSubscription:', data);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar assinatura'}`);
  }

  return data;
}