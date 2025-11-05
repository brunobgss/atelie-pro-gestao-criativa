-- 🔍 VERIFICAÇÃO: Usuários com trial expirado mas status ainda como 'trial'
-- Este script APENAS VERIFICA, não altera nada
-- Execute no Supabase SQL Editor

-- 1. Verificar estrutura das colunas relacionadas a trial
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'empresas'
    AND column_name IN ('trial_end_date', 'status', 'is_premium', 'trial_ends_at')
ORDER BY column_name;

-- 2. LISTA COMPLETA: Todos os usuários com trial_end_date expirado mas status ainda como 'trial'
SELECT 
    u.id as user_id,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status,
    e.is_premium,
    e.created_at as empresa_criada_em,
    CASE 
        WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
        WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
        ELSE 'ATIVO'
    END as status_real_trial,
    CASE 
        WHEN e.trial_end_date IS NOT NULL 
        THEN EXTRACT(DAYS FROM (NOW() - e.trial_end_date))
        ELSE NULL
    END as dias_expirado,
    CASE 
        WHEN e.status = 'trial' AND e.trial_end_date < NOW() THEN '⚠️ INCONSISTÊNCIA'
        WHEN e.status = 'expired' AND e.trial_end_date < NOW() THEN '✅ CORRETO'
        WHEN e.status = 'trial' AND e.trial_end_date >= NOW() THEN '✅ CORRETO'
        ELSE '❓ OUTRO'
    END as situacao
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND e.status = 'trial'  -- Mas status ainda como trial
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- Não é premium
ORDER BY e.trial_end_date ASC;

-- 3. RESUMO ESTATÍSTICO: Quantos usuários estão nessa situação
SELECT 
    COUNT(*) as total_usuarios_com_trial_expirado_mal_marcado,
    COUNT(DISTINCT e.id) as total_empresas_com_trial_expirado_mal_marcado,
    MIN(e.trial_end_date) as trial_mais_antigo_expirado,
    MAX(e.trial_end_date) as trial_mais_recente_expirado,
    AVG(EXTRACT(DAYS FROM (NOW() - e.trial_end_date))) as media_dias_expirado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND e.status = 'trial'  -- Mas status ainda como trial
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- Não é premium

-- 4. DISTRIBUIÇÃO POR STATUS: Ver todos os status possíveis
SELECT 
    e.status,
    COUNT(*) as quantidade,
    COUNT(CASE WHEN e.trial_end_date < NOW() THEN 1 END) as com_trial_expirado,
    COUNT(CASE WHEN e.trial_end_date >= NOW() OR e.trial_end_date IS NULL THEN 1 END) as com_trial_ativo_ou_sem_trial
FROM public.empresas e
GROUP BY e.status
ORDER BY quantidade DESC;

-- 5. DETALHAMENTO: Usuários com trial expirado independente do status
SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date)) as dias_expirado,
    CASE 
        WHEN e.status = 'trial' THEN '⚠️ PROBLEMA: Expirou mas status ainda é trial'
        WHEN e.status = 'expired' THEN '✅ CORRETO: Expirou e status está como expired'
        ELSE CONCAT('❓ STATUS: ', COALESCE(e.status, 'NULL'))
    END as observacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()
ORDER BY e.trial_end_date ASC;

