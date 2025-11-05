-- 🔧 CORREÇÃO COMPLETA E SEGURA: Corrige ambos os problemas de status
-- ⚠️ SEGURANÇA: Este script NÃO afeta:
-- - Usuários premium (is_premium = true) - eles têm acesso garantido
--
-- ✅ CORREÇÕES:
-- 1. Trial EXPIRADO mas status = 'trial' → atualiza para 'expired'
-- 2. Trial ATIVO mas status = 'expired' → atualiza para 'trial'

-- ==========================================
-- ANTES DE EXECUTAR: Verificar quantos registros serão afetados
-- ==========================================

-- PROBLEMA 1: Trial expirado mas status = 'trial'
SELECT 
    '📊 PROBLEMA 1: Trial EXPIRADO mas status = "trial"' as info,
    COUNT(*) as total_que_sera_atualizado_para_expired
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- PROBLEMA 2: Trial ativo mas status = 'expired'
SELECT 
    '📊 PROBLEMA 2: Trial ATIVO mas status = "expired"' as info,
    COUNT(*) as total_que_sera_atualizado_para_trial
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date >= NOW()  -- Trial ainda ativo
    AND e.status = 'expired'  -- Mas status está como expired
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- ==========================================
-- LISTAR OS REGISTROS QUE SERÃO ATUALIZADOS (para revisão)
-- ==========================================

-- Lista PROBLEMA 1
SELECT 
    '⚠️ PROBLEMA 1: Será atualizado para status = "expired"' as tipo,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date)) as dias_expirado
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- E não é premium
ORDER BY e.trial_end_date ASC;

-- Lista PROBLEMA 2
SELECT 
    '⚠️ PROBLEMA 2: Será atualizado para status = "trial"' as tipo,
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date >= NOW()  -- Trial ainda ativo
    AND e.status = 'expired'  -- Mas status está como expired
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- E não é premium
ORDER BY e.trial_end_date ASC;

-- ==========================================
-- VERIFICAÇÕES DE SEGURANÇA
-- ==========================================

-- Confirmar que premium users NÃO serão afetados
SELECT 
    '✅ VERIFICAÇÃO: Premium users NÃO serão afetados' as verificacao,
    COUNT(*) as total_premium_users,
    COUNT(CASE WHEN (e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL))
                OR (e.trial_end_date IS NOT NULL AND e.trial_end_date >= NOW() AND e.status = 'expired')
           THEN 1 END) as premium_que_seria_afetado
FROM public.empresas e
WHERE e.is_premium = true;
-- Resultado esperado: premium_que_seria_afetado deve ser 0 (zero)

-- ==========================================
-- EXECUTAR AS CORREÇÕES (descomente quando estiver pronto)
-- ==========================================

-- CORREÇÃO 1: Trial expirado → status = 'expired'
/*
UPDATE public.empresas
SET 
    status = 'expired',
    updated_at = NOW()
WHERE 
    trial_end_date IS NOT NULL 
    AND trial_end_date < NOW()  -- Trial expirado
    AND (status = 'trial' OR status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (is_premium IS NULL OR is_premium = false);  -- E não é premium
*/

-- CORREÇÃO 2: Trial ativo → status = 'trial'
/*
UPDATE public.empresas
SET 
    status = 'trial',
    updated_at = NOW()
WHERE 
    trial_end_date IS NOT NULL 
    AND trial_end_date >= NOW()  -- Trial ainda ativo
    AND status = 'expired'  -- Mas status está como expired
    AND (is_premium IS NULL OR is_premium = false);  -- E não é premium
*/

-- ==========================================
-- APÓS A CORREÇÃO: Verificar se as atualizações foram aplicadas
-- ==========================================

-- Verificação PROBLEMA 1
SELECT 
    '📊 VERIFICAÇÃO PROBLEMA 1' as info,
    COUNT(*) as total_com_trial_expirado,
    COUNT(CASE WHEN status = 'expired' AND trial_end_date < NOW() THEN 1 END) as corretamente_marcados_como_expired,
    COUNT(CASE WHEN (status = 'trial' OR status IS NULL) AND trial_end_date < NOW() THEN 1 END) as ainda_precisa_correcao
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- Verificação PROBLEMA 2
SELECT 
    '📊 VERIFICAÇÃO PROBLEMA 2' as info,
    COUNT(*) as total_com_trial_ativo,
    COUNT(CASE WHEN status = 'trial' AND trial_end_date >= NOW() THEN 1 END) as corretamente_marcados_como_trial,
    COUNT(CASE WHEN status = 'expired' AND trial_end_date >= NOW() THEN 1 END) as ainda_precisa_correcao
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date >= NOW()  -- Trial ativo
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- ==========================================
-- VERIFICAÇÃO FINAL: Listar alguns exemplos após correção
-- ==========================================
SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    CASE 
        WHEN e.is_premium = true THEN '💎 Premium (correto)'
        WHEN e.trial_end_date >= NOW() AND e.status = 'trial' THEN '✅ Trial ativo (correto)'
        WHEN e.trial_end_date < NOW() AND e.status = 'expired' THEN '✅ Trial expirado (correto)'
        WHEN e.trial_end_date >= NOW() AND e.status = 'expired' THEN '⚠️ Ainda precisa correção (Problema 2)'
        WHEN e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN '⚠️ Ainda precisa correção (Problema 1)'
        ELSE '❓ Situação desconhecida'
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL
ORDER BY 
    CASE WHEN e.is_premium = true THEN 1 ELSE 2 END,
    e.trial_end_date DESC
LIMIT 30;

