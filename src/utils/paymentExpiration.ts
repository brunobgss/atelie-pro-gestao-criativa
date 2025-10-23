import { supabase } from '@/integrations/supabase/client';

export interface PaymentExpirationStatus {
  isPremium: boolean;
  isExpired: boolean;
  daysRemaining: number;
  planType: 'monthly' | 'yearly' | null;
  expirationDate: string | null;
  nextPaymentDue: string | null;
  shouldBlockAccess: boolean;
}

/**
 * Verifica se o pagamento do usuário expirou e se deve bloquear o acesso
 */
export async function checkPaymentExpiration(empresaId: string): Promise<PaymentExpirationStatus> {
  try {
    console.log('🔍 Verificando expiração de pagamento para empresa:', empresaId);

    // Buscar dados da empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('is_premium, trial_end_date, status, updated_at')
      .eq('id', empresaId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar dados da empresa:', error);
      return {
        isPremium: false,
        isExpired: true,
        daysRemaining: 0,
        planType: null,
        expirationDate: null,
        nextPaymentDue: null,
        shouldBlockAccess: true
      };
    }

    // Se não é premium, verificar se está no período de trial
    if (!empresa.is_premium) {
      console.log('🔍 Usuário não é premium - verificando período de trial');
      
      // Se não tem trial_end_date, permitir acesso (usuário novo)
      if (!empresa.trial_end_date) {
        console.log('✅ Usuário novo - permitindo acesso');
        return {
          isPremium: false,
          isExpired: false,
          daysRemaining: 7, // Assumir 7 dias para usuário novo
          planType: null,
          expirationDate: null,
          nextPaymentDue: null,
          shouldBlockAccess: false
        };
      }
      
      // Verificar se o trial expirou
      const trialEndDate = new Date(empresa.trial_end_date);
      const now = new Date();
      const isTrialExpired = now > trialEndDate;
      const daysRemaining = isTrialExpired ? 0 : Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (isTrialExpired) {
        console.log('❌ Trial expirado');
        return {
          isPremium: false,
          isExpired: true,
          daysRemaining: 0,
          planType: null,
          expirationDate: trialEndDate.toISOString(),
          nextPaymentDue: null,
          shouldBlockAccess: true
        };
      }
      
      console.log(`✅ Trial ativo - ${daysRemaining} dias restantes`);
      return {
        isPremium: false,
        isExpired: false,
        daysRemaining,
        planType: null,
        expirationDate: trialEndDate.toISOString(),
        nextPaymentDue: null,
        shouldBlockAccess: false
      };
    }

    // Usar trial_end_date como data de expiração do premium
    let expirationDate: Date;
    if (empresa.trial_end_date) {
      expirationDate = new Date(empresa.trial_end_date);
    } else {
      // Se não tem data, calcular 30 dias a partir da última atualização
      expirationDate = new Date(empresa.updated_at || new Date());
      expirationDate.setDate(expirationDate.getDate() + 30);
    }

    const now = new Date();
    const isExpired = now > expirationDate;
    const daysRemaining = isExpired ? 0 : Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Se expirou, desativar premium
    if (isExpired) {
      console.log('⚠️ Pagamento expirado, desativando premium');
      await deactivatePremium(empresaId);
      
      return {
        isPremium: false,
        isExpired: true,
        daysRemaining: 0,
        planType: null, // Não temos plan_type na tabela real
        expirationDate: expirationDate.toISOString(),
        nextPaymentDue: null,
        shouldBlockAccess: true
      };
    }

    // Se está próximo do vencimento (3 dias), avisar
    const shouldWarn = daysRemaining <= 3;

    console.log(`✅ Pagamento válido. ${daysRemaining} dias restantes.`);

    return {
      isPremium: true,
      isExpired: false,
      daysRemaining,
      planType: null, // Não temos plan_type na tabela real
      expirationDate: expirationDate.toISOString(),
      nextPaymentDue: shouldWarn ? expirationDate.toISOString() : null,
      shouldBlockAccess: false
    };

  } catch (error) {
    console.error('❌ Erro ao verificar expiração de pagamento:', error);
    return {
      isPremium: false,
      isExpired: true,
      daysRemaining: 0,
      planType: null,
      expirationDate: null,
      nextPaymentDue: null,
      shouldBlockAccess: true
    };
  }
}

/**
 * Desativa o premium de uma empresa
 */
async function deactivatePremium(empresaId: string): Promise<void> {
  try {
    console.log('🔄 Desativando premium para empresa:', empresaId);

    const { error } = await supabase
      .from('empresas')
      .update({
        is_premium: false,
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (error) {
      console.error('❌ Erro ao desativar premium:', error);
    } else {
      console.log('✅ Premium desativado com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao desativar premium:', error);
  }
}

/**
 * Verifica e atualiza o status de pagamento via Asaas
 */
export async function verifyPaymentWithAsaas(empresaId: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando pagamento via Asaas para empresa:', empresaId);

    // Buscar dados da empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('asaas_subscription_id, plan_type, current_period_end')
      .eq('id', empresaId)
      .single();

    if (error || !empresa) {
      console.error('❌ Erro ao buscar dados da empresa:', error);
      return false;
    }

    // Se não tem subscription ID, não pode verificar via Asaas
    if (!empresa.asaas_subscription_id) {
      console.log('⚠️ Empresa não tem subscription ID do Asaas');
      return false;
    }

    // Verificar status da subscription no Asaas
    const subscriptionStatus = await checkAsaasSubscriptionStatus(empresa.asaas_subscription_id);
    
    if (!subscriptionStatus) {
      console.error('❌ Erro ao verificar subscription no Asaas');
      return false;
    }

    // Se a subscription está ativa, atualizar dados
    if (subscriptionStatus.status === 'ACTIVE') {
      const nextDueDate = new Date(subscriptionStatus.nextDueDate);
      
      await supabase
        .from('empresas')
        .update({
          is_premium: true,
          status: 'active',
          current_period_end: nextDueDate.toISOString(),
          plan_type: subscriptionStatus.cycle === 'YEARLY' ? 'yearly' : 'monthly',
          updated_at: new Date().toISOString()
        })
        .eq('id', empresaId);

      console.log('✅ Status de pagamento atualizado via Asaas');
      return true;
    } else {
      // Subscription inativa, desativar premium
      await deactivatePremium(empresaId);
      console.log('❌ Subscription inativa no Asaas, premium desativado');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento via Asaas:', error);
    return false;
  }
}

/**
 * Verifica status da subscription no Asaas
 */
async function checkAsaasSubscriptionStatus(subscriptionId: string): Promise<any> {
  try {
    const response = await fetch(`/api/asaas/subscription/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao verificar subscription: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao verificar subscription no Asaas:', error);
    return null;
  }
}

/**
 * Verifica todos os usuários premium e desativa os expirados
 */
export async function checkAllPremiumUsers(): Promise<void> {
  try {
    console.log('🔍 Verificando todos os usuários premium...');

    // Buscar todas as empresas premium
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('id, nome, is_premium, current_period_end, plan_type, asaas_subscription_id')
      .eq('is_premium', true);

    if (error) {
      console.error('❌ Erro ao buscar empresas premium:', error);
      return;
    }

    console.log(`📊 Encontradas ${empresas?.length || 0} empresas premium`);

    for (const empresa of empresas || []) {
      const status = await checkPaymentExpiration(empresa.id);
      
      if (status.shouldBlockAccess) {
        console.log(`❌ Empresa ${empresa.nome} (${empresa.id}) bloqueada - pagamento expirado`);
      } else {
        console.log(`✅ Empresa ${empresa.nome} (${empresa.id}) ativa - ${status.daysRemaining} dias restantes`);
      }
    }

    console.log('✅ Verificação de usuários premium concluída');

  } catch (error) {
    console.error('❌ Erro ao verificar usuários premium:', error);
  }
}
