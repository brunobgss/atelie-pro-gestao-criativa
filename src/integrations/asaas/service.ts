// Serviço de integração com ASAAS para pagamentos
// Documentação: https://docs.asaas.com/

interface ASAASCustomer {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
}

interface ASAASSubscription {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  nextDueDate: string;
  description: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  externalReference?: string;
}

interface ASAASCheckout {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  callbackUrl?: string;
  successUrl?: string;
}

// Configuração do ASAAS (você deve definir essas variáveis no .env)
const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';
const ASAAS_MOCK_MODE = import.meta.env.VITE_ASAAS_MOCK_MODE === 'true';

// Avisos úteis apenas em desenvolvimento
if (import.meta.env.DEV) {
  if (!ASAAS_API_KEY && !ASAAS_MOCK_MODE) {
    console.warn('⚠️ ASAAS_API_KEY não configurada! Configure no arquivo .env.local ou defina VITE_ASAAS_MOCK_MODE=true para testes locais.');
  }

  if (ASAAS_MOCK_MODE) {
    console.warn('⚠️ ASAAS rodando em modo simulado (VITE_ASAAS_MOCK_MODE=true). Configure VITE_ASAAS_API_KEY para habilitar cobranças reais.');
  }
}

class ASAASService {
  private async makeRequest(action: string, data: unknown) {
    console.log(`🔄 ASAAS Request: ${action}`, data);

    if (ASAAS_MOCK_MODE) {
      const mockResponse = createMockResponse(action, data);
      console.log(`🧪 [ASAAS MOCK] Response: ${action}`, mockResponse);
      return mockResponse;
    }

    const response = await fetch('/api/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ ASAAS API Error: ${response.status} ${response.statusText}`, responseData);
      throw new Error(`ASAAS API Error: ${response.status} ${response.statusText} - ${responseData.error || 'Erro desconhecido'}`);
    }

    console.log(`✅ ASAAS Response: ${action}`, responseData);
    // Retornar o objeto completo da resposta, não apenas .data
    return responseData;
  }

  // Criar cliente no ASAAS
  async createCustomer(customer: ASAASCustomer) {
    try {
      const response = await this.makeRequest('createCustomer', customer);
      console.log('🔍 createCustomer response:', response);
      // A resposta agora vem com { success, action, data }
      if (response.success && response.data) {
        return { success: true, customer: response.data };
      }
      return response;
    } catch (error) {
      console.error('Erro ao criar cliente ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Criar assinatura recorrente
  async createSubscription(subscription: ASAASSubscription) {
    try {
      const response = await this.makeRequest('createSubscription', subscription);
      console.log('🔍 createSubscription response:', response);
      // A resposta agora vem com { success, action, data }
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return response;
    } catch (error) {
      console.error('Erro ao criar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Criar checkout único (para pagamento único)
  async createCheckout(checkout: ASAASCheckout) {
    try {
      const response = await this.makeRequest('/payments', 'POST', checkout);
      return { success: true, data: response };
    } catch (error) {
      console.error('Erro ao criar checkout ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar informações de um pagamento
  async getPayment(paymentId: string) {
    try {
      const response = await this.makeRequest(`/payments/${paymentId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Erro ao buscar pagamento ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar informações de uma assinatura
  async getSubscription(subscriptionId: string) {
    try {
      const response = await this.makeRequest('getSubscription', { subscriptionId });
      return { success: response.success, data: response.data };
    } catch (error) {
      console.error('Erro ao buscar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar assinatura (trocar plano)
  async updateSubscription(subscriptionId: string, newPlanType: string, temNotaFiscal: boolean = false) {
    try {
      const response = await this.makeRequest('updateSubscription', { 
        subscriptionId, 
        newPlanType,
        temNotaFiscal 
      });
      return { success: response.success, data: response.data };
    } catch (error) {
      console.error('Erro ao atualizar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await this.makeRequest('cancelSubscription', { subscriptionId });
      return { success: response.success, data: response.data };
    } catch (error) {
      console.error('Erro ao cancelar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar forma de pagamento
  async updatePaymentMethod(subscriptionId: string, billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO') {
    try {
      const response = await this.makeRequest('updatePaymentMethod', { 
        subscriptionId, 
        billingType 
      });
      return { success: response.success, data: response.data };
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Gerar URL de checkout para plano mensal básico
  async createMonthlySubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, telefone?: string, paymentMethod?: string) {
    const customerData = {
      name: userName,
      email: userEmail,
      phone: telefone,
      cpfCnpj: cpfCnpj
    };

    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    const paymentData = {
      customerId: customerResult.customer.id,
      planType: 'monthly-basic',
      companyId: companyId,
      paymentMethod: paymentMethod || 'PIX',
      temNotaFiscal: false
    };

    return await this.makeRequest('createPayment', paymentData);
  }

  // Gerar URL de checkout para plano anual básico
  async createYearlySubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, telefone?: string, paymentMethod?: string) {
    const customerData = {
      name: userName,
      email: userEmail,
      phone: telefone,
      cpfCnpj: cpfCnpj
    };

    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    const paymentData = {
      customerId: customerResult.customer.id,
      planType: 'yearly-basic',
      companyId: companyId,
      paymentMethod: paymentMethod || 'PIX',
      temNotaFiscal: false
    };

    return await this.makeRequest('createPayment', paymentData);
  }

  // Gerar URL de checkout para plano mensal profissional
  async createMonthlyProfessionalSubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, telefone?: string, paymentMethod?: string) {
    const customerData = {
      name: userName,
      email: userEmail,
      phone: telefone,
      cpfCnpj: cpfCnpj
    };

    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    const paymentData = {
      customerId: customerResult.customer.id,
      planType: 'monthly-professional',
      companyId: companyId,
      paymentMethod: paymentMethod || 'PIX',
      temNotaFiscal: true
    };

    return await this.makeRequest('createPayment', paymentData);
  }

  // Gerar URL de checkout para plano anual profissional
  async createYearlyProfessionalSubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, telefone?: string, paymentMethod?: string) {
    const customerData = {
      name: userName,
      email: userEmail,
      phone: telefone,
      cpfCnpj: cpfCnpj
    };

    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    const paymentData = {
      customerId: customerResult.customer.id,
      planType: 'yearly-professional',
      companyId: companyId,
      paymentMethod: paymentMethod || 'PIX',
      temNotaFiscal: true
    };

    return await this.makeRequest('createPayment', paymentData);
  }
}

export const asaasService = new ASAASService();

// Funções auxiliares para integração
export const createSubscriptionCheckout = async (planType: 'monthly' | 'yearly', userEmail: string, userName: string) => {
  if (planType === 'monthly') {
    return await asaasService.createMonthlySubscription(userEmail, userName);
  } else {
    return await asaasService.createYearlySubscription(userEmail, userName);
  }
};

export const getSubscriptionStatus = async (subscriptionId: string) => {
  return await asaasService.getSubscription(subscriptionId);
};

export const cancelUserSubscription = async (subscriptionId: string) => {
  return await asaasService.cancelSubscription(subscriptionId);
};

type MockResponse = {
  success: boolean;
  action: string;
  data: Record<string, unknown>;
  mock: true;
  message: string;
};

function createMockResponse(action: string, data: unknown): MockResponse {
  const timestamp = Date.now();
  const baseMessage = 'Modo simulado: configure VITE_ASAAS_API_KEY para gerar cobranças reais.';

  if (action === 'createCustomer') {
    const customer = (data as ASAASCustomer) || {};
    return {
      success: true,
      action,
      mock: true,
      message: baseMessage,
      data: {
        id: `mock-customer-${timestamp}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpfCnpj,
        object: 'customer',
        mock: true,
        message: baseMessage,
      },
    };
  }

  if (
    action === 'createPayment' ||
    action === 'createSubscription' ||
    action.startsWith('/payments')
  ) {
    const payload = (data as Record<string, unknown>) || {};
    const planType = (payload.planType as string) || 'unknown';
    const mockUrl = `https://app.ateliepro.online/mock-payment/${planType}/${timestamp}`;

    return {
      success: true,
      action,
      mock: true,
      message: baseMessage,
      data: {
        id: `mock-payment-${timestamp}`,
        object: 'subscription',
        status: 'PENDING',
        planType,
        invoiceUrl: mockUrl,
        paymentLink: mockUrl,
        bankSlipUrl: mockUrl,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        mock: true,
        message: baseMessage,
      },
    };
  }

  if (action === 'getSubscription') {
    const subscriptionId =
      ((data as { subscriptionId?: string }) || {}).subscriptionId ||
      `mock-subscription-${timestamp}`;

    return {
      success: true,
      action,
      mock: true,
      message: baseMessage,
      data: {
        id: subscriptionId,
        status: 'PENDING',
        object: 'subscription',
        mock: true,
        message: baseMessage,
      },
    };
  }

  if (action === 'updateSubscription' || action === 'cancelSubscription' || action === 'updatePaymentMethod') {
    return {
      success: true,
      action,
      mock: true,
      message: baseMessage,
      data: {
        id: `mock-${action}-${timestamp}`,
        status: 'SUCCESS',
        mock: true,
        message: baseMessage,
      },
    };
  }

  return {
    success: true,
    action,
    mock: true,
    message: baseMessage,
    data: {
      id: `mock-${action}-${timestamp}`,
      mock: true,
      message: baseMessage,
    },
  };
}
