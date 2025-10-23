// scripts/check-premium-expiration.js - Script para verificar expiração de pagamentos
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAllPremiumUsers() {
  console.log('🔍 Iniciando verificação de expiração de pagamentos...');
  
  try {
    // Buscar todas as empresas premium
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('id, nome, is_premium, trial_end_date, status, updated_at')
      .eq('is_premium', true);

    if (error) {
      console.error('❌ Erro ao buscar empresas premium:', error);
      return;
    }

    console.log(`📊 Encontradas ${empresas?.length || 0} empresas premium`);

    let expiredCount = 0;
    let activeCount = 0;

    for (const empresa of empresas || []) {
      console.log(`\n🔍 Verificando empresa: ${empresa.nome} (${empresa.id})`);
      
      // Usar trial_end_date como data de expiração
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

      if (isExpired) {
        console.log(`❌ Pagamento expirado há ${Math.abs(daysRemaining)} dias - desativando premium`);
        await deactivatePremium(empresa.id);
        expiredCount++;
      } else {
        console.log(`✅ Pagamento válido - ${daysRemaining} dias restantes`);
        activeCount++;
        
        // Se está próximo do vencimento (3 dias), avisar
        if (daysRemaining <= 3) {
          console.log(`⚠️ ATENÇÃO: Pagamento vence em ${daysRemaining} dias!`);
        }
      }
    }

    console.log('\n📊 Resumo da verificação:');
    console.log(`✅ Empresas ativas: ${activeCount}`);
    console.log(`❌ Empresas expiradas: ${expiredCount}`);
    console.log(`📈 Total verificado: ${empresas?.length || 0}`);

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

async function deactivatePremium(empresaId) {
  try {
    console.log(`🔄 Desativando premium para empresa: ${empresaId}`);

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

// Executar verificação
checkAllPremiumUsers();
