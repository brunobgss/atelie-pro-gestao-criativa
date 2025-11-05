-- 📊 ANÁLISE COMPLETA EXCLUINDO USUÁRIOS DE TESTE
-- Esta análise remove os usuários de teste para métricas mais precisas

-- ==========================================
-- 1. IDENTIFICAR USUÁRIOS DE TESTE
-- ==========================================
SELECT 
    '🔍 USUÁRIOS DE TESTE IDENTIFICADOS' as categoria,
    u.email,
    e.nome as empresa_nome,
    e.is_premium,
    e.status,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_orcamentos
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE 
    -- Emails conhecidos de teste
    u.email IN (
        'brunobgs1888@gmail.com',
        'brunobgstp01@gmail.com',
        'brunopix29@gmail.com',
        'bgsoftwares1@gmail.com',
        'ateliepro751@gmail.com',
        'brunobgs2004@gmail.com',
        'brunobgstp@gmail.com'
    )
    OR
    -- Empresas com "Bruno" no nome (provavelmente de teste)
    LOWER(e.nome) LIKE '%bruno%'
    OR
    -- Empresas com "teste" ou "test" no nome
    LOWER(e.nome) LIKE '%teste%'
    OR LOWER(e.nome) LIKE '%test%'
ORDER BY u.email;

-- ==========================================
-- 2. RESUMO EXECUTIVO EXCLUINDO TESTES
-- ==========================================
SELECT 
    '📊 RESUMO EXECUTIVO (SEM USUÁRIOS DE TESTE)' as categoria,
    COUNT(DISTINCT u.id) as total_usuarios_reais,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium_reais,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as trial_reais,
    -- Engajamento
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
    -- Uso (excluindo dados de teste)
    (
        SELECT COUNT(*) FROM public.customers c
        JOIN public.empresas emp ON c.empresa_id = emp.id
        JOIN public.user_empresas ue2 ON emp.id = ue2.empresa_id
        JOIN auth.users u2 ON ue2.user_id = u2.id
        WHERE NOT (
            u2.email IN (
                'brunobgs1888@gmail.com',
                'brunobgstp01@gmail.com',
                'brunopix29@gmail.com',
                'bgsoftwares1@gmail.com',
                'ateliepro751@gmail.com',
                'brunobgs2004@gmail.com',
                'brunobgstp@gmail.com'
            )
            OR LOWER(emp.nome) LIKE '%bruno%'
            OR LOWER(emp.nome) LIKE '%teste%'
            OR LOWER(emp.nome) LIKE '%test%'
        )
    ) as total_clientes_reais,
    (
        SELECT COUNT(*) FROM public.atelie_orders o
        JOIN public.empresas emp ON o.empresa_id = emp.id
        JOIN public.user_empresas ue2 ON emp.id = ue2.empresa_id
        JOIN auth.users u2 ON ue2.user_id = u2.id
        WHERE NOT (
            u2.email IN (
                'brunobgs1888@gmail.com',
                'brunobgstp01@gmail.com',
                'brunopix29@gmail.com',
                'bgsoftwares1@gmail.com',
                'ateliepro751@gmail.com',
                'brunobgs2004@gmail.com',
                'brunobgstp@gmail.com'
            )
            OR LOWER(emp.nome) LIKE '%bruno%'
            OR LOWER(emp.nome) LIKE '%teste%'
            OR LOWER(emp.nome) LIKE '%test%'
        )
    ) as total_pedidos_reais,
    (
        SELECT COUNT(*) FROM public.atelie_quotes q
        JOIN public.empresas emp ON q.empresa_id = emp.id
        JOIN public.user_empresas ue2 ON emp.id = ue2.empresa_id
        JOIN auth.users u2 ON ue2.user_id = u2.id
        WHERE NOT (
            u2.email IN (
                'brunobgs1888@gmail.com',
                'brunobgstp01@gmail.com',
                'brunopix29@gmail.com',
                'bgsoftwares1@gmail.com',
                'ateliepro751@gmail.com',
                'brunobgs2004@gmail.com',
                'brunobgstp@gmail.com'
            )
            OR LOWER(emp.nome) LIKE '%bruno%'
            OR LOWER(emp.nome) LIKE '%teste%'
            OR LOWER(emp.nome) LIKE '%test%'
        )
    ) as total_orcamentos_reais,
    -- Taxas
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_conversao_percentual_real,
    ROUND(
        COUNT(DISTINCT CASE WHEN EXISTS (
            SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
        ) OR EXISTS (
            SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
        ) THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_engajamento_percentual_real
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT (
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
);

-- ==========================================
-- 3. ENGAGAMENTO DOS USUÁRIOS REAIS
-- ==========================================
SELECT 
    '🎯 ENGAGAMENTO USUÁRIOS REAIS' as categoria,
    COUNT(DISTINCT e.id) as total_empresas_reais,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) THEN e.id END) as empresas_com_clientes,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as empresas_com_pedidos,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as empresas_com_orcamentos,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as empresas_ativas_reais,
    COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as empresas_inativas_reais
FROM public.empresas e
JOIN public.user_empresas ue ON e.id = ue.empresa_id
JOIN auth.users u ON ue.user_id = u.id
WHERE NOT (
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
);

-- ==========================================
-- 4. TOP 10 USUÁRIOS REAIS MAIS ATIVOS
-- ==========================================
SELECT 
    '🏆 TOP 10 USUÁRIOS REAIS MAIS ATIVOS' as categoria,
    u.email,
    e.nome as empresa_nome,
    e.is_premium,
    e.status,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_orcamentos,
    (
        (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) +
        (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) +
        (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id)
    ) as total_atividades,
    e.created_at as cadastrado_em
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT (
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
)
AND (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
    OR EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id)
    OR EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id)
)
ORDER BY total_atividades DESC
LIMIT 10;

-- ==========================================
-- 5. COMPARAÇÃO: COM vs SEM USUÁRIOS DE TESTE
-- ==========================================
SELECT 
    '📊 COMPARAÇÃO: COM vs SEM TESTES' as categoria,
    'COM TESTES' as tipo,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos,
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_conversao
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
UNION ALL
SELECT 
    '📊 COMPARAÇÃO: COM vs SEM TESTES' as categoria,
    'SEM TESTES (REAIS)' as tipo,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos,
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_conversao
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT (
    u.email IN (
        'brunobgs1888@gmail.com',
        'brunobgstp01@gmail.com',
        'brunopix29@gmail.com',
        'bgsoftwares1@gmail.com',
        'ateliepro751@gmail.com',
        'brunobgs2004@gmail.com',
        'brunobgstp@gmail.com'
    )
    OR (e.nome IS NOT NULL AND (LOWER(e.nome) LIKE '%bruno%' OR LOWER(e.nome) LIKE '%teste%' OR LOWER(e.nome) LIKE '%test%'))
);

