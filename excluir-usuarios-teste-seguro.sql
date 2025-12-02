-- 🗑️ EXCLUIR USUÁRIOS DE TESTE DE FORMA SEGURA
-- ⚠️ ATENÇÃO: Este script exclui usuários de teste. Revise bem antes de executar!

-- ==========================================
-- ANTES DE EXCLUIR: Verificar o que será excluído
-- ==========================================

-- Listar todos os usuários de teste e o que eles têm
SELECT 
    '🔍 VERIFICAÇÃO ANTES DE EXCLUIR' as tipo,
    u.email,
    e.nome as empresa_nome,
    e.id as empresa_id,
    e.is_premium,
    e.status,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) as total_clientes,
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) as total_pedidos,
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_orcamentos,
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id) as total_dados_que_serao_excluidos
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
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
ORDER BY total_dados_que_serao_excluidos DESC;

-- ==========================================
-- RESUMO: Quantos dados serão excluídos
-- ==========================================
SELECT 
    '📊 RESUMO DO QUE SERÁ EXCLUÍDO' as tipo,
    COUNT(DISTINCT e.id) as empresas_que_serao_excluidas,
    COUNT(DISTINCT u.id) as usuarios_que_serao_excluidos,
    (SELECT COUNT(*) FROM public.customers c
     JOIN public.empresas emp ON c.empresa_id = emp.id
     JOIN public.user_empresas ue2 ON emp.id = ue2.empresa_id
     JOIN auth.users u2 ON ue2.user_id = u2.id
     WHERE u2.email IN (
         'brunobgs1888@gmail.com',
         'brunobgstp01@gmail.com',
         'brunopix29@gmail.com',
         'bgsoftwares1@gmail.com',
         'ateliepro751@gmail.com',
         'brunobgs2004@gmail.com',
         'brunobgstp@gmail.com'
     ) OR LOWER(emp.nome) LIKE '%bruno%'
     OR LOWER(emp.nome) LIKE '%teste%'
     OR LOWER(emp.nome) LIKE '%test%'
    ) as clientes_que_serao_excluidos,
    (SELECT COUNT(*) FROM public.atelie_orders o
     JOIN public.empresas emp ON o.empresa_id = emp.id
     JOIN public.user_empresas ue2 ON emp.id = ue2.empresa_id
     JOIN auth.users u2 ON ue2.user_id = u2.id
     WHERE u2.email IN (
         'brunobgs1888@gmail.com',
         'brunobgstp01@gmail.com',
         'brunopix29@gmail.com',
         'bgsoftwares1@gmail.com',
         'ateliepro751@gmail.com',
         'brunobgs2004@gmail.com',
         'brunobgstp@gmail.com'
     ) OR LOWER(emp.nome) LIKE '%bruno%'
     OR LOWER(emp.nome) LIKE '%teste%'
     OR LOWER(emp.nome) LIKE '%test%'
    ) as pedidos_que_serao_excluidos
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
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
    OR LOWER(e.nome) LIKE '%test%';

-- ==========================================
-- EXCLUIR USUÁRIOS DE TESTE (DESCOMENTE QUANDO TIVER CERTEZA)
-- ==========================================
-- ⚠️ IMPORTANTE: 
-- 1. Execute primeiro as queries de verificação acima
-- 2. Revise bem o que será excluído
-- 3. Faça backup se necessário
-- 4. Descomente as queries abaixo quando tiver certeza

/*
-- Excluir empresas de teste (cascata vai excluir tudo relacionado)
DELETE FROM public.empresas
WHERE id IN (
    SELECT DISTINCT e.id
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
);

-- Excluir usuários de teste (auth.users)
-- NOTA: Isso pode falhar se houver dependências. 
-- Se falhar, pode ser necessário excluir manualmente pelo Supabase Dashboard
DELETE FROM auth.users
WHERE email IN (
    'brunobgs1888@gmail.com',
    'brunobgstp01@gmail.com',
    'brunopix29@gmail.com',
    'bgsoftwares1@gmail.com',
    'ateliepro751@gmail.com',
    'brunobgs2004@gmail.com',
    'brunobgstp@gmail.com'
);
*/

-- ==========================================
-- VERIFICAÇÃO APÓS EXCLUSÃO (execute depois de excluir)
-- ==========================================
SELECT 
    '✅ VERIFICAÇÃO APÓS EXCLUSÃO' as tipo,
    COUNT(DISTINCT u.id) as total_usuarios_restantes,
    COUNT(DISTINCT CASE WHEN e.is_premium = true THEN e.id END) as premium_restantes,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id
    ) OR EXISTS (
        SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id
    ) THEN e.id END) as usuarios_ativos_restantes
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id;









