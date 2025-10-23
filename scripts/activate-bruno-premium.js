// scripts/activate-bruno-premium.js - Ativar premium do Bruno com data de expiração
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function activateBrunoPremium() {
  console.log('🔍 Ativando premium do Bruno...');
  
  try {
    // 1. Encontrar o user_id pelo email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', 'brunobgs1888@gmail.com')
      .single();

    if (profileError || !profileData) {
      console.error('❌ Erro ao buscar perfil do usuário:', profileError?.message || 'Perfil não encontrado');
      return;
    }
    const userId = profileData.user_id;

    // 2. Encontrar o empresa_id associado ao user_id
    const { data: userEmpresaData, error: userEmpresaError } = await supabase
      .from('user_empresas')
      .select('empresa_id')
      .eq('user_id', userId)
      .single();

    if (userEmpresaError || !userEmpresaData) {
      console.error('❌ Erro ao buscar associação de empresa:', userEmpresaError?.message || 'Associação de empresa não encontrada');
      return;
    }
    const empresaId = userEmpresaData.empresa_id;

    // 3. Calcular data de expiração (30 dias a partir de agora)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    console.log('🔄 Ativando premium...');
    console.log('🔄 Data de expiração:', expirationDate.toISOString());

    // 4. Atualizar a tabela 'empresas' para ativar o premium
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
