-- =====================================================
-- VERIFICAÇÃO FINAL - EXECUTE APÓS TODAS AS PARTES
-- =====================================================

-- Verificar se RLS está habilitado em todas as tabelas
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'cars_in_service', 'customers', 'empresas', 'expenses', 
    'quotes', 'services', 'user_empresas', 'tenants'
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
    'cars_in_service', 'customers', 'empresas', 'expenses', 
    'quotes', 'services', 'user_empresas', 'tenants'
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
    'cars_in_service', 'customers', 'empresas', 'expenses', 
    'quotes', 'services', 'user_empresas', 'tenants'
)
ORDER BY tablename, indexname;

-- Mensagem de sucesso
SELECT '🎉 CORREÇÃO DE RLS CONCLUÍDA COM SUCESSO! 🎉' as resultado;



