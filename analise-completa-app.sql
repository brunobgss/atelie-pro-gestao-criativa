-- 📊 ANÁLISE COMPLETA DO APP - Métricas de Uso e Engajamento
-- Execute este script no Supabase SQL Editor para ver todas as métricas

-- ==========================================
-- 1. VISÃO GERAL: Estatísticas Gerais
-- ==========================================
SELECT 
    '📊 VISÃO GERAL' as categoria,
    COUNT(DISTINCT u.id) as total_usuarios_cadastrados,
    COUNT(DISTINCT e.id) as total_empresas_criadas,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as usuarios_premium,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as usuarios_trial,
    COUNT(DISTINCT CASE WHEN e.status = 'expired' THEN e.id END) as usuarios_expirados,
    COUNT(DISTINCT CASE WHEN e.status = 'trial' OR e.status IS NULL THEN e.id END) as usuarios_trial_ativo,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as usuarios_premium_ativo
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id;

-- ==========================================
-- 2. USUÁRIOS POR STATUS
-- ==========================================
SELECT 
    '📈 DISTRIBUIÇÃO POR STATUS' as categoria,
    COALESCE(e.status, 'sem_status') as status,
    COUNT(DISTINCT e.id) as total_empresas,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as nao_premium,
    ROUND(COUNT(DISTINCT e.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.empresas), 0), 2) as percentual
FROM public.empresas e
GROUP BY e.status
ORDER BY total_empresas DESC;

-- ==========================================
-- 3. ENGAGAMENTO: Usuários que REALMENTE USAM o app
-- ==========================================
SELECT 
    '🎯 ENGAGAMENTO DOS USUÁRIOS' as categoria,
    COUNT(DISTINCT e.id) as total_empresas,
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
    ) THEN e.id END) as empresas_ativas,
    COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
    ) THEN e.id END) as empresas_inativas
FROM public.empresas e;

-- ==========================================
-- 4. USUÁRIOS INATIVOS: Cadastrados mas nunca usaram
-- ==========================================
SELECT 
    '😴 USUÁRIOS INATIVOS (Nunca usaram o app)' as categoria,
    u.email,
    e.nome as empresa_nome,
    e.created_at as cadastrado_em,
    EXTRACT(DAYS FROM (NOW() - e.created_at)) as dias_desde_cadastro,
    e.status,
    e.is_premium,
    CASE 
        WHEN e.is_premium = true THEN '💎 Premium'
        WHEN e.status = 'expired' THEN '⏰ Expirado'
        WHEN e.status = 'trial' OR e.status IS NULL THEN '🆓 Trial'
        ELSE '❓ Outro'
    END as tipo
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id)
ORDER BY e.created_at DESC;

-- ==========================================
-- 5. USUÁRIOS MAIS ATIVOS: Top 10 por engajamento
-- ==========================================
SELECT 
    '🏆 TOP 10 USUÁRIOS MAIS ATIVOS' as categoria,
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
WHERE EXISTS (
    SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
) OR EXISTS (
    SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
) OR EXISTS (
    SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id
)
ORDER BY total_atividades DESC
LIMIT 10;

-- ==========================================
-- 6. CONVERSÃO: Trial para Premium
-- ==========================================
SELECT 
    '💰 CONVERSÃO TRIAL → PREMIUM' as categoria,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as total_premium,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as total_trial,
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0), 
        2
    ) as taxa_conversao_percentual,
    COUNT(DISTINCT CASE WHEN e.is_premium = true 
        AND EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
        THEN e.id END) as premium_que_usam_app,
    COUNT(DISTINCT CASE WHEN (e.is_premium = false OR e.is_premium IS NULL)
        AND EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
        THEN e.id END) as trial_que_usam_app
FROM public.empresas e;

-- ==========================================
-- 7. ATIVIDADE POR PERÍODO: Cadastros recentes
-- ==========================================
SELECT 
    '📅 CADASTROS POR PERÍODO' as categoria,
    DATE_TRUNC('week', e.created_at) as semana,
    COUNT(DISTINCT e.id) as novos_cadastros,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium_novos,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) THEN e.id END) as que_ja_usam_app
FROM public.empresas e
WHERE e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('week', e.created_at)
ORDER BY semana DESC;

-- ==========================================
-- 8. RETENÇÃO: Usuários que continuam usando
-- ==========================================
SELECT 
    '📊 RETENÇÃO DE USUÁRIOS' as categoria,
    tempo_cadastro,
    COUNT(DISTINCT empresa_id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN tem_uso THEN empresa_id END) as usuarios_ativos,
    ROUND(
        COUNT(DISTINCT CASE WHEN tem_uso THEN empresa_id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT empresa_id), 0),
        2
    ) as taxa_retencao_percentual
FROM (
    SELECT 
        e.id as empresa_id,
        CASE 
            WHEN EXTRACT(DAYS FROM (NOW() - e.created_at)) <= 7 THEN '0-7 dias'
            WHEN EXTRACT(DAYS FROM (NOW() - e.created_at)) <= 14 THEN '8-14 dias'
            WHEN EXTRACT(DAYS FROM (NOW() - e.created_at)) <= 30 THEN '15-30 dias'
            WHEN EXTRACT(DAYS FROM (NOW() - e.created_at)) <= 60 THEN '31-60 dias'
            ELSE '60+ dias'
        END as tempo_cadastro,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
            ) OR EXISTS (
                SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
            ) THEN true
            ELSE false
        END as tem_uso
    FROM public.empresas e
) dados
GROUP BY tempo_cadastro
ORDER BY 
    CASE tempo_cadastro
        WHEN '0-7 dias' THEN 1
        WHEN '8-14 dias' THEN 2
        WHEN '15-30 dias' THEN 3
        WHEN '31-60 dias' THEN 4
        ELSE 5
    END;

-- ==========================================
-- 9. MÉTRICAS DE USO: Clientes, Pedidos, Orçamentos
-- ==========================================
SELECT 
    '📦 MÉTRICAS DE USO' as categoria,
    (SELECT COUNT(*) FROM public.customers) as total_clientes_cadastrados,
    (SELECT COUNT(*) FROM public.atelie_orders) as total_pedidos_criados,
    (SELECT COUNT(*) FROM public.atelie_quotes) as total_orcamentos_criados,
    (SELECT COUNT(DISTINCT empresa_id) FROM public.customers) as empresas_com_clientes,
    (SELECT COUNT(DISTINCT empresa_id) FROM public.atelie_orders) as empresas_com_pedidos,
    (SELECT COUNT(DISTINCT empresa_id) FROM public.atelie_quotes) as empresas_com_orcamentos,
    ROUND(AVG(stats.clientes_por_empresa), 2) as media_clientes_por_empresa,
    ROUND(AVG(stats.pedidos_por_empresa), 2) as media_pedidos_por_empresa,
    ROUND(AVG(stats.orcamentos_por_empresa), 2) as media_orcamentos_por_empresa
FROM (
    SELECT 
        e.id,
        (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as clientes_por_empresa,
        (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as pedidos_por_empresa,
        (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as orcamentos_por_empresa
    FROM public.empresas e
) stats;

-- ==========================================
-- 10. USUÁRIOS PREMIUM: Análise detalhada
-- ==========================================
SELECT 
    '💎 ANÁLISE PREMIUM USERS' as categoria,
    u.email,
    e.nome as empresa_nome,
    e.created_at as cadastrado_em,
    e.trial_end_date as plano_expira_em,
    EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes_plano,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_orcamentos,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id) THEN '✅ Usa o app'
        ELSE '❌ Não usa o app'
    END as status_uso
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE e.is_premium = true
ORDER BY e.created_at DESC;

-- ==========================================
-- 11. RESUMO EXECUTIVO: Tudo em uma query
-- ==========================================
SELECT 
    '📊 RESUMO EXECUTIVO' as categoria,
    -- Usuários
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium,
    COUNT(DISTINCT CASE WHEN e.is_premium = false OR e.is_premium IS NULL THEN e.id END) as trial,
    -- Engajamento
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos,
    COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_inativos,
    -- Uso
    (SELECT COUNT(*) FROM public.customers) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes) as total_orcamentos,
    -- Conversão
    ROUND(
        COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_conversao_percentual,
    -- Retenção
    ROUND(
        COUNT(DISTINCT CASE WHEN EXISTS (
            SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
        ) OR EXISTS (
            SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
        ) THEN e.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT e.id), 0),
        2
    ) as taxa_engajamento_percentual
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id;

