// scripts/simulate-payment-expiration.js - Simular expiração de pagamento
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulatePaymentExpiration() {
  console.log('🔍 Simulando expiração de pagamento...');
  
  try {
    // Buscar dados da empresa do Bruno
    const empresaId = '6dcece50-9535-4dd4-bfe1-848654417629';
    
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nome, is_premium, trial_end_date, status, updated_at')
      .eq('id', empresaId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar empresa:', error);
      return;
    }

    console.log('📊 Estado atual da empresa:');
    console.log(`   - Nome: ${empresa.nome}`);
    console.log(`   - Premium: ${empresa.is_premium}`);
    console.log(`   - Status: ${empresa.status}`);
    console.log(`   - Trial End: ${empresa.trial_end_date}`);

    // Simular que o pagamento expirou (definir data de expiração no passado)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Ontem

    console.log('\n🔄 Simulando pagamento expirado...');
    console.log(`   - Nova data de expiração: ${expiredDate.toISOString()}`);

    // Atualizar empresa com data expirada
    const { error: updateError } = await supabase
      .from('empresas')
      .update({
        trial_end_date: expiredDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (updateError) {
      console.error('❌ Erro ao atualizar empresa:', updateError);
      return;
    }

    console.log('✅ Data de expiração atualizada para o passado');

    // Agora testar a verificação de expiração
    console.log('\n🔍 Testando verificação de expiração...');
    
    const now = new Date();
    const isExpired = now > expiredDate;
    const daysRemaining = isExpired ? 0 : Math.ceil((expiredDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`   - Data atual: ${now.toISOString()}`);
    console.log(`   - Data de expiração: ${expiredDate.toISOString()}`);
    console.log(`   - Expirado: ${isExpired}`);
    console.log(`   - Dias restantes: ${daysRemaining}`);
    console.log(`   - Deve bloquear acesso: ${isExpired}`);

    if (isExpired) {
      console.log('\n🚫 RESULTADO: Usuário deve ser BLOQUEADO automaticamente!');
      console.log('   - Sistema detectou pagamento expirado');
      console.log('   - Usuário será redirecionado para página de assinatura');
      console.log('   - Acesso às funcionalidades será negado');
    }

    // Restaurar data válida para não quebrar o sistema
    console.log('\n🔄 Restaurando data válida...');
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);

    const { error: restoreError } = await supabase
      .from('empresas')
      .update({
        trial_end_date: validDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (restoreError) {
      console.error('❌ Erro ao restaurar data:', restoreError);
    } else {
      console.log('✅ Data restaurada para 30 dias no futuro');
    }

  } catch (error) {
    console.error('❌ Erro durante simulação:', error);
  }
}

simulatePaymentExpiration();
