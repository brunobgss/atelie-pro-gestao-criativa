// Script simplificado para desbloquear conta do usuário
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function unlockUserAccount() {
  try {
    console.log('🔍 Buscando empresas...');
    
    // 1. Buscar todas as empresas para encontrar a do Bruno
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('*')
      .ilike('nome', '%bruno%');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
      return;
    }

    console.log('📊 Empresas encontradas:', empresas.length);
    empresas.forEach(empresa => {
      console.log(`   - ${empresa.nome} (ID: ${empresa.id}) - Premium: ${empresa.is_premium}`);
    });

    // 2. Buscar por email específico nas empresas
    const { data: empresasEmail, error: emailError } = await supabase
      .from('empresas')
      .select('*')
      .ilike('email', '%brunobgs1888%');

    if (!emailError && empresasEmail && empresasEmail.length > 0) {
      console.log('✅ Empresa encontrada por email:', empresasEmail[0].nome);
      const empresa = empresasEmail[0];
      
      // Ativar premium
      await activatePremium(empresa.id, empresa.nome);
      return;
    }

    // 3. Se não encontrou por email, tentar ativar a primeira empresa encontrada
    if (empresas && empresas.length > 0) {
      const empresa = empresas[0];
      console.log(`🔄 Tentando ativar premium para: ${empresa.nome}`);
      await activatePremium(empresa.id, empresa.nome);
    } else {
      console.log('❌ Nenhuma empresa encontrada para o Bruno');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function activatePremium(empresaId, empresaNome) {
  try {
    console.log(`🔄 Ativando premium para empresa: ${empresaNome} (ID: ${empresaId})`);
    
    // Calcular data de expiração (1 ano a partir de agora)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const { data: updateData, error: updateError } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        current_period_end: expirationDate.toISOString(),
        plan_type: 'yearly',
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaId);

    if (updateError) {
      console.error('❌ Erro ao ativar premium:', updateError);
      return;
    }

    console.log('✅ Premium ativado com sucesso!');
    console.log('📅 Nova data de expiração:', expirationDate.toISOString());
    console.log('🎉 Sua conta foi desbloqueada!');

    // Verificar se foi realmente ativado
    const { data: verifyData, error: verifyError } = await supabase
      .from('empresas')
      .select('is_premium, status, current_period_end, plan_type, nome')
      .eq('id', empresaId)
      .single();

    if (verifyError) {
      console.error('❌ Erro ao verificar ativação:', verifyError);
    } else {
      console.log('✅ Verificação final:');
      console.log('   - Empresa:', verifyData.nome);
      console.log('   - Premium:', verifyData.is_premium);
      console.log('   - Status:', verifyData.status);
      console.log('   - Plano:', verifyData.plan_type);
      console.log('   - Expira em:', verifyData.current_period_end);
    }

  } catch (error) {
    console.error('❌ Erro ao ativar premium:', error);
  }
}

// Executar o script
unlockUserAccount();
