// Serviço de integração com ASAAS para pagamentos - Versão direta
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

// Configuração do ASAAS
const ASAAS_API_URL = 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';

// Verificar se a API Key está configurada
if (!ASAAS_API_KEY) {
  console.warn('⚠️ ASAAS_API_KEY não configurada! Configure no arquivo .env.local');
}

class ASAASService {
  private async makeRequest(endpoint: string, data: any) {
    console.log(`🔄 ASAAS Request: ${endpoint}`, data);

    const response = await fetch(`${ASAAS_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ASAAS Error: ${response.status}`, errorText);
      throw new Error(`ASAAS Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ ASAAS Response: ${endpoint}`, result);
    return result;
  }

  async createCustomer(customerData: ASAASCustomer) {
    const payload = {
      name: customerData.name,
      email: customerData.email,
      notificationDisabled: false
    };

    // Adicionar campos opcionais se fornecidos
    if (customerData.phone) payload.phone = customerData.phone;
    if (customerData.cpfCnpj) payload.cpfCnpj = customerData.cpfCnpj;

    return await this.makeRequest('customers', payload);
  }

  async createSubscription(subscriptionData: ASAASSubscription) {
    return await this.makeRequest('subscriptions', subscriptionData);
  }

  async createMonthlySubscription(userEmail: string, userName: string) {
    console.log('🔄 Criando assinatura mensal...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar a assinatura mensal
    const subscription = await this.createSubscription({
      customer: customer.id,
      billingType: 'PIX',
      value: 39.00,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: 'temp-company'
    });

    console.log('✅ Assinatura mensal criada:', subscription);
    return { customer, subscription };
  }

  async createYearlySubscription(userEmail: string, userName: string) {
    console.log('🔄 Criando assinatura anual...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar a assinatura anual
    const subscription = await this.createSubscription({
      customer: customer.id,
      billingType: 'PIX',
      value: 390.00,
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'YEARLY',
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: 'temp-company'
    });

    console.log('✅ Assinatura anual criada:', subscription);
    return { customer, subscription };
  }
}

export const asaasService = new ASAASService();
