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

    // Usar nossa API intermediária local
    const response = await fetch('/api/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: endpoint === 'customers' ? 'createCustomer' : 'createPayment',
        data: data 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ASAAS Error: ${response.status}`, errorText);
      throw new Error(`ASAAS Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ ASAAS Response: ${endpoint}`, result);
    
    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido');
    }
    
    return result.data;
  }

  async createCustomer(customerData: ASAASCustomer) {
    console.log('🔄 Dados recebidos para criar cliente:', customerData);
    
    const payload = {
      name: customerData.name,
      email: customerData.email,
      notificationDisabled: false
    };

    // Adicionar campos opcionais se fornecidos
    if (customerData.phone) payload.phone = customerData.phone;
    if (customerData.cpfCnpj) payload.cpfCnpj = customerData.cpfCnpj;

    console.log('📤 Payload final para ASAAS:', payload);
    return await this.makeRequest('customers', payload);
  }

  async createPayment(paymentData: ASAASPayment) {
    return await this.makeRequest('payments', paymentData);
  }

  async createMonthlySubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, phone?: string, paymentMethod: string = 'PIX') {
    console.log('🔄 Criando pagamento mensal...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail,
      cpfCnpj: cpfCnpj,
      phone: phone
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar o pagamento mensal
    const payment = await this.createPayment({
      customerId: customer.id,
      planType: 'monthly',
      companyId: companyId || 'temp-company',
      paymentMethod: paymentMethod
    });

    console.log('✅ Pagamento mensal criado:', payment);
    return { customer, payment };
  }

  async createYearlySubscription(userEmail: string, userName: string, companyId?: string, cpfCnpj?: string, phone?: string, paymentMethod: string = 'PIX') {
    console.log('🔄 Criando pagamento anual...');
    
    // Primeiro criar o cliente
    const customer = await this.createCustomer({
      name: userName,
      email: userEmail,
      cpfCnpj: cpfCnpj,
      phone: phone
    });

    console.log('✅ Cliente criado:', customer);

    // Depois criar o pagamento anual
    const payment = await this.createPayment({
      customerId: customer.id,
      planType: 'yearly',
      companyId: companyId || 'temp-company',
      paymentMethod: paymentMethod
    });

    console.log('✅ Pagamento anual criado:', payment);
    return { customer, payment };
  }
}

export const asaasService = new ASAASService();
