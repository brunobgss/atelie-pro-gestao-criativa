-- 🔍 VERIFICAÇÃO COMPLETA: Todos os problemas de inconsistência de status
-- Este script identifica:
-- 1. Usuários com trial EXPIRADO mas status ainda como 'trial' (precisa corrigir para 'expired')
-- 2. Usuários com trial ATIVO mas status como 'expired' (precisa corrigir para 'trial')
-- 3. Usuários premium (não são afetados)
-- 4. Usuários com trial ativo e status correto (não são afetados)

-- ==========================================
-- PROBLEMA 1: Trial EXPIRADO mas status = 'trial' ou NULL
-- ==========================================
SELECT 
    '⚠️ PROBLEMA 1: Trial EXPIRADO mas status ainda é "trial"' as tipo_problema,
    u.id as user_id,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date)) as dias_expirado,
    'Precisa atualizar status para "expired"' as acao_necessaria
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- E não é premium
ORDER BY e.trial_end_date ASC;

-- RESUMO PROBLEMA 1
SELECT 
    '📊 RESUMO PROBLEMA 1' as resumo,
    COUNT(*) as total_usuarios_trial_expirado_mal_marcado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- ==========================================
-- PROBLEMA 2: Trial ATIVO mas status = 'expired' (problema inverso)
-- ==========================================
SELECT 
    '⚠️ PROBLEMA 2: Trial ATIVO mas status é "expired"' as tipo_problema,
    u.id as user_id,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes,
    'Precisa atualizar status para "trial"' as acao_necessaria
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date >= NOW()  -- Trial ainda ativo
    AND e.status = 'expired'  -- Mas status está como expired
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- E não é premium
ORDER BY e.trial_end_date ASC;

-- RESUMO PROBLEMA 2
SELECT 
    '📊 RESUMO PROBLEMA 2' as resumo,
    COUNT(*) as total_usuarios_trial_ativo_mal_marcado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date >= NOW()  -- Trial ainda ativo
    AND e.status = 'expired'  -- Mas status está como expired
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- ==========================================
-- VERIFICAÇÃO DE SEGURANÇA: Premium users (NÃO serão afetados)
-- ==========================================
SELECT 
    '💎 PREMIUM USERS (NÃO SERÃO AFETADOS)' as tipo,
    COUNT(*) as total_premium_users
FROM public.empresas e
WHERE e.is_premium = true;

-- ==========================================
-- VERIFICAÇÃO DE SEGURANÇA: Trials ativos corretos (NÃO serão afetados)
-- ==========================================
SELECT 
    '✅ TRIAL ATIVO CORRETO (NÃO SERÁ AFETADO)' as tipo,
    COUNT(*) as total_trials_ativos_corretos
FROM public.empresas e
WHERE (e.is_premium IS NULL OR e.is_premium = false)
    AND e.trial_end_date IS NOT NULL
    AND e.trial_end_date >= NOW()  -- Trial ativo
    AND (e.status = 'trial' OR e.status IS NULL);  -- Status correto

-- ==========================================
-- VISÃO GERAL: Distribuição de status
-- ==========================================
SELECT 
    COALESCE(e.status, 'NULL') as status_na_tabela,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN e.is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date >= NOW() 
               AND (e.is_premium IS NULL OR e.is_premium = false) 
          THEN 1 END) as trial_ativo_nao_premium,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL 
               AND e.trial_end_date < NOW() 
               AND (e.is_premium IS NULL OR e.is_premium = false) 
          THEN 1 END) as trial_expirado_nao_premium,
    COUNT(CASE WHEN e.trial_end_date IS NULL THEN 1 END) as sem_trial_end_date
FROM public.empresas e
GROUP BY e.status
ORDER BY total_empresas DESC;

-- ==========================================
-- CASOS ESPECIAIS: Outros status (cancelled, overdue, etc)
-- ==========================================
SELECT 
    '❓ OUTROS STATUS' as tipo,
    COALESCE(e.status, 'NULL') as status_atual,
    COUNT(*) as quantidade,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date >= NOW() THEN 1 END) as com_trial_ativo,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() THEN 1 END) as com_trial_expirado,
    COUNT(CASE WHEN e.is_premium = true THEN 1 END) as premium
FROM public.empresas e
WHERE e.status NOT IN ('trial', 'expired') OR e.status IS NULL
GROUP BY e.status
ORDER BY quantidade DESC;









