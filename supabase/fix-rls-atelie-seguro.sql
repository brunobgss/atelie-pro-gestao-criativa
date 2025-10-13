-- =====================================================
-- SCRIPT SEGURO DE RLS - ATELIÊ PRO (APENAS TABELAS CONFIRMADAS)
-- =====================================================
-- Execute este script apenas se a verificação anterior mostrou que as tabelas existem

-- HABILITAR RLS APENAS NAS TABELAS QUE EXISTEM
-- =====================================================

-- Tabelas principais do Ateliê Pro
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'tenants'
)
ORDER BY tablename;


