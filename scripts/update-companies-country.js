// Script simples para atualizar empresas existentes com país padrão
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCompaniesWithDefaultCountry() {
  try {
    console.log('🔄 Atualizando empresas existentes com país padrão...');
    
    // Primeiro, vamos ver quantas empresas existem
    const { data: companies, error: fetchError } = await supabase
      .from('empresas')
      .select('id, nome, country');
    
    if (fetchError) {
      console.error('❌ Erro ao buscar empresas:', fetchError);
      return;
    }
    
    console.log(`📊 Encontradas ${companies?.length || 0} empresas`);
    
    // Atualizar empresas que não têm país definido
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ country: 'BR' })
      .is('country', null);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar empresas:', updateError);
      return;
    }
    
    console.log('✅ Empresas atualizadas com país padrão BR');
    
    // Verificar resultado
    const { data: updatedCompanies, error: verifyError } = await supabase
      .from('empresas')
      .select('id, nome, country');
    
    if (verifyError) {
      console.error('❌ Erro ao verificar atualização:', verifyError);
      return;
    }
    
    console.log('📊 Empresas após atualização:');
    updatedCompanies?.forEach(company => {
      console.log(`  - ${company.nome}: ${company.country || 'sem país'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
updateCompaniesWithDefaultCountry();
