// Script final para desbloquear conta do usuário
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function unlockUserAccount() {
  try {
    console.log('🔍 Desbloqueando conta do Bruno...');
    
    // ID da empresa encontrada: 6fe21049-0417-48fd-bb67-646aeed028ae
    const empresaId = '6fe21049-0417-48fd-bb67-646aeed028ae';
    
    console.log('🔄 Ativando premium...');
    
    // Atualizar apenas os campos essenciais
    const { data: updateData, error: updateError } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active'
      })
      .eq('id', empresaId);

    if (updateError) {
      console.error('❌ Erro ao ativar premium:', updateError);
      return;
    }

    console.log('✅ Premium ativado com sucesso!');
    console.log('🎉 Sua conta foi desbloqueada!');

    // Verificar se foi realmente ativado
    const { data: verifyData, error: verifyError } = await supabase
      .from('empresas')
      .select('is_premium, status, nome')
      .eq('id', empresaId)
      .single();

    if (verifyError) {
      console.error('❌ Erro ao verificar ativação:', verifyError);
    } else {
      console.log('✅ Verificação final:');
      console.log('   - Empresa:', verifyData.nome);
      console.log('   - Premium:', verifyData.is_premium);
      console.log('   - Status:', verifyData.status);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
unlockUserAccount();
