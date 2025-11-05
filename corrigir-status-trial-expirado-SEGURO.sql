-- 🔧 CORREÇÃO SEGURA: Atualizar status para 'expired' apenas para usuários com trial realmente expirado
-- ⚠️ SEGURANÇA: Este script NÃO afeta:
-- - Usuários premium (is_premium = true) - eles têm acesso garantido
-- - Usuários com trial ainda ativo (trial_end_date >= NOW()) - eles têm direito ao trial
--
-- ✅ APENAS atualiza usuários que:
-- 1. trial_end_date < NOW() (trial expirado)
-- 2. status = 'trial' ou NULL (mas deveria ser 'expired')
-- 3. is_premium = false ou NULL (não são premium)

-- ANTES DE EXECUTAR: Verificar quantos registros serão afetados
SELECT 
    '📊 RESUMO ANTES DA CORREÇÃO' as info,
    COUNT(*) as total_que_sera_atualizado,
    COUNT(DISTINCT e.id) as total_empresas_que_sera_atualizado
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- LISTAR OS REGISTROS QUE SERÃO ATUALIZADOS (para revisão)
SELECT 
    u.email,
    e.id as empresa_id,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date)) as dias_expirado,
    'Será atualizado para status = "expired"' as acao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.status = 'trial' OR e.status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (e.is_premium IS NULL OR e.is_premium = false)  -- E não é premium
ORDER BY e.trial_end_date ASC;

-- VERIFICAÇÃO DE SEGURANÇA: Confirmar que premium users NÃO serão afetados
SELECT 
    '✅ VERIFICAÇÃO: Premium users NÃO serão afetados' as verificacao,
    COUNT(*) as total_premium_users,
    COUNT(CASE WHEN e.trial_end_date IS NOT NULL AND e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN 1 END) as premium_com_status_trial_expirado
FROM public.empresas e
WHERE e.is_premium = true;
-- Resultado esperado: premium_com_status_trial_expirado deve ser 0 (zero)

-- VERIFICAÇÃO DE SEGURANÇA: Confirmar que trials ativos NÃO serão afetados
SELECT 
    '✅ VERIFICAÇÃO: Trials ativos NÃO serão afetados' as verificacao,
    COUNT(*) as total_trials_ativos,
    COUNT(CASE WHEN e.status = 'trial' OR e.status IS NULL THEN 1 END) as trials_ativos_com_status_trial
FROM public.empresas e
WHERE (e.is_premium IS NULL OR e.is_premium = false)
    AND e.trial_end_date IS NOT NULL
    AND e.trial_end_date >= NOW();
-- Resultado esperado: todos os trials ativos devem ter status 'trial' (isso está correto)

-- ==========================================
-- EXECUTAR A CORREÇÃO (descomente quando estiver pronto)
-- ==========================================
/*
UPDATE public.empresas
SET 
    status = 'expired',
    updated_at = NOW()
WHERE 
    trial_end_date IS NOT NULL 
    AND trial_end_date < NOW()  -- Trial expirado
    AND (status = 'trial' OR status IS NULL)  -- Mas status ainda é trial ou NULL
    AND (is_premium IS NULL OR is_premium = false);  -- E não é premium (premium não é afetado)
*/

-- APÓS A CORREÇÃO: Verificar se a atualização foi aplicada corretamente
SELECT 
    '📊 RESUMO APÓS A CORREÇÃO' as info,
    COUNT(*) as total_com_trial_expirado_e_status_expired,
    COUNT(CASE WHEN status = 'expired' AND trial_end_date < NOW() THEN 1 END) as corretamente_marcados_como_expired
FROM public.empresas e
WHERE e.trial_end_date IS NOT NULL 
    AND e.trial_end_date < NOW()  -- Trial expirado
    AND (e.is_premium IS NULL OR e.is_premium = false);  -- E não é premium

-- VERIFICAÇÃO FINAL: Listar alguns exemplos após correção
SELECT 
    u.email,
    e.nome as empresa_nome,
    e.trial_end_date,
    e.status as status_atual,
    e.is_premium,
    CASE 
        WHEN e.is_premium = true THEN '💎 Premium (correto)'
        WHEN e.trial_end_date >= NOW() AND e.status = 'trial' THEN '✅ Trial ativo (correto)'
        WHEN e.trial_end_date < NOW() AND e.status = 'expired' THEN '✅ Trial expirado e marcado como expired (correto)'
        WHEN e.trial_end_date < NOW() AND (e.status = 'trial' OR e.status IS NULL) THEN '⚠️ Ainda precisa correção'
        ELSE '❓ Situação desconhecida'
    END as situacao
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.trial_end_date IS NOT NULL
ORDER BY 
    CASE WHEN e.is_premium = true THEN 1 ELSE 2 END,
    e.trial_end_date DESC
LIMIT 20;

