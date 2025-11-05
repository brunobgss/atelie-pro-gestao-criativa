/**
 * 📊 ANÁLISE COMPLETA AUTOMÁTICA DO APP
 * Execute: node analise-completa-automatica.js
 * 
 * Este script executa todas as análises automaticamente
 * e gera um relatório completo em markdown
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// Configuração do Supabase
const supabaseUrl = 'https://xthioxkfkxjvqcjqllfy.supabase.co';

// Tentar usar service role key do ambiente, senão usar anon key
// Para usar service role, defina: export SUPABASE_SERVICE_ROLE_KEY="sua_key_aqui"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`🔑 Usando ${supabaseKey.includes('service_role') ? 'SERVICE ROLE' : 'ANON'} key\n`);

// Lista de emails de teste para excluir
const EMAILS_TESTE = [
  'brunobgs1888@gmail.com',
  'brunobgstp01@gmail.com',
  'brunopix29@gmail.com',
  'bgsoftwares1@gmail.com',
  'ateliepro751@gmail.com',
  'brunobgs2004@gmail.com',
  'brunobgstp@gmail.com'
];

// IDs de empresas de teste (se necessário)
const EMPRESAS_TESTE_IDS = [
  '22e7f320-da07-477c-a0f8-f3c178708c33',
  '41c29a6e-a897-479d-8865-e66b599fe219',
  '6dcece50-9535-4dd4-bfe1-848654417629',
  '9c6ed20a-107a-4adf-9e53-0ced232040cd',
  'd907aa08-9bb0-428e-8ed8-a382132f55f0',
  'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
  'f8c74450-ef8a-489a-bb83-57746dbb0374',
  'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
];

async function executarAnaliseCompleta() {
  console.log('🚀 Iniciando análise completa...\n');

  const relatorio = {
    timestamp: new Date().toISOString(),
    resumo: {},
    distribuicao: {},
    engajamento: {},
    conversao: {},
    retencao: {},
    uso: {},
    recomendacoes: []
  };

  try {
    // ==========================================
    // 1. BUSCAR TODOS OS DADOS
    // ==========================================
    console.log('📊 Buscando dados do banco...');

    // Buscar empresas
    const { data: empresas, error: errEmpresas } = await supabase
      .from('empresas')
      .select('id, nome, created_at, trial_end_date, is_premium, status');

    if (errEmpresas) throw errEmpresas;

    // Buscar user_empresas
    const { data: userEmpresas, error: errUserEmpresas } = await supabase
      .from('user_empresas')
      .select('user_id, empresa_id');

    // Buscar usuários via user_empresas (não temos acesso direto a auth.users)
    // Os usuários serão inferidos via user_empresas

    // Buscar clientes
    const { data: clientes, error: errClientes } = await supabase
      .from('customers')
      .select('id, empresa_id, created_at');

    // Buscar pedidos
    const { data: pedidos, error: errPedidos } = await supabase
      .from('atelie_orders')
      .select('id, empresa_id, created_at, status');

    // Buscar orçamentos
    const { data: orcamentos, error: errOrcamentos } = await supabase
      .from('atelie_quotes')
      .select('id, empresa_id, created_at');

    console.log('✅ Dados carregados!\n');

    // ==========================================
    // 2. FILTRAR USUÁRIOS DE TESTE
    // ==========================================
    console.log('🔍 Filtrando usuários de teste...');

    // Buscar empresas de teste - usar IDs conhecidos e nomes suspeitos
    const empresasTesteIds = new Set(EMPRESAS_TESTE_IDS);

    // Adicionar empresas com nomes suspeitos
    empresas?.forEach(e => {
      const nomeLower = (e.nome || '').toLowerCase();
      if (
        nomeLower.includes('teste') ||
        nomeLower.includes('test') ||
        nomeLower.includes('bruno') ||
        nomeLower.includes('demo')
      ) {
        empresasTesteIds.add(e.id);
      }
    });

    // Filtrar empresas reais
    const empresasReais = empresas?.filter(e => 
      !empresasTesteIds.has(e.id)
    ) || [];

    console.log(`✅ ${empresasReais.length} empresas reais identificadas\n`);

    // ==========================================
    // 3. CALCULAR MÉTRICAS
    // ==========================================
    console.log('📈 Calculando métricas...');

    // Resumo executivo
    const totalEmpresas = empresasReais.length;
    const empresasPremium = empresasReais.filter(e => e.is_premium === true).length;
    const empresasTrial = empresasReais.filter(e => !e.is_premium || e.is_premium === null).length;

    // Empresas com atividade
    const empresasComClientes = new Set(
      clientes?.filter(c => empresasReais.find(e => e.id === c.empresa_id)).map(c => c.empresa_id) || []
    );
    const empresasComPedidos = new Set(
      pedidos?.filter(p => empresasReais.find(e => e.id === p.empresa_id)).map(p => p.empresa_id) || []
    );
    const empresasComOrcamentos = new Set(
      orcamentos?.filter(o => empresasReais.find(e => e.id === o.empresa_id)).map(o => o.empresa_id) || []
    );

    const empresasAtivas = empresasReais.filter(e =>
      empresasComClientes.has(e.id) ||
      empresasComPedidos.has(e.id) ||
      empresasComOrcamentos.has(e.id)
    ).length;

    const empresasInativas = totalEmpresas - empresasAtivas;

    // Contadores totais (excluindo testes)
    const totalClientes = clientes?.filter(c => empresasReais.find(e => e.id === c.empresa_id)).length || 0;
    const totalPedidos = pedidos?.filter(p => empresasReais.find(e => e.id === p.empresa_id)).length || 0;
    const totalOrcamentos = orcamentos?.filter(o => empresasReais.find(e => e.id === o.empresa_id)).length || 0;

    // Taxas
    const taxaConversao = totalEmpresas > 0 ? (empresasPremium / totalEmpresas * 100).toFixed(2) : '0.00';
    const taxaEngajamento = totalEmpresas > 0 ? (empresasAtivas / totalEmpresas * 100).toFixed(2) : '0.00';

    // Distribuição por status
    const distribuicaoStatus = {
      premium: empresasReais.filter(e => e.is_premium === true).length,
      trial: empresasReais.filter(e => 
        (!e.is_premium || e.is_premium === null) && 
        e.status === 'trial'
      ).length,
      expired: empresasReais.filter(e => 
        (!e.is_premium || e.is_premium === null) && 
        e.status === 'expired'
      ).length,
      active: empresasReais.filter(e => e.status === 'active').length
    };

    // Engajamento detalhado
    const empresasComClientesCount = empresasComClientes.size;
    const empresasComPedidosCount = empresasComPedidos.size;
    const empresasComOrcamentosCount = empresasComOrcamentos.size;

    // Retenção (empresas criadas há <= 7 dias vs > 7 dias)
    const agora = new Date();
    const empresasRecentes = empresasReais.filter(e => {
      const criadaEm = new Date(e.created_at);
      const diasAtras = (agora - criadaEm) / (1000 * 60 * 60 * 24);
      return diasAtras <= 7;
    }).length;

    const empresasAntigas = totalEmpresas - empresasRecentes;

    // Uso detalhado
    const mediaClientesPorEmpresa = empresasAtivas > 0 ? (totalClientes / empresasAtivas).toFixed(2) : '0';
    const mediaPedidosPorEmpresa = empresasAtivas > 0 ? (totalPedidos / empresasAtivas).toFixed(2) : '0';
    const mediaOrcamentosPorEmpresa = empresasAtivas > 0 ? (totalOrcamentos / empresasAtivas).toFixed(2) : '0';

    // Preencher relatório
    relatorio.resumo = {
      totalEmpresas,
      empresasPremium,
      empresasTrial,
      empresasAtivas,
      empresasInativas,
      totalClientes,
      totalPedidos,
      totalOrcamentos,
      taxaConversao,
      taxaEngajamento
    };

    relatorio.distribuicao = distribuicaoStatus;
    relatorio.engajamento = {
      empresasComClientes: empresasComClientesCount,
      empresasComPedidos: empresasComPedidosCount,
      empresasComOrcamentos: empresasComOrcamentosCount,
      empresasRecentes,
      empresasAntigas
    };
    relatorio.uso = {
      mediaClientesPorEmpresa,
      mediaPedidosPorEmpresa,
      mediaOrcamentosPorEmpresa
    };

    // Gerar recomendações
    if (empresasInativas > empresasAtivas) {
      relatorio.recomendacoes.push({
        prioridade: 'ALTA',
        titulo: 'Mais usuários inativos que ativos',
        acoes: [
          'Melhorar onboarding e comunicação',
          'Enviar emails educativos',
          'Oferecer suporte personalizado'
        ]
      });
    }

    if (empresasPremium === 0 && empresasAtivas > 0) {
      relatorio.recomendacoes.push({
        prioridade: 'MÉDIA',
        titulo: 'Usuários ativos mas nenhum premium',
        acoes: [
          'Revisar proposta de valor',
          'Criar casos de sucesso',
          'Oferecer desconto para os primeiros'
        ]
      });
    }

    if (parseFloat(taxaConversao) < 10) {
      relatorio.recomendacoes.push({
        prioridade: 'ALTA',
        titulo: `Taxa de conversão baixa (${taxaConversao}%)`,
        acoes: [
          'Focar em converter os usuários ativos',
          'Oferecer desconto especial',
          'Demonstrar valor do premium'
        ]
      });
    }

    console.log('✅ Métricas calculadas!\n');

    // ==========================================
    // 4. GERAR RELATÓRIO MARKDOWN
    // ==========================================
    console.log('📝 Gerando relatório...');

    const markdown = `# 📊 Análise Completa do App - Relatório Automático

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Gerado automaticamente**

---

## 📊 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de Empresas Reais** | ${relatorio.resumo.totalEmpresas} |
| **Empresas Premium** | ${relatorio.resumo.empresasPremium} |
| **Empresas Trial** | ${relatorio.resumo.empresasTrial} |
| **Empresas Ativas** | ${relatorio.resumo.empresasAtivas} |
| **Empresas Inativas** | ${relatorio.resumo.empresasInativas} |
| **Total de Clientes** | ${relatorio.resumo.totalClientes} |
| **Total de Pedidos** | ${relatorio.resumo.totalPedidos} |
| **Total de Orçamentos** | ${relatorio.resumo.totalOrcamentos} |
| **Taxa de Conversão** | ${relatorio.resumo.taxaConversao}% |
| **Taxa de Engajamento** | ${relatorio.resumo.taxaEngajamento}% |

---

## 📈 Distribuição por Status

| Status | Quantidade |
|--------|------------|
| 🎯 Premium | ${relatorio.distribuicao.premium} |
| ⏳ Trial | ${relatorio.distribuicao.trial} |
| 🔴 Expired | ${relatorio.distribuicao.expired} |
| ✅ Active | ${relatorio.distribuicao.active} |

---

## 🎯 Engajamento Detalhado

| Métrica | Valor |
|---------|-------|
| **Empresas com Clientes** | ${relatorio.engajamento.empresasComClientes} |
| **Empresas com Pedidos** | ${relatorio.engajamento.empresasComPedidos} |
| **Empresas com Orçamentos** | ${relatorio.engajamento.empresasComOrcamentos} |
| **Empresas Recentes (≤7 dias)** | ${relatorio.engajamento.empresasRecentes} |
| **Empresas Antigas (>7 dias)** | ${relatorio.engajamento.empresasAntigas} |

---

## 💼 Uso Detalhado

| Métrica | Valor |
|---------|-------|
| **Média de Clientes por Empresa Ativa** | ${relatorio.uso.mediaClientesPorEmpresa} |
| **Média de Pedidos por Empresa Ativa** | ${relatorio.uso.mediaPedidosPorEmpresa} |
| **Média de Orçamentos por Empresa Ativa** | ${relatorio.uso.mediaOrcamentosPorEmpresa} |

---

## 💡 Recomendações

${relatorio.recomendacoes.length > 0 ? relatorio.recomendacoes.map((rec, i) => `
### ${i + 1}. ${rec.titulo} (Prioridade: ${rec.prioridade})

**Ações sugeridas:**
${rec.acoes.map(acao => `- ${acao}`).join('\n')}
`).join('\n') : 'Nenhuma recomendação específica no momento.'}

---

## 💰 Projeção Financeira

### Situação Atual
- **${relatorio.resumo.empresasPremium} usuários premium** × R$ 39/mês = **R$ ${relatorio.resumo.empresasPremium * 39}/mês**

### Potencial Curto Prazo (30 dias)
- Converter 30% dos ${relatorio.resumo.empresasAtivas} ativos = **+${Math.round(relatorio.resumo.empresasAtivas * 0.3)} premium**
- Total estimado: **${relatorio.resumo.empresasPremium + Math.round(relatorio.resumo.empresasAtivas * 0.3)} premium** = **R$ ${(relatorio.resumo.empresasPremium + Math.round(relatorio.resumo.empresasAtivas * 0.3)) * 39}/mês**

---

## 📊 Conclusão

- ✅ **Base sólida**: ${relatorio.resumo.empresasAtivas} usuários reais ativos
- ✅ **Conversão**: ${relatorio.resumo.taxaConversao}% (${relatorio.resumo.taxaConversao >= 10 ? 'boa' : 'pode melhorar'})
- ✅ **Engajamento**: ${relatorio.resumo.taxaEngajamento}% dos usuários estão ativos
- ⚠️ **Oportunidade**: ${relatorio.resumo.empresasInativas} usuários inativos para reativar

---

*Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}*
`;

    // Salvar relatório
    const nomeArquivo = `ANALISE_AUTOMATICA_${new Date().toISOString().split('T')[0]}.md`;
    writeFileSync(nomeArquivo, markdown, 'utf-8');

    console.log(`✅ Relatório salvo em: ${nomeArquivo}\n`);
    console.log('📊 RESUMO RÁPIDO:');
    console.log(`   Total de Empresas: ${relatorio.resumo.totalEmpresas}`);
    console.log(`   Premium: ${relatorio.resumo.empresasPremium}`);
    console.log(`   Ativas: ${relatorio.resumo.empresasAtivas}`);
    console.log(`   Inativas: ${relatorio.resumo.empresasInativas}`);
    console.log(`   Taxa Conversão: ${relatorio.resumo.taxaConversao}%`);
    console.log(`   Taxa Engajamento: ${relatorio.resumo.taxaEngajamento}%\n`);

    return relatorio;

  } catch (error) {
    console.error('❌ Erro ao executar análise:', error);
    throw error;
  }
}

// Executar análise
executarAnaliseCompleta()
  .then(() => {
    console.log('✅ Análise completa finalizada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

