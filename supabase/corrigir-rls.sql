-- Corrigir RLS da tabela empresas
DROP POLICY IF EXISTS "anon_select_empresas" ON public.empresas;
DROP POLICY IF EXISTS "anon_insert_empresas" ON public.empresas;
DROP POLICY IF EXISTS "tenant_isolation_empresas" ON public.empresas;

CREATE POLICY "empresas_insert_policy" ON public.empresas
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "empresas_select_policy" ON public.empresas
FOR SELECT USING (true);

-- Corrigir RLS da tabela user_empresas
DROP POLICY IF EXISTS "anon_select_user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "anon_insert_user_empresas" ON public.user_empresas;
DROP POLICY IF EXISTS "tenant_isolation_user_empresas" ON public.user_empresas;

CREATE POLICY "user_empresas_insert_policy" ON public.user_empresas
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_empresas_select_policy" ON public.user_empresas
FOR SELECT USING (auth.role() = 'authenticated');

-- Verificar se funcionou
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('empresas', 'user_empresas')
ORDER BY tablename, policyname;


