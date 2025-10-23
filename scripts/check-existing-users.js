// Script para verificar e atualizar usuários existentes
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingUsers() {
  try {
    console.log('🔍 Verificando usuários existentes...');
    
    // Verificar se a coluna country existe
    const { data: testData, error: testError } = await supabase
      .from('empresas')
      .select('id, nome, country')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('column "country" does not exist')) {
        console.log('❌ PROBLEMA: Coluna "country" não existe na tabela empresas');
        console.log('\n📝 SOLUÇÃO: Execute este SQL no Supabase:');
        console.log('ALTER TABLE empresas ADD COLUMN country VARCHAR(2) DEFAULT \'BR\';');
        console.log('\n🔄 Depois execute este script novamente.');
        return;
      } else {
        console.error('❌ Erro ao verificar tabela:', testError);
        return;
      }
    }
    
    console.log('✅ Coluna "country" existe na tabela empresas');
    
    // Buscar todas as empresas
    const { data: companies, error: companiesError } = await supabase
      .from('empresas')
      .select('id, nome, country, is_premium, trial_end_date, created_at')
      .order('created_at', { ascending: false });
    
    if (companiesError) {
      console.error('❌ Erro ao buscar empresas:', companiesError);
      return;
    }
    
    console.log(`\n📊 TOTAL DE EMPRESAS: ${companies?.length || 0}`);
    
    // Categorizar empresas
    const companiesWithCountry = companies?.filter(c => c.country) || [];
    const companiesWithoutCountry = companies?.filter(c => !c.country) || [];
    const premiumCompanies = companies?.filter(c => c.is_premium) || [];
    const trialCompanies = companies?.filter(c => !c.is_premium) || [];
    
    console.log(`✅ Com país definido: ${companiesWithCountry.length}`);
    console.log(`❌ Sem país definido: ${companiesWithoutCountry.length}`);
    console.log(`💎 Premium: ${premiumCompanies.length}`);
    console.log(`🆓 Trial: ${trialCompanies.length}`);
    
    // Mostrar detalhes das empresas sem país
    if (companiesWithoutCountry.length > 0) {
      console.log('\n❌ EMPRESAS SEM PAÍS:');
      companiesWithoutCountry.forEach(company => {
        const status = company.is_premium ? '💎 Premium' : '🆓 Trial';
        console.log(`  - ${company.nome} (ID: ${company.id}) - ${status}`);
      });
      
      console.log('\n🔄 Atualizando empresas sem país para BR (padrão)...');
      
      const { error: updateError } = await supabase
        .from('empresas')
        .update({ country: 'BR' })
        .is('country', null);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar empresas:', updateError);
        return;
      }
      
      console.log(`✅ ${companiesWithoutCountry.length} empresas atualizadas com país padrão BR`);
    }
    
    // Mostrar resumo final
    console.log('\n📊 RESUMO FINAL:');
    companies?.forEach(company => {
      const countryFlag = company.country === 'BR' ? '🇧🇷' : 
                         company.country === 'PT' ? '🇵🇹' : 
                         company.country === 'US' ? '🇺🇸' : '❓';
      const status = company.is_premium ? '💎' : '🆓';
      const trialInfo = company.trial_end_date ? 
        `(Trial até: ${new Date(company.trial_end_date).toLocaleDateString('pt-BR')})` : 
        '';
      
      console.log(`  ${countryFlag} ${status} ${company.nome}: ${company.country || 'sem país'} ${trialInfo}`);
    });
    
    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Usuários existentes têm país padrão BR');
    console.log('2. ✅ Novos usuários podem selecionar país no cadastro');
    console.log('3. ✅ Usuários podem alterar país em "Minha Conta"');
    console.log('4. ✅ Sistema funciona com fallback para BR se não houver país');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
checkExistingUsers();

