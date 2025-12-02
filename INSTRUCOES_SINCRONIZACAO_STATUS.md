# 🔧 Instruções: Sincronização Automática de Status

Este documento explica como implementar a sincronização automática do status de trial/premium no sistema.

## 📋 Problema Identificado

Há inconsistências no banco de dados onde:
- Usuários com trial **expirado** ainda têm `status = 'trial'`
- Usuários com trial **ativo** têm `status = 'expired'`

## ✅ Solução Implementada

A solução consiste em 3 partes:

### 1. **Correção dos Dados Existentes**
Script que corrige todos os registros com problemas no banco.

### 2. **Sincronização Automática no Banco**
Trigger que mantém o status sempre sincronizado automaticamente.

### 3. **Sincronização no Código**
Código TypeScript que verifica e sincroniza quando necessário.

---

## 🚀 Passo a Passo de Implementação

### **Passo 1: Corrigir Dados Existentes**

Execute no Supabase SQL Editor:

```sql
-- Arquivo: corrigir-dados-existentes-primeiro.sql
```

Este script:
- ✅ Corrige trials expirados que estão marcados como 'trial'
- ✅ Corrige trials ativos que estão marcados como 'expired'
- ✅ Corrige premium users expirados
- ✅ Mostra resumo antes e depois

### **Passo 2: Ativar Sincronização Automática**

Execute no Supabase SQL Editor:

```sql
-- Arquivo: sincronizar-status-trial-automatico.sql
```

Este script cria:
- ✅ **Função `sync_empresa_status()`**: Sincroniza status automaticamente
- ✅ **Trigger `sync_empresa_status_trigger`**: Executa antes de INSERT/UPDATE
- ✅ **Função `fix_all_empresa_status()`**: Corrige todos os registros de uma vez
- ✅ **Função `sync_trial_status_daily()`**: Para ser executada diariamente (cron job)

### **Passo 3: Configurar Cron Job (Opcional mas Recomendado)**

No Supabase Dashboard:
1. Vá em **Database** → **Cron Jobs**
2. Crie um novo cron job:
   - **Nome**: `sync_trial_status_daily`
   - **Schedule**: `0 0 * * *` (todos os dias à meia-noite)
   - **SQL**: `SELECT sync_trial_status_daily();`

Isso garante que o status seja verificado e atualizado diariamente.

---

## 🔍 Como Funciona

### **Trigger Automático**

O trigger `sync_empresa_status_trigger` executa **automaticamente** antes de qualquer INSERT ou UPDATE na tabela `empresas` quando os campos `trial_end_date`, `is_premium` ou `status` são modificados.

**Regras de Sincronização:**
- **Premium ativo**: `status = 'active'`
- **Premium expirado**: `status = 'expired'`, `is_premium = false`
- **Trial ativo** (trial_end_date >= NOW): `status = 'trial'`
- **Trial expirado** (trial_end_date < NOW): `status = 'expired'`
- **Sem trial_end_date**: `status = 'trial'` (usuário novo)

### **Sincronização no Código**

O código TypeScript (`src/utils/premiumValidation.ts`) foi atualizado para:
- Verificar o status atual ao buscar dados da empresa
- Sincronizar o status se necessário quando detectar inconsistência
- Funciona como backup caso o trigger não execute

---

## 📊 Verificação

Para verificar se está funcionando corretamente:

```sql
-- Verificar status atual
SELECT 
    email,
    nome,
    trial_end_date,
    status,
    is_premium,
    CASE 
        WHEN trial_end_date < NOW() THEN 'EXPIRADO'
        WHEN trial_end_date >= NOW() THEN 'ATIVO'
        ELSE 'SEM_DATA'
    END as status_real
FROM empresas e
JOIN user_empresas ue ON e.id = ue.empresa_id
JOIN auth.users u ON ue.user_id = u.id
ORDER BY trial_end_date DESC;
```

---

## 🛠️ Manutenção

### **Corrigir Todos os Registros Manualmente**

Se precisar forçar uma correção completa:

```sql
SELECT * FROM fix_all_empresa_status();
```

### **Sincronizar Diariamente (Manual)**

```sql
SELECT sync_trial_status_daily();
```

---

## ⚠️ Importante

1. **Execute os scripts na ordem correta**: primeiro `corrigir-dados-existentes-primeiro.sql`, depois `sincronizar-status-trial-automatico.sql`

2. **O trigger funciona automaticamente**: após ativado, não precisa fazer nada manualmente

3. **Premium users não são afetados**: o sistema protege usuários premium e trials ativos

4. **Backup**: faça backup do banco antes de executar os scripts de correção

---

## 🎯 Resultado Esperado

Após implementar:
- ✅ Todos os registros com status correto
- ✅ Sincronização automática ao inserir/atualizar
- ✅ Status sempre alinhado com `trial_end_date`
- ✅ Premium users protegidos
- ✅ Trials ativos protegidos

---

## 📝 Notas Técnicas

- O trigger usa `BEFORE INSERT OR UPDATE` para garantir que o status seja sempre correto
- A função `sync_empresa_status()` é executada automaticamente pelo trigger
- O código TypeScript funciona como verificação adicional
- O cron job é opcional mas recomendado para garantir sincronização diária









