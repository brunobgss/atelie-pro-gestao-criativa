-- Script para verificar se a tabela customers foi criada corretamente
-- Execute no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'customers' AND table_schema = 'public';

-- 2. Verificar colunas da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'customers' AND schemaname = 'public';

-- 4. Verificar políticas RLS
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customers' AND schemaname = 'public';

-- 5. Testar inserção (opcional - descomente se quiser testar)
-- INSERT INTO public.customers (empresa_id, name, phone, email) 
-- VALUES (
--   (SELECT id FROM public.empresas LIMIT 1), 
--   'Cliente Teste', 
--   '(11) 99999-9999', 
--   'teste@email.com'
-- );

-- 6. Verificar se há dados na tabela
SELECT COUNT(*) as total_clientes FROM public.customers;