-- =====================================================
-- PARTE 6: POLÍTICAS FINAIS E ÍNDICES
-- =====================================================
-- Execute após a PARTE 5

-- Políticas para EXPENSES
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

-- Políticas para TENANTS
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

-- Criar índices importantes para performance
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON public.user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON public.user_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa ON public.user_empresas(user_id, empresa_id);

-- Verificar se tudo foi criado
SELECT 'Políticas finais e índices criados com sucesso!' as status;



