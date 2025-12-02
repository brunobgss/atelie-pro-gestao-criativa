-- 🗑️ EXCLUIR EMPRESAS ESPECÍFICAS (IDs fornecidos)
-- ⚠️ ATENÇÃO: Este script exclui as empresas especificadas

-- ==========================================
-- ANTES DE EXCLUIR: Verificar o que será excluído
-- ==========================================

-- Listar todas as empresas que serão excluídas e seus dados
SELECT 
    '🔍 VERIFICAÇÃO ANTES DE EXCLUIR' as tipo,
    e.id,
    e.nome,
    e.email,
    e.is_premium,
    e.status,
    CASE WHEN e.is_premium = true THEN '⚠️ PREMIUM - CUIDADO!' ELSE 'OK' END as alerta,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_orcamentos,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_dados_que_serao_excluidos
FROM public.empresas e
WHERE e.id IN (
    '22e7f320-da07-477c-a0f8-f3c178708c33',  -- ATELIE DO BRUNO BORGES (PREMIUM!)
    '41c29a6e-a897-479d-8865-e66b599fe219',  -- jalecos e cia
    '6dcece50-9535-4dd4-bfe1-848654417629',  -- Ateliê Borges
    '9c6ed20a-107a-4adf-9e53-0ced232040cd',  -- ATELIE DA KAKA
    'd907aa08-9bb0-428e-8ed8-a382132f55f0',  -- JALECOS E CIA
    'e7c9c821-dd13-469d-b0cb-8afd5cd50557',  -- Ateliê do Borges
    'f8c74450-ef8a-489a-bb83-57746dbb0374',  -- ATELIE DO BRUNO
    'fcf96bf0-fc72-4101-b011-4bec854a0f9d'   -- ATELIE DO BRUNAO (PREMIUM!)
)
ORDER BY e.is_premium DESC, e.nome;

-- ==========================================
-- RESUMO: Quantos dados serão excluídos
-- ==========================================
SELECT 
    '📊 RESUMO DO QUE SERÁ EXCLUÍDO' as tipo,
    COUNT(DISTINCT e.id) as empresas_que_serao_excluidas,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as PREMIUM_que_serao_excluidas,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id IN (
        '22e7f320-da07-477c-a0f8-f3c178708c33',
        '41c29a6e-a897-479d-8865-e66b599fe219',
        '6dcece50-9535-4dd4-bfe1-848654417629',
        '9c6ed20a-107a-4adf-9e53-0ced232040cd',
        'd907aa08-9bb0-428e-8ed8-a382132f55f0',
        'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
        'f8c74450-ef8a-489a-bb83-57746dbb0374',
        'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
    )) as clientes_que_serao_excluidos,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id IN (
        '22e7f320-da07-477c-a0f8-f3c178708c33',
        '41c29a6e-a897-479d-8865-e66b599fe219',
        '6dcece50-9535-4dd4-bfe1-848654417629',
        '9c6ed20a-107a-4adf-9e53-0ced232040cd',
        'd907aa08-9bb0-428e-8ed8-a382132f55f0',
        'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
        'f8c74450-ef8a-489a-bb83-57746dbb0374',
        'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
    )) as pedidos_que_serao_excluidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id IN (
        '22e7f320-da07-477c-a0f8-f3c178708c33',
        '41c29a6e-a897-479d-8865-e66b599fe219',
        '6dcece50-9535-4dd4-bfe1-848654417629',
        '9c6ed20a-107a-4adf-9e53-0ced232040cd',
        'd907aa08-9bb0-428e-8ed8-a382132f55f0',
        'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
        'f8c74450-ef8a-489a-bb83-57746dbb0374',
        'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
    )) as orcamentos_que_serao_excluidos
FROM public.empresas e
WHERE e.id IN (
    '22e7f320-da07-477c-a0f8-f3c178708c33',
    '41c29a6e-a897-479d-8865-e66b599fe219',
    '6dcece50-9535-4dd4-bfe1-848654417629',
    '9c6ed20a-107a-4adf-9e53-0ced232040cd',
    'd907aa08-9bb0-428e-8ed8-a382132f55f0',
    'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
    'f8c74450-ef8a-489a-bb83-57746dbb0374',
    'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
);

-- ==========================================
-- ⚠️ ALERTA: PREMIUM USERS QUE SERÃO EXCLUÍDOS
-- ==========================================
SELECT 
    '⚠️ ALERTA: PREMIUM USERS QUE SERÃO EXCLUÍDOS' as tipo,
    e.id,
    e.nome,
    e.email,
    e.is_premium,
    e.status,
    e.trial_end_date as plano_expira_em,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes_plano,
    '⚠️ ATENÇÃO: Este é um usuário PREMIUM!' as alerta
FROM public.empresas e
WHERE e.id IN (
    '22e7f320-da07-477c-a0f8-f3c178708c33',
    '41c29a6e-a897-479d-8865-e66b599fe219',
    '6dcece50-9535-4dd4-bfe1-848654417629',
    '9c6ed20a-107a-4adf-9e53-0ced232040cd',
    'd907aa08-9bb0-428e-8ed8-a382132f55f0',
    'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
    'f8c74450-ef8a-489a-bb83-57746dbb0374',
    'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
)
AND e.is_premium = true;

-- ==========================================
-- EXCLUIR EMPRESAS (DESCOMENTE QUANDO TIVER CERTEZA)
-- ==========================================
-- ⚠️ IMPORTANTE: 
-- 1. Execute primeiro as queries de verificação acima
-- 2. Revise bem o que será excluído
-- 3. ATENÇÃO: 2 empresas são PREMIUM - confirme que quer excluir mesmo assim
-- 4. Descomente a query abaixo quando tiver certeza

/*
-- Excluir empresas específicas (cascata vai excluir tudo relacionado)
DELETE FROM public.empresas
WHERE id IN (
    '22e7f320-da07-477c-a0f8-f3c178708c33',  -- ATELIE DO BRUNO BORGES (PREMIUM!)
    '41c29a6e-a897-479d-8865-e66b599fe219',  -- jalecos e cia
    '6dcece50-9535-4dd4-bfe1-848654417629',  -- Ateliê Borges
    '9c6ed20a-107a-4adf-9e53-0ced232040cd',  -- ATELIE DA KAKA
    'd907aa08-9bb0-428e-8ed8-a382132f55f0',  -- JALECOS E CIA
    'e7c9c821-dd13-469d-b0cb-8afd5cd50557',  -- Ateliê do Borges
    'f8c74450-ef8a-489a-bb83-57746dbb0374',  -- ATELIE DO BRUNO
    'fcf96bf0-fc72-4101-b011-4bec854a0f9d'   -- ATELIE DO BRUNAO (PREMIUM!)
);
*/

-- ==========================================
-- VERIFICAÇÃO APÓS EXCLUSÃO (execute depois de excluir)
-- ==========================================
SELECT 
    '✅ VERIFICAÇÃO APÓS EXCLUSÃO' as tipo,
    COUNT(DISTINCT u.id) as total_usuarios_restantes,
    COUNT(DISTINCT e.id) as total_empresas_restantes,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium_restantes,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos_restantes
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id;









