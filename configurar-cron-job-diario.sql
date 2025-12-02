-- ⏰ CONFIGURAR CRON JOB DIÁRIO
-- Execute este script DEPOIS de habilitar a extensão pg_cron

-- 1. Verificar se pg_cron está habilitado
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '✅ pg_cron está habilitado'
        ELSE '❌ pg_cron NÃO está habilitado - Execute primeiro: habilitar-pg-cron.sql'
    END as status;

-- 2. Remover cron job antigo se existir (para evitar duplicatas)
SELECT cron.unschedule('sync-trial-status-daily')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-trial-status-daily'
);

-- 3. Criar cron job diário que executa à meia-noite UTC todos os dias
SELECT cron.schedule(
    'sync-trial-status-daily',           -- Nome do job
    '0 0 * * *',                         -- Schedule: meia-noite UTC todos os dias
    $$SELECT sync_trial_status_daily()$$ -- SQL a ser executado
);

-- 4. Verificar se o cron job foi criado
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobid
FROM cron.job
WHERE jobname = 'sync-trial-status-daily';

-- 5. Listar todos os cron jobs ativos
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
ORDER BY jobid DESC;









