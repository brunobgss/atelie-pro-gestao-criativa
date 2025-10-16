-- Script para verificar políticas RLS da tabela customers
-- Execute no Supabase SQL Editor

-- 1. Verificar se RLS está habilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'customers' AND schemaname = 'public';

-- 2. Verificar políticas existentes
SELECT 
  policyname,
  permissive,
  roles,
  cmd as comando,
  qual as condicao,
  with_check as verificacao
FROM pg_policies 
WHERE tablename = 'customers' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Verificar permissões da tabela
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'customers' AND table_schema = 'public';

-- 4. Testar consulta com usuário específico (substitua o user_id)
-- SELECT 
--   c.*,
--   ue.empresa_id as empresa_do_usuario
-- FROM public.customers c
-- LEFT JOIN public.user_empresas ue ON c.empresa_id = ue.empresa_id
-- WHERE ue.user_id = 'SEU_USER_ID_AQUI';

-- 5. Verificar se há problemas de permissão
SELECT 
  'RLS habilitado' as status,
  CASE 
    WHEN rowsecurity THEN 'SIM' 
    ELSE 'NÃO' 
  END as valor
FROM pg_tables 
WHERE tablename = 'customers' AND schemaname = 'public'

UNION ALL

SELECT 
  'Políticas ativas' as status,
  COUNT(*)::text as valor
FROM pg_policies 
WHERE tablename = 'customers' AND schemaname = 'public'

UNION ALL

SELECT 
  'Total de clientes' as status,
  COUNT(*)::text as valor
FROM public.customers;




