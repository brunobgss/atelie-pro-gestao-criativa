# 📊 Como Usar a Análise Automática

## 🚀 Execução Simples

Execute o script diretamente no terminal:

```bash
node analise-completa-automatica.js
```

## 📋 O que o script faz:

1. ✅ **Conecta ao Supabase** automaticamente
2. ✅ **Busca todos os dados** (empresas, clientes, pedidos, orçamentos)
3. ✅ **Filtra usuários de teste** automaticamente
4. ✅ **Calcula todas as métricas** (conversão, engajamento, uso, etc.)
5. ✅ **Gera relatório completo** em Markdown
6. ✅ **Salva automaticamente** em `ANALISE_AUTOMATICA_YYYY-MM-DD.md`

## 📊 Relatório Gerado

O relatório inclui:

- 📈 **Resumo Executivo**: Total de empresas, premium, trial, ativas, inativas
- 📊 **Distribuição por Status**: Premium, trial, expired, active
- 🎯 **Engajamento Detalhado**: Empresas com clientes, pedidos, orçamentos
- 💼 **Uso Detalhado**: Médias de uso por empresa ativa
- 💡 **Recomendações**: Ações sugeridas baseadas nos dados
- 💰 **Projeção Financeira**: Estimativas de receita

## ⚙️ Requisitos

- Node.js instalado
- Dependências do projeto instaladas (`npm install`)
- Acesso ao banco de dados Supabase (já configurado no script)

## 🎯 Vantagens

- ✅ **Não precisa executar SQL manualmente** no Supabase
- ✅ **Filtra automaticamente** usuários de teste
- ✅ **Gera relatório completo** em segundos
- ✅ **Pode ser agendado** (cron job, etc.)
- ✅ **Fácil de compartilhar** (arquivo Markdown)

## 📝 Exemplo de Saída

```
🚀 Iniciando análise completa...

📊 Buscando dados do banco...
✅ Dados carregados!

🔍 Filtrando usuários de teste...
✅ 33 empresas reais identificadas

📈 Calculando métricas...
✅ Métricas calculadas!

📝 Gerando relatório...
✅ Relatório salvo em: ANALISE_AUTOMATICA_2024-01-15.md

📊 RESUMO RÁPIDO:
   Total de Empresas: 33
   Premium: 3
   Ativas: 15
   Inativas: 18
   Taxa Conversão: 9.09%
   Taxa Engajamento: 45.45%

✅ Análise completa finalizada!
```

## 🔄 Executar Regularmente

Para executar automaticamente todo dia, você pode:

1. **Windows (Task Scheduler)**: Agendar o script
2. **Linux/Mac (Cron)**: `0 9 * * * cd /caminho/projeto && node analise-completa-automatica.js`
3. **GitHub Actions**: Criar workflow para executar diariamente

---

**Pronto! Agora você pode gerar análises completas com um único comando!** 🎉

