// scripts/activate-bruno-premium-simple.js - Ativar premium do Bruno diretamente
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function activateBrunoPremium() {
  console.log('🔍 Ativando premium do Bruno...');
  
  try {
    // Usar o empresa_id conhecido do Bruno
    const empresaId = '6dcece50-9535-4dd4-bfe1-848654417629';

    // Calcular data de expiração (30 dias a partir de agora)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    console.log('🔄 Ativando premium...');
    console.log('🔄 Data de expiração:', expirationDate.toISOString());

    // Atualizar a tabela 'empresas' para ativar o premium
    const { data: updatedEmpresa, error: updateError } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(), // Usar trial_end_date como data de expiração
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao ativar premium:', updateError.message);
      return;
    }

    console.log('✅ Premium ativado com sucesso!');
    console.log('🎉 Sua conta foi desbloqueada!');
    console.log('✅ Verificação final:');
    console.log(`   - Empresa: ${updatedEmpresa.nome}`);
    console.log(`   - Premium: ${updatedEmpresa.is_premium}`);
    console.log(`   - Status: ${updatedEmpresa.status}`);
    console.log(`   - Expira em: ${updatedEmpresa.trial_end_date}`);

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

activateBrunoPremium();
