-- =====================================================
-- PARTE 4: POLÍTICAS PARA CLIENTES E ORÇAMENTOS
-- =====================================================
-- Execute após a PARTE 3

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
SELECT 'Políticas para clientes e orçamentos criadas!' as status;


