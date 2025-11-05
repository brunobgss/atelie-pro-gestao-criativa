-- 🔍 VERIFICAÇÃO: Usuários que deveriam estar expirados baseado em created_at
-- O trial deve ser 7 dias a partir da criação da conta (created_at)

SELECT 
    '⚠️ PROBLEMA: Trial deveria ter expirado baseado em created_at' as tipo,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.created_at as data_criacao,
    e.trial_end_date as data_trial_atual,
    e.status as status_atual,
    e.is_premium,
    -- Calcular data de expiração correta (7 dias após criação)
    (e.created_at + INTERVAL '7 days') as trial_end_date_correto,
    -- Dias desde a criação
    EXTRACT(DAYS FROM (NOW() - e.created_at)) as dias_desde_criacao,
    -- Dias desde que deveria ter expirado
    CASE 
        WHEN (e.created_at + INTERVAL '7 days') < NOW() THEN
            EXTRACT(DAYS FROM (NOW() - (e.created_at + INTERVAL '7 days')))
        ELSE 0
    END as dias_expirado,
    -- Status correto baseado em created_at
    CASE 
        WHEN e.is_premium = true THEN 'active'
        WHEN (e.created_at + INTERVAL '7 days') < NOW() THEN 'expired'
        ELSE 'trial'
    END as status_correto_baseado_em_created_at
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    (e.is_premium IS NULL OR e.is_premium = false)  -- Não é premium
    AND (e.created_at + INTERVAL '7 days') < NOW()  -- Mais de 7 dias desde criação
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas ainda está como trial
ORDER BY e.created_at ASC;

-- RESUMO
SELECT 
    '📊 RESUMO: Usuários que deveriam estar expirados' as info,
    COUNT(*) as total_com_trial_expirado_baseado_em_created_at,
    MIN(e.created_at) as conta_mais_antiga,
    MAX(e.created_at) as conta_mais_recente,
    ROUND(AVG(EXTRACT(DAYS FROM (NOW() - (e.created_at + INTERVAL '7 days'))))::numeric, 2) as media_dias_expirado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    (e.is_premium IS NULL OR e.is_premium = false)
    AND (e.created_at + INTERVAL '7 days') < NOW()
    AND (e.status = 'trial' OR e.status IS NULL);

-- Verificar também se há trial_end_date que não corresponde ao created_at + 7 dias
SELECT 
    '⚠️ PROBLEMA: trial_end_date não corresponde a created_at + 7 dias' as tipo,
    u.email,
    e.nome as empresa_nome,
    e.created_at,
    e.trial_end_date,
    (e.created_at + INTERVAL '7 days') as deveria_ser,
    EXTRACT(DAYS FROM (e.trial_end_date - (e.created_at + INTERVAL '7 days'))) as diferenca_dias,
    e.status,
    e.is_premium
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    (e.is_premium IS NULL OR e.is_premium = false)
    AND e.trial_end_date IS NOT NULL
    AND e.created_at IS NOT NULL
    AND ABS(EXTRACT(DAYS FROM (e.trial_end_date - (e.created_at + INTERVAL '7 days')))) > 1  -- Mais de 1 dia de diferença
ORDER BY ABS(EXTRACT(DAYS FROM (e.trial_end_date - (e.created_at + INTERVAL '7 days')))) DESC;

