-- =====================================================
-- VERIFICAÇÃO FINAL - ATELIÊ PRO
-- =====================================================
-- Execute após todas as partes

-- Verificar se RLS está habilitado nas tabelas do ateliê
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_habilitado,
    CASE 
        WHEN tablename = 'customers' THEN '👥 Clientes'
        WHEN tablename = 'empresas' THEN '🏢 Ateliês'
        WHEN tablename = 'quotes' THEN '📋 Orçamentos'
        WHEN tablename = 'user_empresas' THEN '👤 Usuários'
        WHEN tablename = 'inventory_items' THEN '📦 Estoque'
        ELSE tablename
    END as descricao
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'inventory_items'
)
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'inventory_items'
)
ORDER BY tablename, policyname;

-- Verificar índices criados
SELECT 
    schemaname, 
    tablename, 
    indexname
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'inventory_items'
)
ORDER BY tablename, indexname;

-- Mensagem de sucesso
SELECT '🎨 ATELIÊ PRO - CORREÇÃO DE RLS CONCLUÍDA! 🎨' as resultado;


