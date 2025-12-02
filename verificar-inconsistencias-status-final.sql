-- 🔍 VERIFICAÇÃO FINAL: Comparar status da tabela vs status real (calculado pela data)
-- Esta query mostra claramente os problemas de inconsistência

SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_na_tabela,
    e.is_premium,
    -- Status real calculado pela data
    CASE 
        WHEN e.is_premium = true THEN 'PREMIUM'
        WHEN e.trial_end_date IS NULL THEN 'SEM_TRIAL'
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        ELSE 'ATIVO'
    END as status_real_calculado,
    -- Dias restantes ou expirado
    CASE 
        WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date >= NOW() 
        THEN EXTRACT(DAYS FROM (e.trial_end_date - NOW()))
        WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() 
        THEN -EXTRACT(DAYS FROM (NOW() - e.trial_end_date))
        ELSE NULL
    END as dias,
    -- Identificar o problema
    CASE 
        WHEN e.is_premium = true THEN '💎 Premium (ignorar)'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND (e.status = 'trial' OR e.status IS NULL) 
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN '⚠️ PROBLEMA 1: Trial EXPIRADO mas status = "trial"'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND e.status = 'expired'
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN '⚠️ PROBLEMA 2: Trial ATIVO mas status = "expired"'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND e.status = 'expired'
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN '✅ CORRETO: Trial expirado e status = "expired"'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND (e.status = 'trial' OR e.status IS NULL)
        THEN '✅ CORRETO: Trial ativo e status = "trial"'
        ELSE CONCAT('❓ OUTRO: status="', COALESCE(e.status, 'NULL'), '"')
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL
ORDER BY 
    CASE 
        WHEN e.is_premium = true THEN 1
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND (e.status = 'trial' OR e.status IS NULL) 
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN 2
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND e.status = 'expired'
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN 3
        ELSE 4
    END,
    e.trial_end_date DESC;

-- RESUMO DOS PROBLEMAS
SELECT 
    '📊 RESUMO GERAL' as tipo,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN e.is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date < NOW() 
               AND (e.status = 'trial' OR e.status IS NULL) 
               AND (e.is_premium IS NULL OR e.is_premium = false) 
          THEN 1 END) as problema_1_trial_expirado_mal_marcado,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date >= NOW() 
               AND e.status = 'expired'
               AND (e.is_premium IS NULL OR e.is_premium = false) 
          THEN 1 END) as problema_2_trial_ativo_mal_marcado,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date < NOW() 
               AND e.status = 'expired'
               AND (e.is_premium IS NULL OR e.is_premium = false) 
          THEN 1 END) as correto_expirado,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date >= NOW() 
               AND (e.status = 'trial' OR e.status IS NULL)
          THEN 1 END) as correto_ativo
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id;









