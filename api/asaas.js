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
      case 'getSubscription':
        result = await getSubscription(data);
        break;
      case 'updateSubscription':
        result = await updateSubscription(data);
        break;
      case 'cancelSubscription':
        result = await cancelSubscription(data);
        break;
      case 'updatePaymentMethod':
        result = await updatePaymentMethod(data);
        break;
      default:
        console.error('❌ Ação não reconhecida:', action);
        return Response.json({ 
          error: 'Ação não reconhecida. Use: createCustomer, createPayment, getSubscription, updateSubscription, cancelSubscription ou updatePaymentMethod',
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
  const temNotaFiscal = paymentData.temNotaFiscal === true;
  
  // URLs de callback para redirecionamento após pagamento
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:8080';
  const successUrl = `${baseUrl}/assinatura-sucesso`;
  const callbackUrl = `${baseUrl}/api/webhooks/asaas`;
  
  // Configuração dos planos
  const planConfig = {
    'monthly-basic': { value: 39.00, description: 'Assinatura Básica Mensal - Ateliê Pro', cycle: 'MONTHLY' },
    'yearly-basic': { value: 390.00, description: 'Assinatura Básica Anual - Ateliê Pro', cycle: 'YEARLY' },
    'monthly-professional': { value: 149.00, description: 'Assinatura Profissional Mensal - Ateliê Pro (com NF)', cycle: 'MONTHLY' },
    'yearly-professional': { value: 1488.00, description: 'Assinatura Profissional Anual - Ateliê Pro (com NF)', cycle: 'YEARLY' }
  };
  
  const config = planConfig[planType];
  if (!config) {
    throw new Error(`Tipo de plano inválido: ${planType}. Use: monthly-basic, yearly-basic, monthly-professional ou yearly-professional`);
  }
  
  payload = {
    customer: customerId,
    billingType: paymentMethod,
    value: config.value,
    description: config.description,
    externalReference: companyId || 'temp-company',
    cycle: config.cycle,
    split: [],
    callbackUrl: callbackUrl,
    successUrl: successUrl
  };
  
  // Adicionar flag de nota fiscal no metadata se disponível
  if (temNotaFiscal) {
    payload.externalReference = `${companyId || 'temp-company'}|NF=true`;
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

// Função para buscar assinatura
async function getSubscription(data) {
  const { subscriptionId } = data;
  
  if (!subscriptionId) {
    throw new Error('subscriptionId é obrigatório');
  }

  console.log('🔄 Buscando assinatura ASAAS:', subscriptionId);

  const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    }
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Erro ASAAS getSubscription:', responseData);
    throw new Error(`ASAAS Error: ${responseData.message || 'Erro ao buscar assinatura'}`);
  }

  console.log('✅ Assinatura encontrada:', responseData);
  return responseData;
}

// Função para atualizar assinatura (trocar plano)
async function updateSubscription(data) {
  const { subscriptionId, newPlanType, temNotaFiscal } = data;
  
  if (!subscriptionId || !newPlanType) {
    throw new Error('subscriptionId e newPlanType são obrigatórios');
  }

  console.log('🔄 Atualizando assinatura ASAAS:', { subscriptionId, newPlanType });

  // Configuração dos planos
  const planConfig = {
    'monthly-basic': { value: 39.00, description: 'Assinatura Básica Mensal - Ateliê Pro', cycle: 'MONTHLY' },
    'yearly-basic': { value: 390.00, description: 'Assinatura Básica Anual - Ateliê Pro', cycle: 'YEARLY' },
    'monthly-professional': { value: 149.00, description: 'Assinatura Profissional Mensal - Ateliê Pro (com NF)', cycle: 'MONTHLY' },
    'yearly-professional': { value: 1488.00, description: 'Assinatura Profissional Anual - Ateliê Pro (com NF)', cycle: 'YEARLY' }
  };
  
  const config = planConfig[newPlanType];
  if (!config) {
    throw new Error(`Tipo de plano inválido: ${newPlanType}`);
  }

  const payload = {
    value: config.value,
    description: config.description,
    cycle: config.cycle
  };

  // Buscar assinatura atual para pegar customerId
  const currentSubscription = await getSubscription({ subscriptionId });
  
  if (currentSubscription) {
    // Extrair companyId do externalReference se existir
    const externalRef = currentSubscription.externalReference || '';
    const companyId = externalRef.split('|')[0];
    
    if (temNotaFiscal) {
      payload.externalReference = `${companyId}|NF=true`;
    } else {
      payload.externalReference = companyId;
    }
  }

  console.log('📤 Payload para atualização:', payload);

  const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Erro ASAAS updateSubscription:', responseData);
    throw new Error(`ASAAS Error: ${responseData.message || 'Erro ao atualizar assinatura'}`);
  }

  console.log('✅ Assinatura atualizada com sucesso:', responseData);
  return responseData;
}

// Função para cancelar assinatura
async function cancelSubscription(data) {
  const { subscriptionId } = data;
  
  if (!subscriptionId) {
    throw new Error('subscriptionId é obrigatório');
  }

  console.log('🔄 Cancelando assinatura ASAAS:', subscriptionId);

  const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    }
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Erro ASAAS cancelSubscription:', responseData);
    throw new Error(`ASAAS Error: ${responseData.message || 'Erro ao cancelar assinatura'}`);
  }

  console.log('✅ Assinatura cancelada com sucesso:', responseData);
  return responseData;
}

// Função para atualizar forma de pagamento
async function updatePaymentMethod(data) {
  const { subscriptionId, billingType } = data;
  
  if (!subscriptionId || !billingType) {
    throw new Error('subscriptionId e billingType são obrigatórios');
  }

  console.log('🔄 Atualizando forma de pagamento:', { subscriptionId, billingType });

  const payload = {
    billingType: billingType // PIX, CREDIT_CARD, BOLETO
  };

  const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.VITE_ASAAS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Erro ASAAS updatePaymentMethod:', responseData);
    throw new Error(`ASAAS Error: ${responseData.message || 'Erro ao atualizar forma de pagamento'}`);
  }

  console.log('✅ Forma de pagamento atualizada com sucesso:', responseData);
  return responseData;
}