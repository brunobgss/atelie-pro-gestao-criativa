-- =====================================================
-- PARTE 5: POLÍTICAS PARA ESTOQUE E ÍNDICES
-- =====================================================
-- Execute após a PARTE 4

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

-- Verificar se tudo foi criado
SELECT '🎨 POLÍTICAS RLS DO ATELIÊ PRO CRIADAS COM SUCESSO! 🎨' as status;


