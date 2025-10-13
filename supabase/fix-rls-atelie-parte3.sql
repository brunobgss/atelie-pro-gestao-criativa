-- =====================================================
-- PARTE 3: POLÍTICAS RLS PARA ATELIÊ
-- =====================================================
-- Execute após a PARTE 2

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

-- Verificar se políticas foram criadas
SELECT 'Políticas para empresas e usuários criadas!' as status;



