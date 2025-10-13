// src/integrations/asaas/service-vite.ts - Serviço ASAAS compatível com Vite
interface ASAASCustomer {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
}

interface ASAASPayment {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  callbackUrl?: string;
  successUrl?: string;
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

    // Usar proxy público que funciona com CORS
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const asaasUrl = `${ASAAS_API_URL}/${endpoint}`;
    const fullUrl = `${proxyUrl}${asaasUrl}`;

    console.log(`🌐 Usando proxy: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
        'X-Requested-With': 'XMLHttpRequest'
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

  async createPayment(paymentData: ASAASPayment) {
    return await this.makeRequest('payments', paymentData);
  }

  async createMonthlySubscription(userEmail: string, userName: string) {
    console.log('🔄 Criando pagamento mensal...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar o pagamento mensal
    const payment = await this.createPayment({
      customer: customer.id,
      billingType: 'PIX',
      value: 39.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Mensal - Ateliê Pro',
      externalReference: 'temp-company',
      callbackUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso',
      successUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso'
    });

    console.log('✅ Pagamento mensal criado:', payment);
    return { customer, payment };
  }

  async createYearlySubscription(userEmail: string, userName: string) {
    console.log('🔄 Criando pagamento anual...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar o pagamento anual
    const payment = await this.createPayment({
      customer: customer.id,
      billingType: 'PIX',
      value: 390.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Anual - Ateliê Pro',
      externalReference: 'temp-company',
      callbackUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso',
      successUrl: 'https://atelie-pro-gestao-criativa.vercel.app/assinatura-sucesso'
    });

    console.log('✅ Pagamento anual criado:', payment);
    return { customer, payment };
  }
}

export const asaasService = new ASAASService();
