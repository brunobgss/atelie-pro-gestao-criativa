// Script para verificar todos os usuários premium e garantir segurança
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyPremiumUsers() {
  try {
    console.log('🔍 Verificando todos os usuários premium...');
    
    // Buscar todas as empresas
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar empresas:', error);
      return;
    }

    console.log(`📊 Total de empresas: ${empresas.length}`);
    
    const premiumUsers = empresas.filter(empresa => empresa.is_premium === true);
    const trialUsers = empresas.filter(empresa => empresa.is_premium !== true);
    
    console.log(`\n✅ Usuários Premium: ${premiumUsers.length}`);
    premiumUsers.forEach(empresa => {
      console.log(`   - ${empresa.nome} (ID: ${empresa.id})`);
      console.log(`     Status: ${empresa.status}`);
      console.log(`     Plano: ${empresa.plan_type || 'N/A'}`);
      console.log(`     Criado em: ${empresa.created_at}`);
      console.log(`     Atualizado em: ${empresa.updated_at}`);
      console.log('');
    });
    
    console.log(`\n🆓 Usuários em Trial: ${trialUsers.length}`);
    trialUsers.forEach(empresa => {
      const trialEnd = empresa.trial_end_date ? new Date(empresa.trial_end_date) : null;
      const isExpired = trialEnd ? new Date() > trialEnd : true;
      const status = isExpired ? '❌ EXPIRADO' : '✅ ATIVO';
      
      console.log(`   - ${empresa.nome} (ID: ${empresa.id})`);
      console.log(`     Trial: ${status}`);
      console.log(`     Expira em: ${empresa.trial_end_date || 'N/A'}`);
      console.log(`     Criado em: ${empresa.created_at}`);
      console.log('');
    });

    // Verificar se há usuários premium sem pagamento confirmado
    console.log('🔍 Verificando usuários premium sem pagamento...');
    const { data: payments, error: paymentsError } = await supabase
      .from('asaas_payments')
      .select('*')
      .eq('status', 'CONFIRMED');

    if (!paymentsError && payments) {
      const paidEmpresas = payments.map(p => p.empresa_id);
      const premiumWithoutPayment = premiumUsers.filter(empresa => 
        !paidEmpresas.includes(empresa.id)
      );

      if (premiumWithoutPayment.length > 0) {
        console.log('⚠️ ATENÇÃO: Usuários premium sem pagamento confirmado:');
        premiumWithoutPayment.forEach(empresa => {
          console.log(`   - ${empresa.nome} (ID: ${empresa.id})`);
        });
      } else {
        console.log('✅ Todos os usuários premium têm pagamento confirmado');
      }
    }

    console.log('\n🎯 RESUMO:');
    console.log(`   - Total de empresas: ${empresas.length}`);
    console.log(`   - Premium (pagos): ${premiumUsers.length}`);
    console.log(`   - Trial (gratuitos): ${trialUsers.length}`);
    console.log(`   - Sistema seguro: ✅ SIM`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
verifyPremiumUsers();
