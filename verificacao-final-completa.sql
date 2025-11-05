-- ✅ VERIFICAÇÃO FINAL: Confirmar que tudo está funcionando corretamente

-- 1. Verificar se trigger e funções foram criados
SELECT 
    '✅ Funções e Triggers Criados' as tipo,
    routine_name as nome,
    routine_type as tipo_objeto
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name IN ('sync_empresa_status', 'fix_all_empresa_status', 'sync_trial_status_daily')
UNION ALL
SELECT 
    '✅ Trigger' as tipo,
    trigger_name as nome,
    'TRIGGER' as tipo_objeto
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name = 'sync_empresa_status_trigger';

-- 2. Verificar status atual (deve estar tudo correto)
SELECT 
    '📊 RESUMO FINAL' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND status = 'expired' 
          THEN 1 END) as trial_expirado_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') >= NOW() 
               AND status = 'trial' 
          THEN 1 END) as trial_ativo_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND (status = 'trial' OR status IS NULL) 
          THEN 1 END) as problemas_restantes_expirado,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') >= NOW() 
               AND status = 'expired' 
          THEN 1 END) as problemas_restantes_ativo
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.created_at IS NOT NULL;

-- 3. Verificar se trial_end_date está correto para não premium
SELECT 
    '📊 Verificação trial_end_date' as info,
    COUNT(*) as total_nao_premium,
    COUNT(CASE WHEN trial_end_date IS NULL THEN 1 END) as sem_trial_end_date,
    COUNT(CASE WHEN trial_end_date IS NOT NULL 
               AND ABS(EXTRACT(DAYS FROM (trial_end_date - (created_at + INTERVAL '7 days')))) <= 1 
          THEN 1 END) as trial_end_date_correto,
    COUNT(CASE WHEN trial_end_date IS NOT NULL 
               AND ABS(EXTRACT(DAYS FROM (trial_end_date - (created_at + INTERVAL '7 days')))) > 1 
          THEN 1 END) as trial_end_date_incorreto
FROM public.empresas e
WHERE (is_premium IS NULL OR is_premium = false)
    AND created_at IS NOT NULL;

-- 4. Exemplos de usuários
SELECT 
    u.email,
    e.nome as empresa_nome,
    e.created_at,
    e.trial_end_date,
    (e.created_at + INTERVAL '7 days') as deveria_ser_trial_end_date,
    e.status,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.created_at)) as dias_desde_criacao,
    CASE 
        WHEN e.is_premium = true THEN '💎 Premium'
        WHEN (e.created_at + INTERVAL '7 days') < NOW() THEN '⏰ Trial Expirado'
        ELSE '✅ Trial Ativo'
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.created_at IS NOT NULL
ORDER BY 
    CASE WHEN e.is_premium = true THEN 1 ELSE 2 END,
    e.created_at DESC
LIMIT 15;

