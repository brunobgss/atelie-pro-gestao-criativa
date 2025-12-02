-- ⏰ CONFIGURAR CRON JOB PARA EMAILS EDUCATIVOS (DRIP CAMPAIGN)
-- Este script configura um job que executa diariamente às 10h
-- Envia emails educativos baseados nos dias desde cadastro
-- ZERO manutenção - funciona sozinho!

-- ==========================================
-- PARTE 1: Verificar se pg_cron está habilitado
-- ==========================================

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '✅ pg_cron está habilitado'
        ELSE '❌ pg_cron NÃO está habilitado - Execute primeiro: habilitar-pg-cron.sql'
    END as status;

-- ==========================================
-- PARTE 2: Remover cron job antigo se existir
-- ==========================================

SELECT cron.unschedule('send-educational-emails-daily')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-educational-emails-daily'
);

-- ==========================================
-- PARTE 3: Criar cron job diário
-- ==========================================
-- Executa todos os dias às 10h UTC (7h horário de Brasília)
-- Chama a Edge Function que envia os emails educativos

-- IMPORTANTE: Substitua SEU_SERVICE_ROLE_KEY pela sua chave real
-- Você pode encontrar em: Supabase Dashboard > Settings > API > service_role key

SELECT cron.schedule(
    'send-educational-emails-daily',           -- Nome do job
    '0 10 * * *',                             -- Schedule: 10h UTC todos os dias (7h BRT)
    $$SELECT net.http_post(
        url := 'https://xthioxkfkxjvqcjqllfy.supabase.co/functions/v1/send-educational-emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY_AQUI'
        ),
        body := '{}'::jsonb
    )$$
);

-- ==========================================
-- PARTE 4: Verificar se o cron job foi criado
-- ==========================================

SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    nodename,
    nodeport,
    database,
    username
FROM cron.job
WHERE jobname = 'send-educational-emails-daily';

-- ==========================================
-- PARTE 5: Instruções
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Cron job de emails educativos configurado com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Substitua SEU_SERVICE_ROLE_KEY_AQUI pela sua chave real';
    RAISE NOTICE '2. Encontre a chave em: Supabase Dashboard > Settings > API';
    RAISE NOTICE '3. Execute este script novamente após substituir a chave';
    RAISE NOTICE '';
    RAISE NOTICE '📧 A função executará diariamente às 10h UTC (7h BRT)';
    RAISE NOTICE '📧 Enviará emails educativos para:';
    RAISE NOTICE '   - Dia 1: Bem-vindo';
    RAISE NOTICE '   - Dia 3: Dica de orçamentos';
    RAISE NOTICE '   - Dia 5: Dica de WhatsApp';
    RAISE NOTICE '   - Dia 7: Resumo da primeira semana';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Para testar manualmente, acesse:';
    RAISE NOTICE '   https://xthioxkfkxjvqcjqllfy.supabase.co/functions/v1/send-educational-emails';
END $$;

