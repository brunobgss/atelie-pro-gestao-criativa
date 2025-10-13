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

// Verificar se a API Key está configurada
if (!ASAAS_API_KEY) {
  console.warn('⚠️ ASAAS_API_KEY não configurada! Configure no arquivo .env.local');
}

class ASAASService {
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não configurada. Configure no arquivo .env.local');
    }

    console.log(`🔄 ASAAS Request: ${method} ${endpoint}`, data);

    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ ASAAS API Error: ${response.status} ${response.statusText}`, responseData);
      throw new Error(`ASAAS API Error: ${response.status} ${response.statusText} - ${responseData.message || 'Erro desconhecido'}`);
    }

    console.log(`✅ ASAAS Response: ${method} ${endpoint}`, responseData);
    return responseData;
  }

  // Criar cliente no ASAAS
  async createCustomer(customer: ASAASCustomer) {
    try {
      const response = await this.makeRequest('/customers', 'POST', customer);
      return { success: true, data: response };
    } catch (error) {
      console.error('Erro ao criar cliente ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Criar assinatura recorrente
  async createSubscription(subscription: ASAASSubscription) {
    try {
      const response = await this.makeRequest('/subscriptions', 'POST', subscription);
      return { success: true, data: response };
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
      const response = await this.makeRequest(`/subscriptions/${subscriptionId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Erro ao buscar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await this.makeRequest(`/subscriptions/${subscriptionId}`, 'DELETE');
      return { success: true, data: response };
    } catch (error) {
      console.error('Erro ao cancelar assinatura ASAAS:', error);
      return { success: false, error: error.message };
    }
  }

  // Gerar URL de checkout para plano mensal
  async createMonthlySubscription(userEmail: string, userName: string) {
    const customerData = {
      name: userName,
      email: userEmail,
    };

    const subscriptionData = {
      customer: '', // Será preenchido após criar o cliente
      billingType: 'CREDIT_CARD' as const,
      value: 39.00,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
      description: 'Ateliê Pro - Assinatura Mensal',
      cycle: 'MONTHLY' as const,
      externalReference: `monthly-${Date.now()}`,
      callbackUrl: `${window.location.origin}/api/webhooks/asaas`,
      successUrl: `${window.location.origin}/assinatura/sucesso`,
    };

    // Criar cliente primeiro
    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    // Criar assinatura
    subscriptionData.customer = customerResult.data.id;
    return await this.createSubscription(subscriptionData);
  }

  // Gerar URL de checkout para plano anual
  async createYearlySubscription(userEmail: string, userName: string) {
    const customerData = {
      name: userName,
      email: userEmail,
    };

    const subscriptionData = {
      customer: '', // Será preenchido após criar o cliente
      billingType: 'CREDIT_CARD' as const,
      value: 390.00,
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 ano
      description: 'Ateliê Pro - Assinatura Anual (2 meses grátis)',
      cycle: 'YEARLY' as const,
      externalReference: `yearly-${Date.now()}`,
      callbackUrl: `${window.location.origin}/api/webhooks/asaas`,
      successUrl: `${window.location.origin}/assinatura/sucesso`,
    };

    // Criar cliente primeiro
    const customerResult = await this.createCustomer(customerData);
    if (!customerResult.success) {
      return customerResult;
    }

    // Criar assinatura
    subscriptionData.customer = customerResult.data.id;
    return await this.createSubscription(subscriptionData);
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


