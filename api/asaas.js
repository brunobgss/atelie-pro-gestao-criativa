// api/asaas.js - API ASAAS simplificada
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
      console.error('❌ Stack trace:', error.stack);
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  console.log('🔄 Criando cliente ASAAS:', customerData);

  const payload = {
    name: customerData.name,
    email: customerData.email,
    notificationDisabled: false
  };

  // Adicionar campos opcionais se fornecidos
  if (customerData.phone) payload.phone = customerData.phone;
  if (customerData.cpfCnpj) payload.cpfCnpj = customerData.cpfCnpj;

  console.log('📤 Payload para ASAAS:', payload);

  const response = await fetch('https://www.asaas.com/api/v3/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  console.log('📡 Status da resposta:', response.status);

  const data = await response.json();
  console.log('📡 Dados da resposta:', data);

  if (!response.ok) {
    console.error('❌ Erro ASAAS createCustomer:', data);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar cliente'}`);
  }

  console.log('✅ Cliente criado com sucesso:', data);
  return data;
}

// Função para criar pagamento único (link de pagamento)
async function createPayment(paymentData) {
  console.log('🔄 Criando pagamento ASAAS:', paymentData);

  const { customerId, planType, companyId, paymentMethod = 'PIX' } = paymentData;

  // Validar dados obrigatórios
  if (!customerId || !planType) {
    throw new Error('Dados obrigatórios: customerId, planType');
  }

  // Configurar dados do pagamento baseado no plano
  let payload;
  
  if (planType === 'monthly') {
    payload = {
      customer: customerId,
      billingType: paymentMethod,
      value: 39.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: companyId || 'temp-company'
    };
  } else if (planType === 'yearly') {
    payload = {
      customer: customerId,
      billingType: paymentMethod,
      value: 390.00, // R$ 390,00 anual
      dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 365 dias
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: companyId || 'temp-company'
    };
  } else {
    throw new Error('Tipo de plano inválido. Use: monthly ou yearly');
  }

  console.log('📤 Payload para ASAAS:', payload);
  console.log('🔑 API Key presente:', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');

  const response = await fetch('https://www.asaas.com/api/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  console.log('📡 Status da resposta:', response.status);
  console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

  const data = await response.json();
  console.log('📡 Dados da resposta:', data);

  if (!response.ok) {
    console.error('❌ Erro ASAAS createPayment:', data);
    console.error('❌ Status:', response.status);
    console.error('❌ Status Text:', response.statusText);
    throw new Error(`ASAAS Error: ${data.message || 'Erro ao criar pagamento'}`);
  }

  console.log('✅ Pagamento criado com sucesso:', data);
  return data;
}