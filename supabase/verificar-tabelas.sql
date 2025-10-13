-- =====================================================
-- SCRIPT SEGURO DE RLS - ATELIÊ PRO
-- =====================================================
-- Este script verifica se as tabelas existem antes de habilitar RLS

-- Verificar quais tabelas existem
SELECT 
    tablename,
    'EXISTE' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'customers', 'empresas', 'quotes', 'services', 
    'user_empresas', 'tenants', 'inventory_items'
)
ORDER BY tablename;


