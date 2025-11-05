-- 🔍 VERIFICAÇÃO ESPECÍFICA: Usuários com trial_end_date expirado mas status ainda como 'trial'
-- Este script verifica especificamente a coluna 'status' da tabela empresas
-- Execute no Supabase SQL Editor

-- IMPORTANTE: Verificar se a coluna 'status' existe na tabela empresas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'empresas'
    AND column_name = 'status';

-- VERIFICAÇÃO PRINCIPAL: Usuários com trial expirado mas status ainda como 'trial'
-- ⚠️ IMPORTANTE: Esta query identifica APENAS usuários que realmente precisam correção:
-- 1. trial_end_date < NOW() (trial expirado)
-- 2. status = 'trial' ou NULL (mas deveria ser 'expired')
-- 3. is_premium = false ou NULL (não são premium - se fossem premium, o trial não importaria)
-- 
-- ❌ NÃO INCLUI:
-- - Usuários premium (is_premium = true) - eles têm acesso garantido
-- - Usuários com trial ainda ativo (trial_end_date >= NOW()) - eles têm direito ao trial

SELECT 
    u.id as user_id,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual_na_tabela,
    e.is_premium,
    e.created_at,
    -- Verificação real se o trial expirou
    CASE 
        WHEN e.is_premium = true THEN 'PREMIUM (ignorar trial)'
        WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        ELSE 'ATIVO'
    END as status_real_calculado,
    -- Dias desde que expirou (se expirou)
    CASE 
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN EXTRACT(DAYS FROM (NOW() - e.trial_end_date))
        ELSE NULL
    END as dias_expirado,
    -- Flag de inconsistência
    CASE 
        WHEN e.is_premium = true
        THEN '💎 PREMIUM: Usuário premium (ignorar trial - está correto)'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND (e.status = 'trial' OR e.status IS NULL) 
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN '⚠️ INCONSISTÊNCIA: Trial expirado mas status ainda é "trial" - PRECISA CORREÇÃO'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date < NOW() 
            AND e.status = 'expired'
            AND (e.is_premium IS NULL OR e.is_premium = false)
        THEN '✅ CORRETO: Trial expirado e status é "expired"'
        WHEN e.trial_end_date IS NOT NULL 
            AND e.trial_end_date >= NOW() 
            AND (e.status = 'trial' OR e.status IS NULL)
        THEN '✅ CORRETO: Trial ativo e status é "trial" (tem direito ao trial)'
        ELSE CONCAT('❓ OUTRO: status="', COALESCE(e.status, 'NULL'), '", trial_end_date=', COALESCE(e.trial_end_date::text, 'NULL'))
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    -- Apenas casos onde trial expirou
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()
    -- Mas status ainda é trial ou NULL (deveria ser expired)
    AND (e.status = 'trial' OR e.status IS NULL)
    -- E NÃO é premium (premium users não dependem do trial)
    AND (e.is_premium IS NULL OR e.is_premium = false)
ORDER BY e.trial_end_date ASC;  -- Ordenar pelos mais antigos primeiro

-- RESUMO: Quantos usuários estão nessa situação (APENAS os que precisam correção)
-- ⚠️ Exclui premium users e trials ativos
SELECT 
    COUNT(*) as total_usuarios_com_trial_expirado_mal_marcado,
    COUNT(DISTINCT e.id) as total_empresas_com_trial_expirado_mal_marcado,
    MIN(e.trial_end_date) as trial_mais_antigo_expirado,
    MAX(e.trial_end_date) as trial_mais_recente_expirado,
    ROUND(AVG(EXTRACT(DAYS FROM (NOW() - e.trial_end_date)))::numeric, 2) as media_dias_expirado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium (premium não precisa correção)

-- VISÃO GERAL: Todos os status possíveis na tabela
SELECT 
    COALESCE(e.status, 'NULL') as status_na_tabela,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN e.is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date >= NOW() AND (e.is_premium IS NULL OR e.is_premium = false) THEN 1 END) as trial_ativo_nao_premium,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() AND (e.is_premium IS NULL OR e.is_premium = false) THEN 1 END) as trial_expirado_nao_premium,
    COUNT(CASE WHEN e.trial_end_date IS NULL THEN 1 END) as sem_trial_end_date
FROM public.empresas e
GROUP BY e.status
ORDER BY total_empresas DESC;

-- VERIFICAÇÃO DE SEGURANÇA: Listar todos os premium users para garantir que não serão afetados
SELECT 
    '💎 PREMIUM USERS (NÃO SERÃO AFETADOS)' as tipo,
    u.email,
    e.nome as empresa_nome,
    e.is_premium,
    e.status,
    e.trial_end_date,
    CASE 
        WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() THEN 'Trial expirado (mas é premium, então OK)'
        WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date >= NOW() THEN 'Trial ativo'
        ELSE 'Sem trial_end_date'
    END as observacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.is_premium = true
ORDER BY e.created_at DESC;

-- VERIFICAÇÃO DE SEGURANÇA: Listar todos os trials ativos para garantir que não serão afetados
SELECT 
    '✅ TRIAL ATIVO (NÃO SERÁ AFETADO)' as tipo,
    u.email,
    e.nome as empresa_nome,
    e.is_premium,
    e.status,
    e.trial_end_date,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes,
    'Trial ainda não expirou - tem direito ao trial' as observacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE (e.is_premium IS NULL OR e.is_premium = false)
    AND e.trial_end_date IS NOT NULL
    AND e.trial_end_date >= NOW()
ORDER BY e.trial_end_date ASC;

