-- =====================================================
-- PARTE 2: REMOVER POLÍTICAS CONFLITANTES
-- =====================================================
-- Execute após a PARTE 1

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

-- Verificar se políticas foram removidas
SELECT 'Políticas conflitantes removidas!' as status;



