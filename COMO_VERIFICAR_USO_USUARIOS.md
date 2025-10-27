# 🔍 Como Verificar Se Usuários Estão Usando o App

Você tem **3 maneiras** de verificar se seus usuários cadastrados estão realmente usando o app:

---

## 📊 OPÇÃO 1: RELATÓRIO VISUAL NO APP (MAIS FÁCIL)

### Como Acessar:
1. Inicie o app normalmente
2. Acesse: `http://localhost:5173/admin/relatorio-uso`
3. Ou acesse diretamente após fazer login

### O que você verá:
- ✅ Total de usuários cadastrados
- ✅ Quantos estão realmente usando o app
- ✅ Quantos são premium
- ✅ Detalhamento por empresa
- ✅ Classificação: Ativo, Inativo, Premium, Trial

### Vantagens:
- Interface visual bonita
- Não precisa executar SQL manualmente
- Acesso rápido e fácil

---

## 🗄️ OPÇÃO 2: SQL DIRETO NO SUPABASE

### Como Acessar:
1. Entre no Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New Query**
4. Cole o conteúdo do arquivo `verificar-uso-usuarios.sql`
5. Execute

### O que você verá:
- Estatísticas gerais (total cadastrados, com clientes, etc.)
- Detalhamento por usuário
- Análise de engajamento
- Lista de usuários inativos
- Top usuários mais ativos
- Timeline de atividade

### Vantagens:
- Dados brutos completos
- Pode filtrar e personalizar
- Exportável para Excel

---

## 📝 OPÇÃO 3: ANÁLISE MANUAL VIA SUPABASE UI

### Passo a Passo:
1. **Table Editor** → `auth.users`
   - Veja quantos usuários estão cadastrados

2. **Table Editor** → `empresas`
   - Veja quantas empresas foram criadas
   - Compare com número de usuários

3. **Table Editor** → `customers`
   - Veja quantos clientes foram cadastrados
   - Empresas com clientes = empresas que usaram o app

4. **Table Editor** → `atelie_orders`
   - Veja quantos pedidos foram criados
   - Indica uso real do app

5. **Table Editor** → `atelie_quotes`
   - Veja quantos orçamentos foram feitos

### O que indicar USO REAL:
- ✅ Empresa criou pelo menos 1 cliente
- ✅ Empresa criou pelo menos 1 pedido
- ✅ Empresa fez pelo menos 1 orçamento

---

## 🎯 COMO INTERPRETAR OS RESULTADOS

### Cenário 1: Muitos Cadastros, Pouco Uso
**Problema**: Usuários se cadastram mas não usam
**Solução**: 
- Melhorar onboarding
- Enviar emails educativos
- Oferecer ajuda personalizada

### Cenário 2: Alto Uso, Baixa Conversão Premium
**Problema**: Usuários usam mas não pagam
**Solução**:
- Revisar proposta de valor
- Mostrar benefícios premium
- Oferecer desconto inicial

### Cenário 3: Baixo Cadastro em Geral
**Problema**: Marketing não está funcionando
**Solução**:
- Investir em campanhas
- Melhorar landing page
- SEO e redes sociais

---

## 📈 EXEMPLO DE ANÁLISE

```
Total de usuários cadastrados: 50
Empresas com clientes: 15
Empresas com pedidos: 8
Usuários premium: 2

Taxa de Uso Real: 30% (15/50)
Taxa de Conversão: 4% (2/50)

CONCLUSÃO:
- 30% dos usuários estão usando o app ✅
- 4% dos usuários pagaram ❌
- 70% dos usuários apenas se cadastraram ⚠️
```

---

## 🚀 AÇÕES RECOMENDADAS

### Para Usuários Inativos (70%):
1. **Email de onboarding** 2 dias após cadastro
2. **Tutorial** de como cadastrar primeiro cliente
3. **Suporte** - oferecer ajuda

### Para Usuários Ativos mas não Premium:
1. **Email** 3 dias antes do trial expirar
2. **Demonstração** de funcionalidades premium
3. **Desconto** especial para os primeiros

### Para Trials Expirados:
1. **Re-engajamento** - mostrar atualizações
2. **Feedback** - entender objeções
3. **Oferta especial** de retorno

---

## 📊 FREQUÊNCIA DE VERIFICAÇÃO

- **Semanalmente**: Para monitorar tendências
- **Após campanhas**: Para medir impacto
- **Antes de lançamentos**: Para entender baseline

---

## 💡 DICA FINAL

O melhor indicador de sucesso é:
**Taxa de Conversão = Usuários Premium / Usuários Cadastrados**

Se for menor que 5%, há espaço para melhorar!

