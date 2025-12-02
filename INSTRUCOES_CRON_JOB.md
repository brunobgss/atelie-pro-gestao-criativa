# ⏰ Instruções: Configurar Cron Job Diário

## Passo 1: Habilitar Extensão pg_cron

No Supabase Dashboard:
1. Vá em **Database** → **Extensions** (você já está aqui!)
2. Encontre a extensão **pg_cron**
3. Clique no **toggle** para ativá-la (mudar de "off" para "on")
   - Ou execute no SQL Editor: `habilitar-pg-cron.sql`

## Passo 2: Configurar Cron Job

Execute no Supabase SQL Editor:
```
configurar-cron-job-diario.sql
```

Isso vai:
- ✅ Verificar se pg_cron está habilitado
- ✅ Criar cron job que executa diariamente à meia-noite UTC
- ✅ Executar a função `sync_trial_status_daily()` automaticamente

## Passo 3: Verificar se Funcionou

Execute para ver os cron jobs ativos:
```sql
SELECT * FROM cron.job WHERE jobname = 'sync-trial-status-daily';
```

## Como Funciona

O cron job executa **todos os dias à meia-noite UTC** (21h no horário de Brasília):
- Verifica todos os trials que expiraram
- Atualiza status automaticamente
- Corrige qualquer inconsistência

## Gerenciar Cron Jobs

### Ver todos os cron jobs:
```sql
SELECT * FROM cron.job;
```

### Desativar cron job:
```sql
SELECT cron.unschedule('sync-trial-status-daily');
```

### Ativar novamente:
```sql
SELECT cron.schedule(
    'sync-trial-status-daily',
    '0 0 * * *',
    $$SELECT sync_trial_status_daily()$$
);
```

### Mudar horário:
```sql
-- Exemplo: executar às 2h da manhã UTC
SELECT cron.unschedule('sync-trial-status-daily');
SELECT cron.schedule(
    'sync-trial-status-daily',
    '0 2 * * *',  -- 2h da manhã UTC
    $$SELECT sync_trial_status_daily()$$
);
```

## Nota Importante

⚠️ **O cron job é OPCIONAL!**

O sistema já funciona sem ele porque:
- ✅ Trigger automático sincroniza ao inserir/atualizar
- ✅ Código TypeScript verifica quando usuário acessa
- ✅ Tudo funciona automaticamente

O cron job é apenas uma **verificação extra diária** para garantir que tudo está sincronizado, mesmo que um usuário não acesse por muito tempo.

## Troubleshooting

### "pg_cron não está habilitado"
- Vá em Database → Extensions
- Ative o toggle do pg_cron
- Ou execute: `CREATE EXTENSION IF NOT EXISTS pg_cron;`

### "Erro ao criar cron job"
- Verifique se pg_cron está habilitado
- Verifique se a função `sync_trial_status_daily()` existe

### "Cron job não está executando"
- Verifique se está ativo: `SELECT * FROM cron.job;`
- Verifique logs no Supabase Dashboard → Logs









