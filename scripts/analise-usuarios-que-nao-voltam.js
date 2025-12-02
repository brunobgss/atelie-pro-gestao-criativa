/**
 * 📊 Análise de Usuários que Usaram mas Não Voltaram
 * 
 * Identifica padrões de abandono e possíveis razões
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://xthioxkfkxjvqcjqllfy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanFsbGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI2MTIsImV4cCI6MjA3NTU4ODYxMn0.JejxFLLbf9cDyACJvkFe5WQEs5hGfpmkO3DqF01tuLE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EMAILS_TESTE = new Set([
  'brunobgs1888@gmail.com',
  'brunobgstp01@gmail.com',
  'brunopix29@gmail.com',
  'bgsoftwares1@gmail.com',
  'ateliepro751@gmail.com',
  'brunobgs2004@gmail.com',
  'brunobgstp@gmail.com',
  'jonasbrsil54@gmail.com'
]);

const NOMES_SUSPEITOS = ['teste', 'test', 'demo', 'bruno', 'bgsoftware', 'focus', 'jonas'];

function isEmpresaTeste(empresa) {
  if (!empresa) return true;
  const nome = (empresa.nome || '').toLowerCase();
  return NOMES_SUSPEITOS.some((keyword) => nome.includes(keyword));
}

function diasDesde(data) {
  if (!data) return Infinity;
  const diferencaMs = Date.now() - new Date(data).getTime();
  return Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toISOString().split('T')[0];
}

async function analisarUsuariosQueNaoVoltam() {
  console.log('🔍 Analisando usuários que usaram mas não voltaram...\n');

  // Carregar dados
  const [
    { data: empresas, error: errEmpresas },
    { data: customers, error: errClientes },
    { data: pedidos, error: errPedidos },
    { data: orcamentos, error: errOrcamentos }
  ] = await Promise.all([
    supabase
      .from('empresas')
      .select('id, nome, email, created_at, trial_end_date, is_premium, status'),
    supabase.from('customers').select('empresa_id, created_at'),
    supabase.from('atelie_orders').select('empresa_id, created_at, status'),
    supabase.from('atelie_quotes').select('empresa_id, created_at')
  ]);

  if (errEmpresas || errClientes || errPedidos || errOrcamentos) {
    throw new Error('Erro ao carregar dados');
  }

  // Filtrar empresas reais
  const empresasReais = empresas.filter(e => !isEmpresaTeste(e) && !EMAILS_TESTE.has((e.email || '').toLowerCase()));

  // Calcular atividade por empresa
  const atividadePorEmpresa = new Map();

  empresasReais.forEach(emp => {
    const clientesEmp = customers.filter(c => c.empresa_id === emp.id);
    const pedidosEmp = pedidos.filter(p => p.empresa_id === emp.id);
    const orcamentosEmp = orcamentos.filter(o => o.empresa_id === emp.id);

    const todasAtividades = [
      ...clientesEmp.map(c => ({ tipo: 'cliente', data: c.created_at })),
      ...pedidosEmp.map(p => ({ tipo: 'pedido', data: p.created_at })),
      ...orcamentosEmp.map(o => ({ tipo: 'orcamento', data: o.created_at }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    const primeiraAtividade = todasAtividades.length > 0 ? todasAtividades[todasAtividades.length - 1].data : null;
    const ultimaAtividade = todasAtividades.length > 0 ? todasAtividades[0].data : null;
    const diasSemAtividade = ultimaAtividade ? diasDesde(ultimaAtividade) : Infinity;

    atividadePorEmpresa.set(emp.id, {
      empresa: emp,
      totalAtividades: todasAtividades.length,
      primeiraAtividade,
      ultimaAtividade,
      diasSemAtividade,
      totalClientes: clientesEmp.length,
      totalPedidos: pedidosEmp.length,
      totalOrcamentos: orcamentosEmp.length,
      atividades: todasAtividades
    });
  });

  // Classificar usuários
  const agora = new Date();
  const usuariosAtivos = [];
  const usuariosInativos = [];
  const usuariosQueNaoVoltam = [];

  atividadePorEmpresa.forEach((stats, empresaId) => {
    if (stats.totalAtividades === 0) {
      usuariosInativos.push(stats);
      return;
    }

    const diasSemUso = stats.diasSemAtividade;
    const isPremium = stats.empresa.is_premium;
    const trialEnd = stats.empresa.trial_end_date ? new Date(stats.empresa.trial_end_date) : null;
    const trialExpirado = trialEnd && trialEnd < agora;

    // Ativo = usado nos últimos 7 dias
    if (diasSemUso <= 7) {
      usuariosAtivos.push(stats);
    }
    // Usou mas não voltou = mais de 7 dias sem atividade
    else if (diasSemUso > 7) {
      usuariosQueNaoVoltam.push({
        ...stats,
        motivoPossivel: isPremium 
          ? 'Premium mas parou de usar' 
          : trialExpirado 
            ? 'Trial expirado - bloqueado' 
            : 'Trial ativo mas não usa',
        diasTrialRestantes: trialEnd ? Math.ceil((trialEnd.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)) : null
      });
    }
  });

  // Ordenar por tempo sem uso (mais recente primeiro)
  usuariosQueNaoVoltam.sort((a, b) => a.diasSemAtividade - b.diasSemAtividade);

  // Análise de padrões
  const porMotivo = {
    'Trial expirado - bloqueado': usuariosQueNaoVoltam.filter(u => u.motivoPossivel === 'Trial expirado - bloqueado').length,
    'Trial ativo mas não usa': usuariosQueNaoVoltam.filter(u => u.motivoPossivel === 'Trial ativo mas não usa').length,
    'Premium mas parou de usar': usuariosQueNaoVoltam.filter(u => u.motivoPossivel === 'Premium mas parou de usar').length
  };

  const porTempoSemUso = {
    '7-15 dias': usuariosQueNaoVoltam.filter(u => u.diasSemAtividade >= 7 && u.diasSemAtividade <= 15).length,
    '16-30 dias': usuariosQueNaoVoltam.filter(u => u.diasSemAtividade >= 16 && u.diasSemAtividade <= 30).length,
    '31-60 dias': usuariosQueNaoVoltam.filter(u => u.diasSemAtividade >= 31 && u.diasSemAtividade <= 60).length,
    'Mais de 60 dias': usuariosQueNaoVoltam.filter(u => u.diasSemAtividade > 60).length
  };

  // Calcular tempo médio de uso antes de parar
  const temposDeUso = usuariosQueNaoVoltam
    .filter(u => u.primeiraAtividade && u.ultimaAtividade)
    .map(u => {
      const inicio = new Date(u.primeiraAtividade);
      const fim = new Date(u.ultimaAtividade);
      return Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    });

  const tempoMedioUso = temposDeUso.length > 0 
    ? Math.round(temposDeUso.reduce((a, b) => a + b, 0) / temposDeUso.length)
    : 0;

  // Gerar relatório
  const dataExecucao = new Date();
  const relatorio = `# 📊 Análise: Por que Usuários Usam mas Não Voltam?

**Gerado em:** ${dataExecucao.toLocaleString('pt-BR')}

---

## 📈 Resumo Geral

- **Usuários ativos** (últimos 7 dias): **${usuariosAtivos.length}**
- **Usuários que usaram mas não voltam** (>7 dias): **${usuariosQueNaoVoltam.length}**
- **Usuários inativos** (nunca usaram): **${usuariosInativos.length}**
- **Tempo médio de uso antes de parar**: **${tempoMedioUso} dias**

---

## 🔍 Análise por Motivo Provável

| Motivo | Quantidade | % |
|--------|------------|---|
| **Trial expirado - bloqueado** | ${porMotivo['Trial expirado - bloqueado']} | ${((porMotivo['Trial expirado - bloqueado'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |
| **Trial ativo mas não usa** | ${porMotivo['Trial ativo mas não usa']} | ${((porMotivo['Trial ativo mas não usa'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |
| **Premium mas parou de usar** | ${porMotivo['Premium mas parou de usar']} | ${((porMotivo['Premium mas parou de usar'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |

---

## ⏰ Análise por Tempo sem Uso

| Período | Quantidade | % |
|---------|------------|---|
| **7-15 dias** | ${porTempoSemUso['7-15 dias']} | ${((porTempoSemUso['7-15 dias'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |
| **16-30 dias** | ${porTempoSemUso['16-30 dias']} | ${((porTempoSemUso['16-30 dias'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |
| **31-60 dias** | ${porTempoSemUso['31-60 dias']} | ${((porTempoSemUso['31-60 dias'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |
| **Mais de 60 dias** | ${porTempoSemUso['Mais de 60 dias']} | ${((porTempoSemUso['Mais de 60 dias'] / usuariosQueNaoVoltam.length) * 100).toFixed(1)}% |

---

## 📋 Detalhamento: Usuários que Não Voltam

${usuariosQueNaoVoltam.slice(0, 20).map((u, i) => {
  const engajamento = u.totalClientes + u.totalPedidos + u.totalOrcamentos;
  const periodoUso = u.primeiraAtividade && u.ultimaAtividade
    ? `${Math.floor((new Date(u.ultimaAtividade).getTime() - new Date(u.primeiraAtividade).getTime()) / (1000 * 60 * 60 * 24))} dias`
    : '—';
  
  return `### ${i + 1}. ${u.empresa.nome}
- **Email:** ${u.empresa.email}
- **Status:** ${u.empresa.is_premium ? '🎯 Premium' : u.empresa.status || 'Trial'}
- **Motivo provável:** ${u.motivoPossivel}
- **Engajamento:** ${engajamento} ações (${u.totalClientes} clientes, ${u.totalPedidos} pedidos, ${u.totalOrcamentos} orçamentos)
- **Período de uso:** ${periodoUso}
- **Primeira atividade:** ${formatDate(u.primeiraAtividade)}
- **Última atividade:** ${formatDate(u.ultimaAtividade)} (${u.diasSemAtividade} dias atrás)
${u.diasTrialRestantes !== null ? `- **Dias restantes no trial:** ${u.diasTrialRestantes}` : ''}
`;
}).join('\n')}

${usuariosQueNaoVoltam.length > 20 ? `\n*... e mais ${usuariosQueNaoVoltam.length - 20} usuários*\n` : ''}

---

## 💡 Insights e Possíveis Razões

### 1. **Trial Expirado (${porMotivo['Trial expirado - bloqueado']} usuários)**
**Problema:** Usuários foram bloqueados após trial expirar.

**Possíveis razões:**
- ⚠️ Não entenderam o valor do produto durante o trial
- ⚠️ Trial muito curto (7 dias pode não ser suficiente)
- ⚠️ Falta de lembretes antes da expiração
- ⚠️ Processo de pagamento complicado ou não claro

**Ações sugeridas:**
- ✅ Enviar email 3 dias antes do trial expirar
- ✅ Oferecer extensão de trial para usuários ativos
- ✅ Simplificar processo de assinatura
- ✅ Mostrar valor acumulado durante o trial

### 2. **Trial Ativo mas Não Usa (${porMotivo['Trial ativo mas não usa']} usuários)**
**Problema:** Ainda têm trial ativo mas pararam de usar.

**Possíveis razões:**
- ⚠️ Onboarding insuficiente - não souberam como usar
- ⚠️ Falta de funcionalidades essenciais
- ⚠️ Interface confusa ou difícil de navegar
- ⚠️ Não viram valor imediato

**Ações sugeridas:**
- ✅ Melhorar onboarding com tutoriais interativos
- ✅ Enviar emails educativos com dicas de uso
- ✅ Oferecer suporte personalizado
- ✅ Criar vídeos tutoriais

### 3. **Premium mas Parou (${porMotivo['Premium mas parou de usar']} usuários)**
**Problema:** Pagam mas não usam mais.

**Possíveis razões:**
- ⚠️ Cancelamento silencioso (não cancelaram mas não usam)
- ⚠️ Mudança de necessidade/negócio
- ⚠️ Problemas técnicos não resolvidos
- ⚠️ Falta de atualizações/melhorias

**Ações sugeridas:**
- ✅ Re-engajamento com email personalizado
- ✅ Oferecer treinamento/suporte
- ✅ Coletar feedback sobre o que falta
- ✅ Mostrar novas funcionalidades

---

## 🎯 Recomendações Prioritárias

1. **URGENTE:** Implementar email de re-engajamento para trials expirados
2. **ALTA:** Melhorar onboarding para novos usuários
3. **MÉDIA:** Criar campanha de reativação para premium inativos
4. **BAIXA:** Coletar feedback dos usuários que pararam

---

*Relatório gerado automaticamente em ${dataExecucao.toISOString()}*
`;

  const nomeArquivo = `ANALISE_USUARIOS_NAO_VOLTAM_${dataExecucao.toISOString().split('T')[0]}.md`;
  writeFileSync(nomeArquivo, relatorio, 'utf-8');

  console.log('✅ Análise concluída!\n');
  console.log('📊 Resumo:');
  console.log(`   • Usuários ativos: ${usuariosAtivos.length}`);
  console.log(`   • Usaram mas não voltam: ${usuariosQueNaoVoltam.length}`);
  console.log(`   • Nunca usaram: ${usuariosInativos.length}`);
  console.log(`   • Tempo médio de uso: ${tempoMedioUso} dias\n`);
  console.log('📋 Motivos:');
  console.log(`   • Trial expirado: ${porMotivo['Trial expirado - bloqueado']}`);
  console.log(`   • Trial ativo mas não usa: ${porMotivo['Trial ativo mas não usa']}`);
  console.log(`   • Premium mas parou: ${porMotivo['Premium mas parou de usar']}\n`);
  console.log(`📝 Relatório salvo em: ${nomeArquivo}`);
}

analisarUsuariosQueNaoVoltam().catch(erro => {
  console.error('❌ Erro:', erro);
  process.exit(1);
});

