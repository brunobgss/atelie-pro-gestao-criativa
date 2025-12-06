-- =====================================================
-- IDENTIFICAR USUÁRIOS PREMIUM QUE ASSINARAM 1 MÊS E NÃO RENOVARAM
-- =====================================================

-- 1. Usuários que eram premium, assinaram ~1 mês e agora não são mais premium
SELECT 
    e.id,
    e.nome,
    e.email,
    e.telefone,
    e.created_at as data_cadastro,
    e.trial_end_date as data_expiracao_premium,
    e.is_premium as premium_atual,
    e.status as status_atual,
    EXTRACT(DAYS FROM (e.trial_end_date - e.created_at))::INTEGER as dias_entre_cadastro_e_expiracao,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date))::INTEGER as dias_desde_expiracao,
    CASE 
        WHEN e.is_premium = false AND e.status = 'expired' THEN '❌ Premium expirado - não renovou'
        WHEN e.is_premium = false AND e.status = 'active' THEN '⚠️ Premium false mas status active'
        WHEN e.is_premium = true THEN '✅ Ainda é premium'
        ELSE '❓ Verificar'
    END as situacao
FROM public.empresas e
WHERE 
    -- Tinha trial_end_date (assumindo que premium users têm trial_end_date como data de expiração do plano)
    e.trial_end_date IS NOT NULL
    -- Assinou aproximadamente 1 mês (entre 25 e 35 dias)
    AND EXTRACT(DAYS FROM (e.trial_end_date - e.created_at)) BETWEEN 25 AND 35
    -- E agora não é mais premium OU o plano expirou
    AND (
        (e.is_premium = false OR e.is_premium IS NULL)
        OR (e.trial_end_date < NOW() AND e.status = 'expired')
    )
    -- E o plano já expirou (não está ativo)
    AND e.trial_end_date < NOW()
ORDER BY e.trial_end_date DESC;

-- 2. RESUMO: Quantos usuários se encaixam nesse perfil
SELECT 
    '📊 RESUMO: Premium 1 mês não renovaram' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN is_premium = false THEN 1 END) as nao_sao_mais_premium,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as status_expirado,
    COUNT(CASE WHEN is_premium = false AND status = 'expired' THEN 1 END) as premium_expirado_confirmado,
    AVG(EXTRACT(DAYS FROM (trial_end_date - created_at)))::INTEGER as media_dias_assinatura,
    AVG(EXTRACT(DAYS FROM (NOW() - trial_end_date)))::INTEGER as media_dias_desde_expiracao
FROM public.empresas e
WHERE 
    e.trial_end_date IS NOT NULL
    AND EXTRACT(DAYS FROM (e.trial_end_date - e.created_at)) BETWEEN 25 AND 35
    AND (
        (e.is_premium = false OR e.is_premium IS NULL)
        OR (e.trial_end_date < NOW() AND e.status = 'expired')
    )
    AND e.trial_end_date < NOW();

-- 3. ALTERNATIVA: Buscar por histórico de pagamentos (se houver tabela de transações)
-- Esta query verifica usuários que podem ter sido premium baseado em outras evidências
SELECT 
    e.id,
    e.nome,
    e.email,
    e.created_at,
    e.trial_end_date,
    e.is_premium,
    e.status,
    EXTRACT(DAYS FROM (e.trial_end_date - e.created_at))::INTEGER as dias_assinatura,
    CASE 
        -- Se trial_end_date está muito além de created_at + 7 dias, provavelmente foi premium
        WHEN EXTRACT(DAYS FROM (e.trial_end_date - e.created_at)) > 10 
            AND e.is_premium = false 
            AND e.trial_end_date < NOW()
        THEN 'Provavelmente era premium e não renovou'
        ELSE 'Verificar'
    END as analise
FROM public.empresas e
WHERE 
    e.trial_end_date IS NOT NULL
    AND e.created_at IS NOT NULL
    -- trial_end_date está muito além do trial gratuito (mais de 10 dias)
    AND EXTRACT(DAYS FROM (e.trial_end_date - e.created_at)) > 10
    -- Mas agora não é premium
    AND (e.is_premium = false OR e.is_premium IS NULL)
    -- E expirou
    AND e.trial_end_date < NOW()
    -- E está entre 25 e 35 dias (aproximadamente 1 mês)
    AND EXTRACT(DAYS FROM (e.trial_end_date - e.created_at)) BETWEEN 25 AND 35
ORDER BY e.trial_end_date DESC;


