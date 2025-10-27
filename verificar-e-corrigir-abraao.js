// Script para verificar e corrigir acesso do usuário abraaoelionai032@gmail.com
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xthioxkfkxjvqcjqllfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verificarECorrigirAbraao() {
  try {
    console.log('🔍 Verificando usuário abraaoelionai032@gmail.com...');
    
    // Buscar todas as empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
      return;
    }

    console.log(`📊 Total de empresas: ${empresas.length}`);

    // Procurar empresa "Ms uniformes Profissionais" ou similar
    const empresaAbraao = empresas.find(emp => 
      emp.nome && (
        emp.nome.includes('Ms uniformes') || 
        emp.nome.includes('Uniformes Profissionais') ||
        emp.nome.includes('Alpha')
      )
    );

    if (!empresaAbraao) {
      console.log('⚠️ Empresa não encontrada. Listando todas...');
      empresas.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nome} (ID: ${emp.id})`);
        console.log(`   Premium: ${emp.is_premium ? 'SIM' : 'NÃO'}`);
        console.log(`   Status: ${emp.status}`);
        console.log(`   Trial End: ${emp.trial_end_date}`);
        console.log('');
      });
      return;
    }

    console.log('\n✅ Empresa encontrada:');
    console.log('   Nome:', empresaAbraao.nome);
    console.log('   ID:', empresaAbraao.id);
    console.log('   Premium:', empresaAbraao.is_premium ? '✅ SIM' : '❌ NÃO');
    console.log('   Status:', empresaAbraao.status);
    console.log('   Trial End:', empresaAbraao.trial_end_date);
    console.log('   Created:', empresaAbraao.created_at);
    console.log('   Updated:', empresaAbraao.updated_at);

    // Verificar se precisa corrigir
    const precisaCorrigir = !empresaAbraao.is_premium || 
                            empresaAbraao.status !== 'active' ||
                            !empresaAbraao.trial_end_date ||
                            new Date(empresaAbraao.trial_end_date) < new Date();

    if (!precisaCorrigir) {
      console.log('\n✅ Status já está correto!');
      return;
    }

    console.log('\n🔄 Ajustando status premium...');
    
    // Calcular nova data de expiração (30 dias a partir de agora)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    console.log('   Nova data de expiração:', expirationDate.toISOString());

    // Atualizar empresa
    const { data: updatedEmpresa, error: updateError } = await supabase
      .from('empresas')
      .update({
        is_premium: true,
        status: 'active',
        trial_end_date: expirationDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', empresaAbraao.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar empresa:', updateError);
      console.error('   Detalhes:', JSON.stringify(updateError, null, 2));
      return;
    }

    console.log('\n✅ ACESSO PREMIUM CORRIGIDO COM SUCESSO!');
    console.log('\n📋 Novo status:');
    console.log('   Nome:', updatedEmpresa.nome);
    console.log('   ID:', updatedEmpresa.id);
    console.log('   Premium:', updatedEmpresa.is_premium ? '✅ SIM' : '❌ NÃO');
    console.log('   Status:', updatedEmpresa.status);
    console.log('   Trial End:', updatedEmpresa.trial_end_date);
    
    const diasRestantes = Math.ceil((new Date(updatedEmpresa.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    console.log('   Dias restantes:', diasRestantes, 'dias');
    
    console.log('\n🎉 O usuário agora pode acessar o sistema!');
    console.log('   Email: abraaoelionai032@gmail.com');
    console.log('   Empresa: ' + updatedEmpresa.nome);
    console.log('\n📝 Instruções para o usuário:');
    console.log('   1. Feche completamente o navegador');
    console.log('   2. Abra novamente');
    console.log('   3. Acesse o site e faça login');
    console.log('   4. Se ainda não funcionar, limpe o cache do navegador');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
verificarECorrigirAbraao();
