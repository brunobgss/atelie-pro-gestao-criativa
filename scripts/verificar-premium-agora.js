/**
 * Script rápido para verificar todos os usuários premium atuais
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xthioxkfkxjvqcjqllfy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarPremium() {
  console.log('🔍 Verificando todos os usuários premium...\n');
  
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('id, nome, email, is_premium, status, trial_end_date, created_at, updated_at')
    .eq('is_premium', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`✅ Total de usuários premium encontrados: ${empresas?.length || 0}\n`);
  
  empresas?.forEach((emp, index) => {
    const diasDesdeAtualizacao = Math.floor((Date.now() - new Date(emp.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    const dataAtualizacao = new Date(emp.updated_at).toLocaleDateString('pt-BR');
    
    console.log(`${index + 1}. ${emp.nome}`);
    console.log(`   Email: ${emp.email}`);
    console.log(`   Status: ${emp.status}`);
    console.log(`   Última atualização: ${dataAtualizacao} (${diasDesdeAtualizacao} dias atrás)`);
    console.log(`   Trial end date: ${emp.trial_end_date ? new Date(emp.trial_end_date).toLocaleDateString('pt-BR') : 'N/A'}`);
    console.log('');
  });

  // Verificar se há algum premium criado/atualizado hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const premiumHoje = empresas?.filter(emp => {
    const atualizado = new Date(emp.updated_at);
    atualizado.setHours(0, 0, 0, 0);
    return atualizado.getTime() === hoje.getTime();
  });

  if (premiumHoje && premiumHoje.length > 0) {
    console.log('\n🎉 NOVOS/ATUALIZADOS HOJE:');
    premiumHoje.forEach(emp => {
      console.log(`   - ${emp.nome} (${emp.email})`);
    });
  } else {
    console.log('\n📅 Nenhum premium foi criado/atualizado hoje.');
  }
}

verificarPremium();

