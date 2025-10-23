// Script para forçar refresh dos dados da empresa
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function refreshEmpresaData() {
  try {
    console.log('🔄 Forçando refresh dos dados da empresa...');
    
    // ID da empresa do Bruno
    const empresaId = '6fe21049-0417-48fd-bb67-646aeed028ae';
    
    // Buscar dados atualizados da empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar empresa:', error);
      return;
    }

    console.log('✅ Dados atualizados da empresa:');
    console.log('   - Nome:', empresa.nome);
    console.log('   - Premium:', empresa.is_premium);
    console.log('   - Status:', empresa.status);
    console.log('   - Plano:', empresa.plan_type);
    console.log('   - Trial End:', empresa.trial_end_date);

    // Limpar localStorage para forçar refresh
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trialData');
      localStorage.removeItem('empresaData');
      console.log('🧹 LocalStorage limpo - dados serão recarregados');
    }

    console.log('✅ Refresh concluído! Recarregue a página para ver as mudanças.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
refreshEmpresaData();
