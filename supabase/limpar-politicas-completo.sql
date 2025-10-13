-- =====================================================
-- LIMPEZA COMPLETA DE POLÍTICAS RLS
-- =====================================================
-- Execute este script PRIMEIRO para limpar todas as políticas existentes

-- Remover TODAS as políticas existentes de todas as tabelas
-- =====================================================

-- Limpar políticas de user_empresas
DROP POLICY IF EXISTS "user_empresas_select_policy" ON public.user_empresas;
DROP POLICY IF EXISTS "user_empresas_insert_policy" ON public.user_empresas;
DROP POLICY IF EXISTS "user_empresas_update_policy" ON public.user_empresas;
DROP POLICY IF EXISTS "user_empresas_delete_policy" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow all operations on user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow delete user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow insert user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow select user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow update user_empresas" ON public.user_empresas;

-- Limpar políticas de empresas
DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;
DROP POLICY IF EXISTS "Allow all operations on empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow select empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow update empresas" ON public.empresas;

-- Limpar políticas de customers
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

-- Limpar políticas de quotes
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

-- Limpar políticas de inventory_items
DROP POLICY IF EXISTS "inventory_items_select_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_update_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete_policy" ON public.inventory_items;

-- Verificar se todas as políticas foram removidas
SELECT 
    schemaname, 
    tablename, 
    policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'inventory_items'
)
ORDER BY tablename, policyname;

-- Se não aparecer nenhuma política acima, significa que foram removidas com sucesso
SELECT 'Limpeza de políticas concluída!' as status;


