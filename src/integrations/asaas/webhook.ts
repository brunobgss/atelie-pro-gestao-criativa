// Webhook handler para ASAAS
// Este arquivo seria usado em um backend (Node.js, Python, etc.)
// Para o frontend, vamos simular o comportamento

export interface ASAASWebhookPayload {
  event: 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED' | 'PAYMENT_RESTORED' | 'PAYMENT_REFUNDED' | 'PAYMENT_RECEIVED_IN_CASH_UNDONE' | 'PAYMENT_CHARGEBACK_REQUESTED' | 'PAYMENT_CHARGEBACK_DISPUTE' | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL' | 'PAYMENT_DUNNING_RECEIVED' | 'PAYMENT_DUNNING_REQUESTED' | 'PAYMENT_BANK_SLIP_VIEWED' | 'PAYMENT_CHECKOUT_VIEWED';
  payment: {
    id: string;
    customer: string;
    paymentLink: string;
    value: number;
    netValue: number;
    originalValue: number;
    interestValue: number;
    description: string;
    billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED' | 'DEBIT_CARD';
    status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
    pixTransaction: string;
    dueDate: string;
    originalDueDate: string;
    paymentDate: string;
    clientPaymentDate: string;
    installmentNumber: number;
    invoiceUrl: string;
    bankSlipUrl: string;
    transactionReceiptUrl: string;
    invoiceNumber: string;
    externalReference: string;
    deleted: boolean;
    postalService: boolean;
    creditCard: {
      creditCardNumber: string;
      creditCardBrand: string;
      creditCardToken: string;
    };
  };
}

// Função para processar webhook do ASAAS
export function processASAASWebhook(payload: ASAASWebhookPayload) {
  console.log('🔔 Webhook ASAAS recebido:', payload.event);
  
  switch (payload.event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      handlePaymentReceived(payload);
      break;
    case 'PAYMENT_OVERDUE':
      handlePaymentOverdue(payload);
      break;
    case 'PAYMENT_REFUNDED':
      handlePaymentRefunded(payload);
      break;
    default:
      console.log('Evento não tratado:', payload.event);
  }
}

// Processar pagamento recebido
function handlePaymentReceived(payload: ASAASWebhookPayload) {
  const { payment } = payload;
  
  console.log('💰 Pagamento recebido:', {
    id: payment.id,
    value: payment.value,
    customer: payment.customer,
    externalReference: payment.externalReference
  });
  
  // Aqui você atualizaria o banco de dados:
  // 1. Marcar usuário como premium
  // 2. Atualizar data de expiração da assinatura
  // 3. Enviar email de confirmação
  // 4. Ativar recursos premium
  
  // Exemplo de atualização no Supabase:
  /*
  await supabase
    .from('empresas')
    .update({
      is_premium: true,
      status: 'active',
      subscription_id: payment.id,
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', payment.externalReference);
  */
}

// Processar pagamento em atraso
function handlePaymentOverdue(payload: ASAASWebhookPayload) {
  const { payment } = payload;
  
  console.log('⚠️ Pagamento em atraso:', {
    id: payment.id,
    customer: payment.customer,
    dueDate: payment.dueDate
  });
  
  // Aqui você:
  // 1. Enviar email de lembrete
  // 2. Marcar como pendente
  // 3. Preparar para suspensão
}

// Processar reembolso
function handlePaymentRefunded(payload: ASAASWebhookPayload) {
  const { payment } = payload;
  
  console.log('↩️ Pagamento reembolsado:', {
    id: payment.id,
    customer: payment.customer
  });
  
  // Aqui você:
  // 1. Reverter para trial
  // 2. Desativar recursos premium
  // 3. Enviar email de confirmação
}

// Função para verificar status de pagamento manualmente
export async function checkPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(`https://www.asaas.com/api/v3/payments/${paymentId}`, {
      headers: {
        'access_token': import.meta.env.VITE_ASAAS_API_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento: ${response.status}`);
    }
    
    const payment = await response.json();
    return payment;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return null;
  }
}

// Função para verificar status da assinatura
export async function checkSubscriptionStatus(subscriptionId: string) {
  try {
    const response = await fetch(`https://www.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
      headers: {
        'access_token': import.meta.env.VITE_ASAAS_API_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar assinatura: ${response.status}`);
    }
    
    const subscription = await response.json();
    return subscription;
  } catch (error) {
    console.error('Erro ao verificar status da assinatura:', error);
    return null;
  }
}
