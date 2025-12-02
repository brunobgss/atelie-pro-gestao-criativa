-- ✅ VERIFICAÇÃO: Confirmar que a sincronização está funcionando
-- Execute esta query para verificar se tudo está correto

-- 1. Verificar se a função e trigger foram criados
SELECT 
    'Funções e Triggers' as tipo,
    routine_name as nome,
    routine_type as tipo_objeto
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name IN ('sync_empresa_status', 'fix_all_empresa_status', 'sync_trial_status_daily')
UNION ALL
SELECT 
    'Trigger' as tipo,
    trigger_name as nome,
    'TRIGGER' as tipo_objeto
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name = 'sync_empresa_status_trigger';

-- 2. Verificar status atual dos usuários (deve estar tudo sincronizado)
SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_na_tabela,
    e.is_premium,
    CASE 
        WHEN e.is_premium = true THEN 'PREMIUM'
        WHEN e.trial_end_date IS NULL THEN 'SEM_TRIAL'
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        ELSE 'ATIVO'
    END as status_real_calculado,
    CASE 
        WHEN e.is_premium = true THEN '✅ OK - Premium'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND e.status = 'expired' 
        THEN '✅ OK - Trial expirado'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND e.status = 'trial' 
        THEN '✅ OK - Trial ativo'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND (e.status = 'trial' OR e.status IS NULL) 
        THEN '⚠️ PROBLEMA: Deveria ser expired'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND e.status = 'expired' 
        THEN '⚠️ PROBLEMA: Deveria ser trial'
        ELSE '❓ Verificar'
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL
ORDER BY 
    CASE 
        WHEN e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN 1
        WHEN e.trial_end_date >= NOW() AND e.status = 'expired' THEN 2
        WHEN e.is_premium = true THEN 3
        ELSE 4
    END,
    e.trial_end_date DESC;

-- 3. Resumo estatístico
SELECT 
    '📊 RESUMO GERAL' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN e.is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN (e.is_premium IS NULL OR e.is_premium = false) 
               AND e.trial_end_date IS NOT NULL 
               AND e.trial_end_date < NOW() 
               AND e.status = 'expired' 
          THEN 1 END) as trial_expirado_correto,
    COUNT(CASE WHEN (e.is_premium IS NULL OR e.is_premium = false) 
               AND e.trial_end_date IS NOT NULL 
               AND e.trial_end_date >= NOW() 
               AND e.status = 'trial' 
          THEN 1 END) as trial_ativo_correto,
    COUNT(CASE WHEN (e.is_premium IS NULL OR e.is_premium = false) 
               AND e.trial_end_date IS NOT NULL 
               AND e.trial_end_date < NOW() 
               AND (e.status = 'trial' OR e.status IS NULL) 
          THEN 1 END) as problemas_restantes,
    COUNT(CASE WHEN (e.is_premium IS NULL OR e.is_premium = false) 
               AND e.trial_end_date IS NOT NULL 
               AND e.trial_end_date >= NOW() 
               AND e.status = 'expired' 
          THEN 1 END) as problemas_restantes_ativo
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id;

-- 4. Testar se o trigger funciona (simulação)
-- Esta query mostra o que aconteceria se atualizássemos um registro
SELECT 
    '🧪 TESTE: Verificar comportamento do trigger' as info,
    e.id,
    e.nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    CASE 
        WHEN e.trial_end_date < NOW() AND e.is_premium = false THEN 'expired'
        WHEN e.trial_end_date >= NOW() AND e.is_premium = false THEN 'trial'
        WHEN e.is_premium = true AND (e.trial_end_date IS NULL OR e.trial_end_date >= NOW()) THEN 'active'
        WHEN e.is_premium = true AND e.trial_end_date < NOW() THEN 'expired'
        ELSE 'trial'
    END as status_esperado_pelo_trigger
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL
LIMIT 10;









