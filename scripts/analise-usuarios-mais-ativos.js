/**
 * 📊 Análise de usuários mais ativos do Ateliê Pro
 *
 * Execute com: node scripts/analise-usuarios-mais-ativos.js
 *
 * O script conecta no Supabase (usando service role key ou anon de fallback),
 * calcula o engajamento das empresas reais e gera um relatório markdown
 * destacando os usuários mais ativos.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://xthioxkfkxjvqcjqllfy.supabase.co';

const DEFAULT_SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE';

if (!DEFAULT_SUPABASE_KEY) {
  console.error('❌ Nenhuma chave do Supabase encontrada. Configure SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, DEFAULT_SUPABASE_KEY);

const EMAILS_TESTE = new Set([
  'brunobgs1888@gmail.com',
  'brunobgstp01@gmail.com',
  'brunopix29@gmail.com',
  'bgsoftwares1@gmail.com',
  'ateliepro751@gmail.com',
  'brunobgs2004@gmail.com',
  'brunobgstp@gmail.com',
  'jonasbrsil54@gmail.com' // ATELIE DO JONAS - conta teste
]);

const NOMES_SUSPEITOS = ['teste', 'test', 'demo', 'bruno', 'bgsoftware', 'focus', 'jonas'];

const EMPRESAS_TESTE_IDS = new Set([
  '22e7f320-da07-477c-a0f8-f3c178708c33',
  '41c29a6e-a897-479d-8865-e66b599fe219',
  '6dcece50-9535-4dd4-bfe1-848654417629',
  '9c6ed20a-107a-4adf-9e53-0ced232040cd',
  'd907aa08-9bb0-428e-8ed8-a382132f55f0',
  'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
  'f8c74450-ef8a-489a-bb83-57746dbb0374',
  'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
]);

function isEmpresaTeste(empresa) {
  if (!empresa) return true;
  if (EMPRESAS_TESTE_IDS.has(empresa.id)) return true;
  const nome = (empresa.nome || '').toLowerCase();
  return NOMES_SUSPEITOS.some((keyword) => nome.includes(keyword));
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toISOString().split('T')[0];
}

function diasDesde(data) {
  if (!data) return Infinity;
  const diferencaMs = Date.now() - new Date(data).getTime();
  return Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
}

async function carregarDadosBase() {
  const [
    { data: empresas, error: errEmpresas },
    { data: customers, error: errClientes },
    { data: pedidos, error: errPedidos },
    { data: orcamentos, error: errOrcamentos }
  ] = await Promise.all([
    supabase
      .from('empresas')
      .select('id, nome, email, telefone, responsavel, created_at, trial_end_date, is_premium, status'),
    supabase.from('customers').select('empresa_id, created_at'),
    supabase.from('atelie_orders').select('empresa_id, created_at, status'),
    supabase.from('atelie_quotes').select('empresa_id, created_at')
  ]);

  if (errEmpresas) throw errEmpresas;
  if (errClientes) throw errClientes;
  if (errPedidos) throw errPedidos;
  if (errOrcamentos) throw errOrcamentos;

  return {
    empresas: empresas || [],
    customers: customers || [],
    pedidos: pedidos || [],
    orcamentos: orcamentos || []
  };
}

function montarEstatisticasPorEmpresa(dados) {
  const empresaStats = new Map();

  for (const empresa of dados.empresas) {
    if (isEmpresaTeste(empresa)) continue;

    empresaStats.set(empresa.id, {
      ...empresa,
      totalClientes: 0,
      totalPedidos: 0,
      totalOrcamentos: 0,
      ultimoCliente: null,
      ultimoPedido: null,
      ultimoOrcamento: null,
      ultimaAtividade: null
    });
  }

  const atualizarStats = (empresaId, campoContador, campoData, data) => {
    const stats = empresaStats.get(empresaId);
    if (!stats) return;
    stats[campoContador] += 1;

    const dataAtual = new Date(data);
    const ultimoCampo = stats[campoData];
    if (!ultimoCampo || dataAtual > new Date(ultimoCampo)) {
      stats[campoData] = data;
    }

    if (!stats.ultimaAtividade || dataAtual > new Date(stats.ultimaAtividade)) {
      stats.ultimaAtividade = data;
    }
  };

  for (const registro of dados.customers) {
    if (!registro.empresa_id || !registro.created_at) continue;
    atualizarStats(registro.empresa_id, 'totalClientes', 'ultimoCliente', registro.created_at);
  }

  for (const registro of dados.pedidos) {
    if (!registro.empresa_id || !registro.created_at) continue;
    atualizarStats(registro.empresa_id, 'totalPedidos', 'ultimoPedido', registro.created_at);
  }

  for (const registro of dados.orcamentos) {
    if (!registro.empresa_id || !registro.created_at) continue;
    atualizarStats(registro.empresa_id, 'totalOrcamentos', 'ultimoOrcamento', registro.created_at);
  }

  return empresaStats;
}

function montarRankingEmpresas(empresaStats) {
  const ranking = [];

  for (const stats of empresaStats.values()) {
    const emailLower = (stats.email || '').toLowerCase();
    if (EMAILS_TESTE.has(emailLower)) continue;
    if (emailLower.includes('+teste')) continue;

    const nivelEngajamento = stats.totalClientes + stats.totalPedidos + stats.totalOrcamentos;
    const diasSemAtividade = diasDesde(stats.ultimaAtividade);

    ranking.push({
      id: stats.id,
      nome: stats.nome,
      email: stats.email,
      telefone: stats.telefone,
      responsavel: stats.responsavel,
      criadoEm: stats.created_at,
      trialExpiraEm: stats.trial_end_date,
      isPremium: stats.is_premium,
      status: stats.status,
      totalClientes: stats.totalClientes,
      totalPedidos: stats.totalPedidos,
      totalOrcamentos: stats.totalOrcamentos,
      nivelEngajamento,
      ultimaAtividade: stats.ultimaAtividade,
      diasSemAtividade
    });
  }

  return ranking.sort((a, b) => {
    // Premium sempre aparecem primeiro, mesmo sem atividade
    if (a.isPremium !== b.isPremium) {
      return b.isPremium ? 1 : -1;
    }
    if (b.nivelEngajamento !== a.nivelEngajamento) {
      return b.nivelEngajamento - a.nivelEngajamento;
    }
    const atividadeA = a.ultimaAtividade ? new Date(a.ultimaAtividade).getTime() : 0;
    const atividadeB = b.ultimaAtividade ? new Date(b.ultimaAtividade).getTime() : 0;
    return atividadeB - atividadeA;
  });
}

function gerarResumo(ranking) {
  const empresasAtivas = ranking.filter((e) => e.nivelEngajamento > 0);
  const empresasInativas = ranking.length - empresasAtivas.length;
  const ultimo30Dias = empresasAtivas.filter((e) => e.diasSemAtividade <= 30).length;
  const ultimo7Dias = empresasAtivas.filter((e) => e.diasSemAtividade <= 7).length;
  // Contar todos os premium do ranking (incluindo os que ainda não têm atividade)
  const premiumAtivos = ranking.filter((e) => e.isPremium).length;

  return {
    totalAnalisadas: ranking.length,
    empresasAtivas: empresasAtivas.length,
    empresasInativas,
    ultimo7Dias,
    ultimo30Dias,
    premiumAtivos
  };
}

function gerarMarkdown({ ranking, resumo, dataExecucao }) {
  const topEmpresas = ranking.slice(0, 15);

  const tabelaTopEmpresas = topEmpresas
    .map((empresa, index) => {
      const statusConta = empresa.isPremium
        ? 'Premium'
        : empresa.trialExpiraEm && new Date(empresa.trialExpiraEm) > new Date()
        ? 'Trial ativo'
        : 'Trial expirado';

      return `| ${index + 1} | ${empresa.nome} | ${empresa.email || '—'} | ${empresa.nivelEngajamento} | ${empresa.totalClientes} | ${empresa.totalPedidos} | ${empresa.totalOrcamentos} | ${formatDate(empresa.ultimaAtividade)} | ${
        empresa.diasSemAtividade === Infinity ? 'Nunca' : `${empresa.diasSemAtividade} dias`
      } | ${statusConta} |`;
    })
    .join('\n');

  return `# 📊 Análise de Uso - Usuários/Empresas Mais Ativas

**Gerado em:** ${dataExecucao.toLocaleString('pt-BR')}

---

## 🔎 Resumo Geral

- Empresas analisadas: **${resumo.totalAnalisadas}**
- Empresas com atividade real: **${resumo.empresasAtivas}**
- Empresas sem atividade: **${resumo.empresasInativas}**
- Empresas ativas nos últimos 7 dias: **${resumo.ultimo7Dias}**
- Empresas ativas nos últimos 30 dias: **${resumo.ultimo30Dias}**
- Premium ativos: **${resumo.premiumAtivos}**

---

## 🏆 Top Empresas/Usuários por Engajamento

| # | Empresa/Usuário | Email | Engajamento (C+P+O) | Clientes | Pedidos | Orçamentos | Última atividade | Tempo sem uso | Status |
|---|------------------|-------|--------------------|----------|---------|------------|------------------|---------------|--------|
${tabelaTopEmpresas}

---

## ℹ️ Critérios da análise

- **Engajamento** soma clientes, pedidos e orçamentos criados pela empresa.
- Consideramos apenas empresas reais (excluímos ids e nomes de teste/demonstração).
- Emails conhecidos como teste também foram filtrados.
- Dados obtidos diretamente do Supabase (tabelas \`empresas\`, \`customers\`, \`atelie_orders\`, \`atelie_quotes\`).

---

Relatório gerado automaticamente em ${dataExecucao.toISOString()}.
`;
}

async function executarAnalise() {
  console.log('🚀 Iniciando análise de usuários mais ativos...\n');

  const dataExecucao = new Date();

  const dadosBase = await carregarDadosBase();
  console.log(`🏢 Empresas carregadas: ${dadosBase.empresas.length}`);

  const empresaStats = montarEstatisticasPorEmpresa(dadosBase);
  console.log(`🏭 Empresas reais analisadas: ${empresaStats.size}`);

  const ranking = montarRankingEmpresas(empresaStats);
  console.log(`🧮 Empresas com atividade computada: ${ranking.length}`);

  const resumo = gerarResumo(ranking);
  console.log('✅ Resumo:');
  console.log(`   • Empresas ativas: ${resumo.empresasAtivas}`);
  console.log(`   • Empresas inativas: ${resumo.empresasInativas}`);
  console.log(`   • Ativas últimos 7 dias: ${resumo.ultimo7Dias}`);
  console.log(`   • Ativas últimos 30 dias: ${resumo.ultimo30Dias}`);
  console.log(`   • Premium ativos: ${resumo.premiumAtivos}`);

  const markdown = gerarMarkdown({ ranking, resumo, dataExecucao });

  const nomeArquivo = `ANALISE_USUARIOS_ATIVOS_${dataExecucao.toISOString().split('T')[0]}.md`;
  writeFileSync(nomeArquivo, markdown, 'utf-8');

  console.log(`\n📝 Relatório salvo em: ${nomeArquivo}`);
  console.log('🏁 Análise concluída com sucesso!');
}

executarAnalise().catch((erro) => {
  console.error('❌ Erro ao executar análise:', erro);
  process.exit(1);
});


