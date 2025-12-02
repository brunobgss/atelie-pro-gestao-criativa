-- 🔍 QUERY SIMPLES: Ver status da tabela vs status real
-- Execute esta query para ver os problemas claramente

SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_na_tabela,  -- ⬅️ Este é o valor REAL na coluna status
    e.is_premium,
    -- Comparar com status real calculado
    CASE 
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        WHEN e.trial_end_date >= NOW() THEN 'ATIVO'
        ELSE 'SEM_DATA'
    END as status_real,
    -- Identificar problema
    CASE 
        WHEN e.is_premium = true THEN 'OK - Premium'
        WHEN e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN '⚠️ PROBLEMA: Trial expirado mas status=trial'
        WHEN e.trial_end_date >= NOW() AND e.status = 'expired' THEN '⚠️ PROBLEMA: Trial ativo mas status=expired'
        WHEN e.trial_end_date < NOW() AND e.status = 'expired' THEN '✅ OK'
        WHEN e.trial_end_date >= NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN '✅ OK'
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









