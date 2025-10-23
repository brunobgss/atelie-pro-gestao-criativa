// Script para verificar e atualizar usuários existentes com país padrão
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateExistingUsers() {
  try {
    console.log('🔍 Verificando estrutura da tabela empresas...');
    
    // Tentar buscar uma empresa com campo country
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nome, country')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column "country" does not exist')) {
        console.log('❌ Coluna "country" não existe na tabela empresas');
        console.log('\n📝 Para adicionar a coluna, execute este SQL no Supabase:');
        console.log('ALTER TABLE empresas ADD COLUMN country VARCHAR(2) DEFAULT \'BR\';');
        console.log('\n🔄 Depois execute este script novamente para atualizar os dados.');
        return;
      } else {
        console.error('❌ Erro ao verificar tabela:', error);
        return;
      }
    }
    
    console.log('✅ Coluna "country" existe na tabela empresas');
    
    // Buscar todas as empresas
    const { data: companies, error: countError } = await supabase
      .from('empresas')
      .select('id, nome, country, created_at');
    
    if (countError) {
      console.error('❌ Erro ao buscar empresas:', countError);
      return;
    }
    
    const companiesWithCountry = companies?.filter(c => c.country) || [];
    const companiesWithoutCountry = companies?.filter(c => !c.country) || [];
    
    console.log(`📊 Total de empresas: ${companies?.length || 0}`);
    console.log(`✅ Com país definido: ${companiesWithCountry.length}`);
    console.log(`❌ Sem país definido: ${companiesWithoutCountry.length}`);
    
    if (companiesWithoutCountry.length > 0) {
      console.log('\n🔄 Atualizando empresas sem país...');
      
      // Atualizar empresas sem país para BR (padrão)
      const { error: updateError } = await supabase
        .from('empresas')
        .update({ country: 'BR' })
        .is('country', null);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar empresas:', updateError);
        return;
      }
      
      console.log(`✅ ${companiesWithoutCountry.length} empresas atualizadas com país padrão BR`);
      
      // Mostrar detalhes das empresas atualizadas
      console.log('\n📋 Empresas atualizadas:');
      companiesWithoutCountry.forEach(company => {
        console.log(`  - ${company.nome} (ID: ${company.id})`);
      });
    }
    
    // Verificar resultado final
    const { data: finalCompanies, error: verifyError } = await supabase
      .from('empresas')
      .select('id, nome, country, created_at')
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Erro ao verificar resultado final:', verifyError);
      return;
    }
    
    console.log('\n📊 Resultado final:');
    finalCompanies?.forEach(company => {
      const countryFlag = company.country === 'BR' ? '🇧🇷' : 
                         company.country === 'PT' ? '🇵🇹' : 
                         company.country === 'US' ? '🇺🇸' : '❓';
      console.log(`  ${countryFlag} ${company.nome}: ${company.country || 'sem país'}`);
    });
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
updateExistingUsers();
