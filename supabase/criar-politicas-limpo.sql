-- =====================================================
-- CRIAR POLÍTICAS RLS LIMPAS - ATELIÊ PRO
-- =====================================================
-- Execute APÓS o script de limpeza

-- Políticas para USER_EMPRESAS (controle de acesso)
CREATE POLICY "user_empresas_select_policy" ON public.user_empresas
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_empresas_insert_policy" ON public.user_empresas
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_empresas_update_policy" ON public.user_empresas
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_empresas_delete_policy" ON public.user_empresas
    FOR DELETE USING (user_id = auth.uid());

-- Políticas para EMPRESAS (ateliês)
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

-- Políticas para INVENTORY_ITEMS (estoque do ateliê)
CREATE POLICY "inventory_items_select_policy" ON public.inventory_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = inventory_items.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "inventory_items_insert_policy" ON public.inventory_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = inventory_items.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "inventory_items_update_policy" ON public.inventory_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = inventory_items.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

CREATE POLICY "inventory_items_delete_policy" ON public.inventory_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_empresas 
            WHERE user_empresas.empresa_id = inventory_items.empresa_id 
            AND user_empresas.user_id = auth.uid()
        )
    );

-- Criar índices importantes para performance
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON public.user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON public.user_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa ON public.user_empresas(user_id, empresa_id);

-- Verificar se todas as políticas foram criadas
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

-- Mensagem de sucesso
SELECT '🎨 POLÍTICAS RLS DO ATELIÊ PRO CRIADAS COM SUCESSO! 🎨' as status;


