-- =====================================================
-- PARTE 4 CORRIGIDA: REMOVER E RECRIAR POLÍTICAS
-- =====================================================
-- Execute após a PARTE 3

-- REMOVER POLÍTICAS EXISTENTES PRIMEIRO
-- =====================================================

-- Remover políticas existentes de customers
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

-- Remover políticas existentes de quotes
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

-- CRIAR NOVAS POLÍTICAS RLS
-- =====================================================

-- Políticas para CUSTOMERS (clientes do ateliê)
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

-- Políticas para QUOTES (orçamentos de bordados)
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

-- Verificar se políticas foram criadas
SELECT 'Políticas para clientes e orçamentos criadas com sucesso!' as status;


