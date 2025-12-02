-- 📊 ANÁLISE COMPLETA - TUDO EM UM SCRIPT
-- Execute este script UMA VEZ e receba todas as análises

-- ==========================================
-- LISTA DE USUÁRIOS DE TESTE (para excluir das análises)
-- ==========================================
WITH usuarios_teste AS (
    SELECT DISTINCT e.id as empresa_id
    FROM public.empresas e
    JOIN public.user_empresas ue ON e.id = ue.empresa_id
    JOIN auth.users u ON ue.user_id = u.id
    WHERE 
        u.email IN (
            'brunobgs1888@gmail.com',
            'brunobgstp01@gmail.com',
            'brunopix29@gmail.com',
            'bgsoftwares1@gmail.com',
            'ateliepro751@gmail.com',
            'brunobgs2004@gmail.com',
            'brunobgstp@gmail.com'
        )
        OR LOWER(e.nome) LIKE '%bruno%'
        OR LOWER(e.nome) LIKE '%teste%'
        OR LOWER(e.nome) LIKE '%test%'
        OR e.id IN (
            '22e7f320-da07-477c-a0f8-f3c178708c33',
            '41c29a6e-a897-479d-8865-e66b599fe219',
            '6dcece50-9535-4dd4-bfe1-848654417629',
            '9c6ed20a-107a-4adf-9e53-0ced232040cd',
            'd907aa08-9bb0-428e-8ed8-a382132f55f0',
            'e7c9c821-dd13-469d-b0cb-8afd5cd50557',
            'f8c74450-ef8a-489a-bb83-57746dbb0374',
            'fcf96bf0-fc72-4101-b011-4bec854a0f9d'
        )
)

-- ==========================================
-- 1. RESUMO EXECUTIVO COMPLETO (SEM TESTES)
-- ==========================================
SELECT 
    1 as ordem,
    '📊 RESUMO EXECUTIVO (USUÁRIOS REAIS)' as categoria,
    COUNT(DISTINCT u.id) as total_usuarios_reais,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium_reais,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as trial_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos_reais,
    COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_inativos_reais,
    (SELECT COUNT(*) FROM public.customers c 
     WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = c.empresa_id)) as total_clientes_reais,
    (SELECT COUNT(*) FROM public.atelie_orders o 
     WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = o.empresa_id)) as total_pedidos_reais,
    (SELECT COUNT(*) FROM public.atelie_quotes q 
     WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = q.empresa_id)) as total_orcamentos_reais,
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_conversao_percentual,
    ROUND(
        COUNT(DISTINCT CASE WHEN EXISTS (
            SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
        ) OR EXISTS (
            SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
        ) THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_engajamento_percentual,
    NULL::text as detalhes
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = e.id)

UNION ALL

-- ==========================================
-- 2. DISTRIBUIÇÃO POR STATUS (SEM TESTES)
-- ==========================================
SELECT 
    2 as ordem,
    '📈 DISTRIBUIÇÃO POR STATUS' as categoria,
    NULL::bigint as total_usuarios_reais,
    NULL::bigint as premium_reais,
    NULL::bigint as trial_reais,
    NULL::bigint as usuarios_ativos_reais,
    NULL::bigint as usuarios_inativos_reais,
    NULL::bigint as total_clientes_reais,
    NULL::bigint as total_pedidos_reais,
    NULL::bigint as total_orcamentos_reais,
    COUNT(DISTINCT e.id)::numeric as taxa_conversao_percentual,
    ROUND(COUNT(DISTINCT e.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.empresas WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = empresas.id)), 0), 2) as taxa_engajamento_percentual,
    COALESCE(e.status, 'sem_status') as detalhes
FROM public.empresas e
WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = e.id)
GROUP BY e.status

UNION ALL

-- ==========================================
-- 3. ENGAGAMENTO DETALHADO (SEM TESTES)
-- ==========================================
SELECT 
    3 as ordem,
    '🎯 ENGAGAMENTO DETALHADO' as categoria,
    COUNT(DISTINCT e.id) as total_usuarios_reais,
    NULL::bigint as premium_reais,
    NULL::bigint as trial_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_inativos_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as total_clientes_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as total_pedidos_reais,
    COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as total_orcamentos_reais,
    NULL::numeric as taxa_conversao_percentual,
    NULL::numeric as taxa_engajamento_percentual,
    'empresas_com_dados' as detalhes
FROM public.empresas e
WHERE NOT EXISTS (SELECT 1 FROM usuarios_teste WHERE empresa_id = e.id)

ORDER BY ordem;









