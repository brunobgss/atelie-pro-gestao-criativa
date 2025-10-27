// api/asaas.js - API ASAAS simplificada
export async function POST(req) {
  console.log('🚀 ASAAS API chamada (POST)');
  
  try {
    const body = await req.json();
    const { action, data } = body;
    console.log('📝 Action:', action);
    console.log('📝 Data:', data);

    // Verificar se a API Key está configurada
    if (!process.env.VITE_ASAAS_API_KEY) {
      console.error('❌ API Key não configurada');
      return Response.json({ 
        error: 'ASAAS_API_KEY não configurada no Vercel',
        success: false
      }, { status: 500 });
    }

    console.log('🔑 API Key configurada:', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');

    let result;

    switch (action) {
      case 'createCustomer':
        result = await createCustomer(data);
        break;
      case 'createPayment':
        result = await createSubscription(data);
        break;
      default:
        console.error('❌ Ação não reconhecida:', action);
        return Response.json({ 
          error: 'Ação não reconhecida. Use: createCustomer ou createPayment',
          success: false
        }, { status: 400 });
    }

    console.log('✅ Resultado:', result);
    return Response.json({
      success: true,
      action,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro na API:', error);
    console.error('❌ Stack trace:', error.stack);
    return Response.json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  console.log('✅ GET request - teste da API');
  return Response.json({ 
    message: 'API ASAAS funcionando!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }, { status: 200 });
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

// Função para criar assinatura recorrente
async function createSubscription(paymentData) {
  console.log('🔄 Criando assinatura recorrente ASAAS:', paymentData);

  const { customerId, planType, companyId, paymentMethod = 'PIX' } = paymentData;

  // Validar dados obrigatórios
  if (!customerId || !planType) {
    throw new Error('Dados obrigatórios: customerId, planType');
  }

  // Configurar dados da assinatura baseado no plano
  let payload;
  
  // URLs de callback para redirecionamento após pagamento
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:8080';
  const successUrl = `${baseUrl}/assinatura-sucesso`;
  const callbackUrl = `${baseUrl}/api/webhooks/asaas`;
  
  if (planType === 'monthly') {
    payload = {
      customer: customerId,
      billingType: paymentMethod,
      value: 39.00,
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: companyId || 'temp-company',
      cycle: 'MONTHLY', // Cobrança mensal recorrente
      split: [], // Não dividir com ninguém
      callbackUrl: callbackUrl,
      successUrl: successUrl
    };
  } else if (planType === 'yearly') {
    payload = {
      customer: customerId,
      billingType: paymentMethod,
      value: 390.00, // R$ 390,00 anual
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: companyId || 'temp-company',
      cycle: 'YEARLY', // Cobrança anual recorrente
      split: [], // Não dividir com ninguém
      callbackUrl: callbackUrl,
      successUrl: successUrl
    };
  } else {
    throw new Error('Tipo de plano inválido. Use: monthly ou yearly');
  }

  console.log('📤 Payload para ASAAS:', payload);
  console.log('🔑 API Key presente:', process.env.VITE_ASAAS_API_KEY ? 'SIM' : 'NÃO');

  const response = await fetch('https://www.asaas.com/api/v3/subscriptions', {
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

  console.log('✅ Assinatura criada com sucesso:', data);
  return data;
}