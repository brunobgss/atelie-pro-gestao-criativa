# 📊 RELATÓRIO DE USO - ATELIÊ PRO
## Análise de Engajamento dos Usuários

---

## 🎯 COMO INTERPRETAR O RELATÓRIO

### Métricas Principais:
1. **Total de usuários cadastrados** - Todos que se registraram
2. **Usuários com clientes** - Criaram pelo menos 1 cliente
3. **Usuários com pedidos** - Criaram pedidos de produção
4. **Usuários com orçamentos** - Fizeram orçamentos
5. **Última atividade** - Quando foi a última ação no app

### Classificação de Usuários:

#### 🟢 **USUÁRIOS ATIVOS** (Usando o app):
- Cadastraram clientes OU
- Criaram pedidos OU
- Fizeram orçamentos

#### 🔴 **USUÁRIOS INATIVOS** (Apenas cadastrados):
- Não criaram clientes
- Não criaram pedidos  
- Não fizeram orçamentos
- Apenas fizeram login e cadastro

#### ⏳ **USUÁRIOS EM TRIAL**:
- Trial ativo (< 7 dias)
- Trial expirado (bloqueados)

#### 🎯 **USUÁRIOS PREMIUM**:
- Assinantes pagantes

---

## 🔍 INSTRUÇÕES PARA VERIFICAR USO DOS USUÁRIOS

### Opção 1: Executar no Supabase SQL Editor
1. Acesse: https://supabase.com/dashboard/project/xthioxkfkxjvqcjqllfy/sql/new
2. Cole o conteúdo do arquivo `verificar-uso-usuarios.sql`
3. Execute o script
4. Analise os resultados

### Opção 2: Verificar via Dashboard Supabase
1. Acesse a seção **Table Editor**
2. Verifique as tabelas:
   - `auth.users` - Ver quantos usuários existem
   - `empresas` - Ver quantas empresas foram criadas
   - `customers` - Ver quantos clientes foram cadastrados
   - `atelie_orders` - Ver quantos pedidos foram criados
   - `atelie_quotes` - Ver quantos orçamentos foram feitos

---

## 📈 O QUE VERIFICAR

### ✅ Sinais de Uso Real:
- **Clientes cadastrados**: Pelo menos 1 cliente por empresa
- **Pedidos criados**: Pelo menos 1 pedido
- **Orçamentos feitos**: Pelo menos 1 orçamento
- **Atividade recente**: Ações nos últimos 7 dias

### ❌ Sinais de Cadastro sem Uso:
- Nenhum cliente cadastrado
- Nenhum pedido criado
- Nenhum orçamento feito
- Última atividade = data de cadastro

---

## 💡 AÇÕES RECOMENDADAS

### Para Usuários Ativos mas não Premium:
1. **Email de follow-up**: Enviar 3 dias antes do trial expirar
2. **Mostrar valor**: Demonstrar funcionalidades que eles ainda não usaram
3. **Offerta promocional**: Desconto para os primeiros assinantes

### Para Usuários Inativos:
1. **Email de onboarding**: Mostrar como usar o app
2. **Educação**: Tutoriais de como cadastrar primeiro cliente
3. **Suporte**: Oferecer ajuda para começar
4. **Trigger**: Re-engajamento com dicas práticas

### Para Usuários com Trial Expirado:
1. **Re-ativação**: Oferecer extensão do trial
2. **Feedback**: Entender por que não assinaram
3. **Re-engajamento**: Mostrar atualizações e melhorias

---

## 🚨 ANÁLISE ESPECÍFICA

Após executar o script, você terá informações sobre:

1. **Taxa de conversão**:
   - % de usuários que apenas se cadastraram vs usuários ativos
   - % de usuários que usaram vs usuários premium

2. **Engagement**:
   - Quais usuários mais ativos
   - O que eles mais fazem no app
   - Padrões de uso

3. **Churn**:
   - Quantos usuários fizeram cadastro mas nunca usaram
   - Quantos usuários estavam ativos mas pararam
   - Tempo médio até primeira ação real

---

## 📊 PRÓXIMOS PASSOS

Após analisar os resultados:

1. **Identifique o problema**:
   - Alto cadastro mas baixo uso = Problema de onboarding
   - Alto uso mas baixa conversão = Problema de preço/valor
   - Baixo cadastro = Problema de marketing

2. **Aja de acordo**:
   - Se muitos inativos → Melhore onboarding
   - Se usam mas não pagam → Reavalie proposta de valor
   - Se baixo cadastro → Invista em marketing

3. **Monitore continuamente**:
   - Execute este relatório semanalmente
   - Acompanhe tendências
   - Ajuste estratégia conforme resultados

