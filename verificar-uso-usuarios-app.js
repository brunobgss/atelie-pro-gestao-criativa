/**
 * Script para verificar uso dos usuários no app
 * Execute no console do navegador (F12) ou crie uma página de debug
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://xthioxkfkxjvqcjqllfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtmYnF4anZxY2pxbGxmeSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzU5MDE1MzcsImV4cCI6MjA1MTQ3NzUzN30.4Nf2C8K8w3cEJLuGUm_Qnt-9G8fT5CfN5xLnmRq1gzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarUsoUsuarios() {
  console.log('🔍 VERIFICANDO USO DOS USUÁRIOS...\n');

  try {
    // 1. Total de usuários
    const { data: usuarios, error: errUsuarios } = await supabase
      .from('auth.users')
      .select('id, email, created_at');

    console.log('📊 DADOS GERAIS:');
    console.log(`Total de usuários cadastrados: ${usuarios?.length || 0}\n`);

    // 2. Total de empresas
    const { data: empresas, error: errEmpresas } = await supabase
      .from('empresas')
      .select('id, nome, created_at, trial_expires_at, is_premium');

    console.log(`Total de empresas criadas: ${empresas?.length || 0}`);

    // 3. Verificar empresas com clientes
    const { data: clientsComClientes, error: errClientes } = await supabase
      .from('customers')
      .select('empresa_id')
      .not('empresa_id', 'is', null);

    const empresasComClientes = new Set(clientsComClientes?.map(c => c.empresa_id) || []);
    console.log(`Empresas com clientes cadastrados: ${empresasComClientes.size}`);

    // 4. Verificar empresas com pedidos
    const { data: pedidos, error: errPedidos } = await supabase
      .from('atelie_orders')
      .select('empresa_id')
      .not('empresa_id', 'is', null);

    const empresasComPedidos = new Set(pedidos?.map(p => p.empresa_id) || []);
    console.log(`Empresas com pedidos criados: ${empresasComPedidos.size}`);

    // 5. Verificar empresas com orçamentos
    const { data: orcamentos, error: errOrcamentos } = await supabase
      .from('atelie_quotes')
      .select('empresa_id')
      .not('empresa_id', 'is', null);

    const empresasComOrcamentos = new Set(orcamentos?.map(o => o.empresa_id) || []);
    console.log(`Empresas com orçamentos criados: ${empresasComOrcamentos.size}\n`);

    // 6. Detalhamento por empresa
    console.log('📋 DETALHAMENTO POR EMPRESA:\n');
    for (const empresa of empresas || []) {
      const { data: clientesEmpresa } = await supabase
        .from('customers')
        .select('created_at')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: pedidosEmpresa } = await supabase
        .from('atelie_orders')
        .select('created_at')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: orcamentosEmpresa } = await supabase
        .from('atelie_quotes')
        .select('created_at')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const temClientes = (clientsComClientes || []).some(c => c.empresa_id === empresa.id);
      const temPedidos = empresasComPedidos.has(empresa.id);
      const temOrcamentos = empresasComOrcamentos.has(empresa.id);
      const temAtividade = temClientes || temPedidos || temOrcamentos;

      const status = empresa.is_premium ? '🎯 PREMIUM' : 
                     empresa.trial_expires_at && new Date(empresa.trial_expires_at) > new Date() ? '⏳ TRIAL ATIVO' : 
                     '❌ TRIAL EXPIRADO';

      console.log(`\n📌 ${empresa.nome}`);
      console.log(`   Status: ${status}`);
      console.log(`   Cadastro: ${new Date(empresa.created_at).toLocaleDateString('pt-BR')}`);
      console.log(`   Clientes: ${temClientes ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Pedidos: ${temPedidos ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Orçamentos: ${temOrcamentos ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Uso Real: ${temAtividade ? '✅ ATIVO' : '❌ INATIVO'}`);

      if (clienteEmpresa?.[0]) {
        console.log(`   Último cliente: ${new Date(clientesEmpresa[0].created_at).toLocaleDateString('pt-BR')}`);
      }
      if (pedidosEmpresa?.[0]) {
        console.log(`   Último pedido: ${new Date(pedidosEmpresa[0].created_at).toLocaleDateString('pt-BR')}`);
      }
      if (orcamentosEmpresa?.[0]) {
        console.log(`   Último orçamento: ${new Date(orcamentosEmpresa[0].created_at).toLocaleDateString('pt-BR')}`);
      }
    }

    // 7. Análise de engagement
    console.log('\n📈 ANÁLISE DE ENGAGEMENT:\n');

    const ativos = empresas.filter(e => 
      empresasComClientes.has(e.id) || 
      empresasComPedidos.has(e.id) || 
      empresasComOrcamentos.has(e.id)
    ).length;

    const inativos = empresas.filter(e => 
      !empresasComClientes.has(e.id) && 
      !empresasComPedidos.has(e.id) && 
      !empresasComOrcamentos.has(e.id)
    ).length;

    const premium = empresas.filter(e => e.is_premium).length;
    const trialAtivo = empresas.filter(e => 
      e.trial_expires_at && new Date(e.trial_expires_at) > new Date() && !e.is_premium
    ).length;
    const trialExpirado = empresas.filter(e => 
      e.trial_expires_at && new Date(e.trial_expires_at) <= new Date() && !e.is_premium
    ).length;

    console.log(`✅ Usuários Ativos: ${ativos}`);
    console.log(`❌ Usuários Inativos: ${inativos}`);
    console.log(`🎯 Usuários Premium: ${premium}`);
    console.log(`⏳ Trials Ativos: ${trialAtivo}`);
    console.log(`🔴 Trials Expirados: ${trialExpirado}\n`);

    const taxaConversao = ((ativos / empresas.length) * 100).toFixed(1);
    console.log(`📊 Taxa de Uso Real: ${taxaConversao}%`);
    console.log(`📊 Taxa de Conversão Premium: ${((premium / empresas.length) * 100).toFixed(1)}%\n`);

    // 8. Recomendações
    console.log('💡 RECOMENDAÇÕES:\n');

    if (inativos > ativos) {
      console.log('⚠️ PROBLEMA: Mais usuários inativos que ativos');
      console.log('   → Melhorar onboarding e comunicação');
      console.log('   → Enviar emails educativos');
      console.log('   → Oferecer suporte personalizado\n');
    }

    if (premium === 0 && ativos > 0) {
      console.log('💰 OPORTUNIDADE: Usuários ativos mas nenhum premium');
      console.log('   → Revisar proposta de valor');
      console.log('   → Criar casos de sucesso');
      console.log('   → Oferecer desconto para os primeiros\n');
    }

    if (trialExpirado > premium) {
      console.log('⏰ URGENTE: Muitos trials expirando sem converter');
      console.log('   → Campanha de re-engajamento');
      console.log('   → Oferecer extensão de trial');
      console.log('   → Entender objeções\n');
    }

    console.log('✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar uso:', error);
  }
}

// Executar
verificarUsoUsuarios();

export default verificarUsoUsuarios;

