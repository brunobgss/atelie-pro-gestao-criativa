-- 🔄 SINCRONIZAÇÃO MANUAL: Execute esta query quando quiser verificar e corrigir status
-- Você pode executar isso manualmente quando quiser, ou usar um serviço externo para chamar diariamente

-- Executar a função de sincronização diária
SELECT * FROM sync_trial_status_daily();

-- Verificar quantos registros foram atualizados
SELECT 
    '📊 Resultado da Sincronização' as info,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND status = 'expired' 
          THEN 1 END) as trials_expirados_corretos,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') >= NOW() 
               AND status = 'trial' 
          THEN 1 END) as trials_ativos_corretos,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND (status = 'trial' OR status IS NULL) 
          THEN 1 END) as problemas_restantes
FROM public.empresas
WHERE created_at IS NOT NULL;

