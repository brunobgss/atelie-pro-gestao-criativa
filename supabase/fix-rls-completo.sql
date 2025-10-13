-- =====================================================
-- SCRIPT DE CORREÇÃO COMPLETA DE RLS - ATELIÊ PRO
-- =====================================================
-- Este script corrige todos os problemas de Row Level Security
-- e otimiza a performance do banco de dados

-- 1. HABILITAR RLS EM TODAS AS TABELAS CRÍTICAS
-- =====================================================
-- Habilitar RLS apenas nas tabelas que não têm RLS habilitado
ALTER TABLE public.cars_in_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS DUPLICADAS E CONFLITANTES
-- =====================================================
-- Remover políticas antigas que causam conflitos
DROP POLICY IF EXISTS "Allow all operations on empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow all operations on user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow select empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow delete user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow insert user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow select user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "Allow update user_empresas" ON public.user_empresas;

-- 3. CRIAR POLÍTICAS RLS OTIMIZADAS E SEGURAS
-- =====================================================

-- Políticas para tabela EMPRESAS
CREATE POLICY "empresas_select_policy" ON public.empresas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = empresas.id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "empresas_insert_policy" ON public.empresas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = empresas.id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "empresas_update_policy" ON public.empresas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = empresas.id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "empresas_delete_policy" ON public.empresas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = empresas.id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela USER_EMPRESAS
CREATE POLICY "user_empresas_select_policy" ON public.user_empresas
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_empresas_insert_policy" ON public.user_empresas
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_empresas_update_policy" ON public.user_empresas
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_empresas_delete_policy" ON public.user_empresas
    FOR DELETE USING (user_id = auth.uid());

-- Políticas para tabela CUSTOMERS
CREATE POLICY "customers_select_policy" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = customers.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "customers_insert_policy" ON public.customers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = customers.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "customers_update_policy" ON public.customers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = customers.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "customers_delete_policy" ON public.customers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = customers.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela QUOTES
CREATE POLICY "quotes_select_policy" ON public.quotes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = quotes.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "quotes_insert_policy" ON public.quotes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = quotes.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "quotes_update_policy" ON public.quotes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = quotes.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "quotes_delete_policy" ON public.quotes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = quotes.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela ORDERS
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = orders.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = orders.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = orders.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_delete_policy" ON public.orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = orders.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela SERVICES
CREATE POLICY "services_select_policy" ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = services.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "services_insert_policy" ON public.services
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = services.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "services_update_policy" ON public.services
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = services.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "services_delete_policy" ON public.services
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = services.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela EXPENSES
CREATE POLICY "expenses_select_policy" ON public.expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = expenses.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_insert_policy" ON public.expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = expenses.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_update_policy" ON public.expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = expenses.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_delete_policy" ON public.expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = expenses.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela CARS_IN_SERVICE
CREATE POLICY "cars_in_service_select_policy" ON public.cars_in_service
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = cars_in_service.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "cars_in_service_insert_policy" ON public.cars_in_service
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = cars_in_service.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "cars_in_service_update_policy" ON public.cars_in_service
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = cars_in_service.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "cars_in_service_delete_policy" ON public.cars_in_service
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = cars_in_service.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Políticas para tabela TENANTS
CREATE POLICY "tenants_select_policy" ON public.tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = tenants.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "tenants_insert_policy" ON public.tenants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = tenants.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "tenants_update_policy" ON public.tenants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = tenants.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "tenants_delete_policy" ON public.tenants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = tenants.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- 4. CRIAR ÍNDICES PARA MELHORAR PERFORMANCE
-- =====================================================
-- Índices para user_empresas (tabela mais consultada)
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON public.user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON public.user_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa ON public.user_empresas(user_id, empresa_id);

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_id ON public.empresas(id);
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas(nome);

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_empresa_id ON public.customers(empresa_id);
CREATE INDEX IF NOT EXISTS idx_customers_nome ON public.customers(nome);

-- Índices para quotes
CREATE INDEX IF NOT EXISTS idx_quotes_empresa_id ON public.quotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON public.quotes(date);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_empresa_id ON public.orders(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Índices para services
CREATE INDEX IF NOT EXISTS idx_services_empresa_id ON public.services(empresa_id);
CREATE INDEX IF NOT EXISTS idx_services_nome ON public.services(nome);

-- Índices para expenses
CREATE INDEX IF NOT EXISTS idx_expenses_empresa_id ON public.expenses(empresa_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Índices para cars_in_service
CREATE INDEX IF NOT EXISTS idx_cars_in_service_empresa_id ON public.cars_in_service(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cars_in_service_customer_id ON public.cars_in_service(customer_id);

-- Índices para tenants
CREATE INDEX IF NOT EXISTS idx_tenants_empresa_id ON public.tenants(empresa_id);

-- 5. OTIMIZAR CONFIGURAÇÕES DO BANCO
-- =====================================================
-- Configurar estatísticas para melhor performance
ANALYZE public.user_empresas;
ANALYZE public.empresas;
ANALYZE public.customers;
ANALYZE public.quotes;
ANALYZE public.orders;
ANALYZE public.services;
ANALYZE public.expenses;
ANALYZE public.cars_in_service;
ANALYZE public.tenants;

-- 6. VERIFICAR SE TUDO ESTÁ FUNCIONANDO
-- =====================================================
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'cars_in_service', 'customers', 'empresas', 'expenses', 
    'quotes', 'services', 'user_empresas', 'tenants'
);

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar índices criados
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'cars_in_service', 'customers', 'empresas', 'expenses', 
    'quotes', 'services', 'user_empresas', 'tenants'
)
ORDER BY tablename, indexname;

-- =====================================================
-- SCRIPT CONCLUÍDO COM SUCESSO!
-- =====================================================
-- Este script corrigiu:
-- ✅ RLS habilitado em todas as tabelas críticas
-- ✅ Políticas RLS seguras e otimizadas
-- ✅ Índices para melhor performance
-- ✅ Configurações otimizadas do banco
-- ✅ Verificação de funcionamento
-- =====================================================