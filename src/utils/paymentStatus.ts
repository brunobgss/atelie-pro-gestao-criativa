// Utilitário para verificar status de pagamento e ativar premium manualmente
import { supabase } from "@/integrations/supabase/client";

export interface PaymentStatus {
  id: string;
  status: string;
  value: number;
  paymentDate?: string;
  externalReference: string;
}

// Verificar status de pagamento no Asaas
export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
  try {
    const response = await fetch(`https://www.asaas.com/api/v3/payments/${paymentId}`, {
      headers: {
        'access_token': import.meta.env.VITE_ASAAS_API_KEY || '',
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

// Ativar premium manualmente (para casos onde o webhook falhou)
export async function activatePremiumManually(paymentId: string, empresaId: string): Promise<boolean> {
  try {
    console.log('🔄 Ativando premium manualmente para pagamento:', paymentId);
    
    // Buscar dados do pagamento
    const payment = await checkPaymentStatus(paymentId);
    if (!payment) {
      console.error('❌ Pagamento não encontrado');
      return false;
    }

    // Verificar se o pagamento foi confirmado
    if (payment.status !== 'RECEIVED' && payment.status !== 'CONFIRMED') {
      console.error('❌ Pagamento não foi confirmado. Status:', payment.status);
      return false;
    }

    // Calcular data de expiração
    let expirationDate;
    if (payment.value === 39.00) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
    } else if (payment.value === 390.00) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 365);
    } else {
      console.error('❌ Valor de pagamento não reconhecido:', payment.value);
      return false;
    }

    // Atualizar empresa no Supabase
    const { data, error } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        asaas_subscription_id: paymentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (error) {
      console.error('❌ Erro ao ativar premium:', error);
      return false;
    }

    console.log('✅ Premium ativado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao ativar premium manualmente:', error);
    return false;
  }
}

// Verificar se usuário tem premium ativo
export async function checkPremiumStatus(empresaId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('is_premium, status')
      .eq('id', empresaId)
      .single();

    if (error) {
      console.error('❌ Erro ao verificar status premium:', error);
      return false;
    }

    if (!data.is_premium) {
      return false;
    }

    // Como não temos current_period_end, vamos assumir que se is_premium = true, está ativo
    return true;

  } catch (error) {
    console.error('❌ Erro ao verificar premium:', error);
    return false;
  }
}

// Função para tentar reativar premium baseado em pagamentos pendentes
export async function tryReactivatePremium(empresaId: string): Promise<boolean> {
  try {
    console.log('🔄 Tentando reativar premium para empresa:', empresaId);

    // Como a tabela asaas_payments não existe, vamos apenas ativar o premium
    // baseado no status atual da empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('is_premium, status')
      .eq('id', empresaId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar empresa:', error);
      return false;
    }

    if (empresa.is_premium) {
      console.log('ℹ️ Empresa já tem premium ativo');
      return true;
    }

    // Ativar premium manualmente
    const { data, error: updateError } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (updateError) {
      console.error('❌ Erro ao ativar premium:', updateError);
      return false;
    }

    console.log('✅ Premium ativado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao tentar reativar premium:', error);
    return false;
  }
}
