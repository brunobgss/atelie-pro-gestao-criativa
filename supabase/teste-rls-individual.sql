-- =====================================================
-- TESTE INDIVIDUAL DE RLS - ATELIÊ PRO
-- =====================================================
-- Execute cada comando individualmente para identificar o problema

-- Teste 1: Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
SELECT 'customers: RLS habilitado' as resultado;

-- Teste 2: Empresas  
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
SELECT 'empresas: RLS habilitado' as resultado;

-- Teste 3: Quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
SELECT 'quotes: RLS habilitado' as resultado;

-- Teste 4: User_empresas
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
SELECT 'user_empresas: RLS habilitado' as resultado;

-- Teste 5: Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
SELECT 'tenants: RLS habilitado' as resultado;


