// scripts/test-mobile-premium.js - Testar sistema de premium no mobile
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMobilePremium() {
  console.log('🔍 Testando sistema de premium no mobile...');
  
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

    console.log('📊 Dados da empresa:');
    console.log(`   - Nome: ${empresa.nome}`);
    console.log(`   - Premium: ${empresa.is_premium}`);
    console.log(`   - Status: ${empresa.status}`);
    console.log(`   - Trial End: ${empresa.trial_end_date}`);
    console.log(`   - Updated: ${empresa.updated_at}`);

    // Simular verificação de expiração
    let expirationDate;
    if (empresa.trial_end_date) {
      expirationDate = new Date(empresa.trial_end_date);
    } else {
      expirationDate = new Date(empresa.updated_at || new Date());
      expirationDate.setDate(expirationDate.getDate() + 30);
    }

    const now = new Date();
    const isExpired = now > expirationDate;
    const daysRemaining = isExpired ? 0 : Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log('\n🔍 Verificação de expiração:');
    console.log(`   - Data de expiração: ${expirationDate.toISOString()}`);
    console.log(`   - Data atual: ${now.toISOString()}`);
    console.log(`   - Expirado: ${isExpired}`);
    console.log(`   - Dias restantes: ${daysRemaining}`);
    console.log(`   - Deve bloquear: ${!empresa.is_premium || isExpired}`);

    // Testar cenários específicos
    console.log('\n🧪 Testando cenários:');
    
    // Cenário 1: Usuário premium válido
    if (empresa.is_premium && !isExpired) {
      console.log('✅ Cenário 1: Usuário premium válido - ACESSO LIBERADO');
    }
    
    // Cenário 2: Usuário premium expirado
    if (empresa.is_premium && isExpired) {
      console.log('❌ Cenário 2: Usuário premium expirado - ACESSO BLOQUEADO');
    }
    
    // Cenário 3: Usuário não premium
    if (!empresa.is_premium) {
      console.log('❌ Cenário 3: Usuário não premium - ACESSO BLOQUEADO');
    }

    // Verificar se precisa atualizar dados
    if (!empresa.is_premium || isExpired) {
      console.log('\n🔄 Atualizando status da empresa...');
      
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          is_premium: false,
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', empresaId);

      if (updateError) {
        console.error('❌ Erro ao atualizar empresa:', updateError);
      } else {
        console.log('✅ Empresa atualizada com sucesso');
      }
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

testMobilePremium();
