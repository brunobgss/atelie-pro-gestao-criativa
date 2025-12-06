-- =====================================================
-- VERIFICAÇÃO: Trigger de Status está Funcionando?
-- =====================================================
-- Este script verifica se o trigger está habilitado e funcionando

-- 1. VERIFICAR SE O TRIGGER EXISTE E ESTÁ HABILITADO
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    CASE 
        WHEN tgisinternal = false THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as status_trigger
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND trigger_name = 'sync_empresa_status_trigger';

-- 2. VERIFICAR STATUS DE TODOS OS USUÁRIOS (exceto o que foi resetado)
-- Deve mostrar que trials expirados estão como 'expired'
SELECT 
    '📊 RESUMO GERAL' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND status = 'expired' 
          THEN 1 END) as trial_expirado_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') >= NOW() 
               AND status = 'trial' 
          THEN 1 END) as trial_ativo_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') < NOW() 
               AND (status = 'trial' OR status IS NULL) 
          THEN 1 END) as ⚠️_PROBLEMAS_trial_expirado_mas_status_errado,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND created_at IS NOT NULL 
               AND (created_at + INTERVAL '7 days') >= NOW() 
               AND status = 'expired' 
          THEN 1 END) as ⚠️_PROBLEMAS_trial_ativo_mas_status_errado
FROM public.empresas;

-- 3. LISTAR USUÁRIOS COM TRIAL EXPIRADO (devem estar bloqueados)
SELECT 
    e.id,
    e.nome,
    e.email,
    e.created_at,
    e.trial_end_date,
    e.status,
    e.is_premium,
    EXTRACT(DAYS FROM (NOW() - e.trial_end_date))::INTEGER as dias_expirado,
    CASE 
        WHEN e.status = 'expired' THEN '✅ CORRETO - Bloqueado'
        WHEN e.status = 'trial' THEN '❌ PROBLEMA - Deveria estar bloqueado!'
        ELSE '❓ Verificar'
    END as situacao
FROM public.empresas e
WHERE (e.is_premium IS NULL OR e.is_premium = false)
    AND e.created_at IS NOT NULL
    AND (e.created_at + INTERVAL '7 days') < NOW()
ORDER BY e.trial_end_date DESC
LIMIT 10;

-- 4. VERIFICAR O USUÁRIO RESETADO (estampariasuprema@gmail.com)
SELECT 
    '🎯 USUÁRIO RESETADO' as info,
    e.id,
    e.nome,
    e.email,
    e.created_at,
    e.trial_end_date,
    e.status,
    e.is_premium,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW()))::INTEGER as dias_restantes,
    CASE 
        WHEN e.status = 'trial' 
            AND e.trial_end_date > NOW() 
            AND EXTRACT(DAYS FROM (e.trial_end_date - NOW())) BETWEEN 0 AND 7
        THEN '✅ CORRETO - Trial resetado com sucesso'
        ELSE '❓ Verificar'
    END as situacao
FROM public.empresas e
WHERE e.email = 'estampariasuprema@gmail.com';

-- 5. TESTE: Tentar atualizar um usuário com trial expirado
-- Se o trigger estiver funcionando, ele deve manter o status como 'expired'
-- (Execute apenas para verificar, não faça commit)
-- UPDATE public.empresas 
-- SET status = 'trial'  -- Tentando mudar para trial
-- WHERE id = (SELECT id FROM public.empresas 
--             WHERE (is_premium IS NULL OR is_premium = false)
--                AND (created_at + INTERVAL '7 days') < NOW()
--                AND id != '73a38f8a-dbc4-45fc-9c91-fff86d979fa1'  -- Excluir o que foi resetado
--             LIMIT 1);
-- 
-- SELECT id, nome, status, 
--        CASE WHEN status = 'expired' THEN '✅ Trigger funcionou - manteve expired'
--             ELSE '❌ Trigger não funcionou - mudou para trial'
--        END as resultado
-- FROM public.empresas 
-- WHERE id = (SELECT id FROM public.empresas 
--             WHERE (is_premium IS NULL OR is_premium = false)
--                AND (created_at + INTERVAL '7 days') < NOW()
--                AND id != '73a38f8a-dbc4-45fc-9c91-fff86d979fa1'
--             LIMIT 1);


