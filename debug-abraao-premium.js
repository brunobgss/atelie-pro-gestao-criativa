// Script para simular a verificação de premium do frontend
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simular a função checkPaymentExpiration do frontend
async function checkPaymentExpiration(empresaId) {
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

    console.log('\n📊 Dados da empresa no banco:');
    console.log('   is_premium:', empresa.is_premium);
    console.log('   status:', empresa.status);
    console.log('   trial_end_date:', empresa.trial_end_date);
    console.log('   updated_at:', empresa.updated_at);

    // Se não é premium, verificar se está no período de trial
    if (!empresa.is_premium) {
      console.log('\n🔍 Usuário NÃO é premium - verificando período de trial');
      
      // Se não tem trial_end_date, permitir acesso (usuário novo)
      if (!empresa.trial_end_date) {
        console.log('✅ Usuário novo - permitindo acesso');
        return {
          isPremium: false,
          isExpired: false,
          daysRemaining: 7,
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
      
      console.log('   Trial end date:', trialEndDate.toISOString());
      console.log('   Now:', now.toISOString());
      console.log('   Is trial expired?', isTrialExpired);
      console.log('   Days remaining:', daysRemaining);
      
      if (isTrialExpired) {
        console.log('❌ RESULTADO: Trial expirado - BLOQUEAR ACESSO');
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
      
      console.log(`✅ RESULTADO: Trial ativo - PERMITIR ACESSO`);
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

    console.log('\n✅ Usuário É PREMIUM');

    // Usar trial_end_date como data de expiração do premium
    let expirationDate;
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

    console.log('   Expiration date:', expirationDate.toISOString());
    console.log('   Now:', now.toISOString());
    console.log('   Is expired?', isExpired);
    console.log('   Days remaining:', daysRemaining);

    if (isExpired) {
      console.log('❌ RESULTADO: Premium EXPIROU - BLOQUEAR ACESSO');
      return {
        isPremium: false,
        isExpired: true,
        daysRemaining: 0,
        planType: null,
        expirationDate: expirationDate.toISOString(),
        nextPaymentDue: null,
        shouldBlockAccess: true
      };
    }

    console.log('✅ RESULTADO: Premium ATIVO - PERMITIR ACESSO');

    return {
      isPremium: true,
      isExpired: false,
      daysRemaining,
      planType: null,
      expirationDate: expirationDate.toISOString(),
      nextPaymentDue: null,
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

async function main() {
  console.log('🔍 Simulando verificação de premium para abraaoelionai032@gmail.com\n');
  console.log('=' .repeat(70));
  
  const empresaId = 'a6b7fc5c-a957-411f-8ac6-524be28ce901';
  
  const result = await checkPaymentExpiration(empresaId);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 RESULTADO FINAL:');
  console.log('   shouldBlockAccess:', result.shouldBlockAccess ? '❌ SIM - BLOQUEAR' : '✅ NÃO - PERMITIR');
  console.log('   isPremium:', result.isPremium);
  console.log('   isExpired:', result.isExpired);
  console.log('   daysRemaining:', result.daysRemaining);
  console.log('   expirationDate:', result.expirationDate);
  
  if (result.shouldBlockAccess) {
    console.log('\n⚠️ O USUÁRIO SERÁ REDIRECIONADO PARA A PÁGINA DE ASSINATURA');
  } else {
    console.log('\n✅ O USUÁRIO TERÁ ACESSO LIBERADO AO SISTEMA');
  }
}

main();
