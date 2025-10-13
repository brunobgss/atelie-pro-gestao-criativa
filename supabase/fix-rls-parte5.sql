-- =====================================================
-- PARTE 5: POLÍTICAS PARA TABELAS RESTANTES
-- =====================================================
-- Execute após a PARTE 4

-- Políticas para CARS_IN_SERVICE
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

-- Políticas para SERVICES
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

-- Verificar se políticas foram criadas
SELECT 'Políticas para cars_in_service e services criadas!' as status;



