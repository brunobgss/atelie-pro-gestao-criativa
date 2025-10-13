// api/asaas.js - API ASAAS para Vercel
export default async function handler(req, res) {
  console.log('🚀 ASAAS API chamada:', req.method, req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - CORS preflight');
    return res.status(200).end();
  }

  // Aceitar GET para teste
  if (req.method === 'GET') {
    console.log('✅ GET request - teste da API');
    return res.status(200).json({ 
      message: 'API ASAAS funcionando!',
      method: req.method,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  // Aceitar POST
  if (req.method === 'POST') {
    console.log('✅ POST request recebido');
    
    try {
      const { action, data } = req.body;
      console.log('📝 Action:', action);
      console.log('📝 Data:', data);

      // Verificar se a API Key está configurada
      if (!process.env.VITE_ASAAS_API_KEY) {
        console.error('❌ API Key não configurada');
        return res.status(500).json({ 
          error: 'ASAAS_API_KEY não configurada no Vercel',
          success: false
        });
      }

      console.log('🔑 API Key configurada:', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');

      let result;

      switch (action) {
        case 'createCustomer':
          result = await createCustomer(data);
          break;
        case 'createPayment':
          result = await createPayment(data);
          break;
        default:
          console.error('❌ Ação não reconhecida:', action);
          return res.status(400).json({ 
            error: 'Ação não reconhecida. Use: createCustomer ou createPayment',
            success: false
          });
      }

      console.log('✅ Resultado:', result);
      return res.status(200).json({
        success: true,
        action,
        data: result
      });

    } catch (error) {
      console.error('❌ Erro na API:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Método não permitido
  console.error('❌ Método não permitido:', req.method);
  return res.status(405).json({ 
    error: 'Método não permitido',
    success: false,
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  });
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

  console.log('🔄 Criando cliente ASAAS:', payload);

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
    console.error('❌ Erro ASAAS createCustomer:', data);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar cliente'}`);
  }

  console.log('✅ Cliente criado com sucesso:', data);
  return data;
}

// Função para criar pagamento único (link de pagamento)
async function createPayment(paymentData) {
  const { customerId, planType, companyId } = paymentData;

  // Validar dados obrigatórios
  if (!customerId || !planType) {
    throw new Error('Dados obrigatórios: customerId, planType');
  }

  // Configurar dados do pagamento baseado no plano
  let payload;
  
  if (planType === 'monthly') {
    payload = {
      customer: customerId,
      billingType: 'PIX',
      value: 39.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: companyId || 'temp-company',
      callbackUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso',
      successUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso'
    };
  } else if (planType === 'yearly') {
    payload = {
      customer: customerId,
      billingType: 'PIX',
      value: 390.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: companyId || 'temp-company',
      callbackUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso',
      successUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso'
    };
  } else {
    throw new Error('Tipo de plano inválido. Use: monthly ou yearly');
  }

  console.log('🔄 Criando pagamento ASAAS:', payload);

  const response = await fetch('https://www.asaas.com/api/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Erro ASAAS createPayment:', data);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar pagamento'}`);
  }

  console.log('✅ Pagamento criado com sucesso:', data);
  return data;
}