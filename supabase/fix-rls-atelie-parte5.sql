-- =====================================================
-- PARTE 5: POLÍTICAS PARA SERVIÇOS E DESPESAS
-- =====================================================
-- Execute após a PARTE 4

-- Políticas para SERVICES (serviços de bordado)
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

-- Nota: Tabela 'expenses' não existe no banco, então não criamos políticas para ela

-- Verificar se políticas foram criadas
SELECT 'Políticas para serviços criadas!' as status;

