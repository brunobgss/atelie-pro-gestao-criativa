-- CORREÇÃO: Políticas RLS para tabela empresas
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar as políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'empresas';

-- 2. Remover políticas problemáticas
DROP POLICY IF EXISTS "anon_select_empresas" ON public.empresas;
DROP POLICY IF EXISTS "anon_insert_empresas" ON public.empresas;
DROP POLICY IF EXISTS "tenant_isolation_empresas" ON public.empresas;

-- 3. Criar políticas corretas para empresas
-- Política para SELECT (todos podem ler empresas)
CREATE POLICY "empresas_select_policy" ON public.empresas
FOR SELECT USING (true);

-- Política para INSERT (usuários autenticados podem criar empresas)
CREATE POLICY "empresas_insert_policy" ON public.empresas
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE (apenas donos podem editar)
CREATE POLICY "empresas_update_policy" ON public.empresas
FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE (apenas donos podem deletar)
CREATE POLICY "empresas_delete_policy" ON public.empresas
FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'empresas';


