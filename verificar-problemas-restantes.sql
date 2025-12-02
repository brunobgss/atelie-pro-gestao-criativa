-- 🔍 VERIFICAÇÃO ESPECÍFICA: Problemas Restantes
-- Esta query identifica exatamente os registros que precisam correção

SELECT 
    '⚠️ PROBLEMAS IDENTIFICADOS' as tipo,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    CASE 
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        WHEN e.trial_end_date >= NOW() THEN 'ATIVO'
        ELSE 'SEM_DATA'
    END as status_real,
    CASE 
        WHEN e.is_premium = true AND (e.trial_end_date IS NULL OR e.trial_end_date >= NOW()) THEN 'active'
        WHEN e.is_premium = true AND e.trial_end_date < NOW() THEN 'expired'
        WHEN e.is_premium = false AND e.trial_end_date < NOW() THEN 'expired'
        WHEN e.is_premium = false AND e.trial_end_date >= NOW() THEN 'trial'
        ELSE 'trial'
    END as status_correto,
    CASE 
        WHEN e.is_premium = true AND (e.trial_end_date IS NULL OR e.trial_end_date >= NOW()) AND e.status != 'active' THEN '⚠️ Premium ativo mas status não é "active"'
        WHEN e.is_premium = true AND e.trial_end_date < NOW() AND e.status != 'expired' THEN '⚠️ Premium expirado mas status não é "expired"'
        WHEN e.is_premium = false AND e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN '⚠️ PROBLEMA: Trial expirado mas status é "trial"'
        WHEN e.is_premium = false AND e.trial_end_date >= NOW() AND e.status = 'expired' THEN '⚠️ PROBLEMA: Trial ativo mas status é "expired"'
        ELSE '✅ OK'
    END as problema
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL
    AND (
        -- Premium ativo mas status errado
        (e.is_premium = true AND (e.trial_end_date IS NULL OR e.trial_end_date >= NOW()) AND e.status != 'active')
        OR
        -- Premium expirado mas status errado
        (e.is_premium = true AND e.trial_end_date < NOW() AND e.status != 'expired')
        OR
        -- Trial expirado mas status é trial
        (e.is_premium = false AND e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL))
        OR
        -- Trial ativo mas status é expired
        (e.is_premium = false AND e.trial_end_date >= NOW() AND e.status = 'expired')
    )
ORDER BY 
    CASE 
        WHEN e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN 1
        WHEN e.trial_end_date >= NOW() AND e.status = 'expired' THEN 2
        ELSE 3
    END,
    e.trial_end_date DESC;

-- RESUMO: Quantos problemas restam
SELECT 
    '📊 RESUMO DE PROBLEMAS' as info,
    COUNT(CASE WHEN e.is_premium = false AND e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN 1 END) as trial_expirado_mal_marcado,
    COUNT(CASE WHEN e.is_premium = false AND e.trial_end_date >= NOW() AND e.status = 'expired' THEN 1 END) as trial_ativo_mal_marcado,
    COUNT(CASE WHEN e.is_premium = true AND (e.trial_end_date IS NULL OR e.trial_end_date >= NOW()) AND e.status != 'active' THEN 1 END) as premium_ativo_mal_marcado,
    COUNT(CASE WHEN e.is_premium = true AND e.trial_end_date < NOW() AND e.status != 'expired' THEN 1 END) as premium_expirado_mal_marcado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL;









