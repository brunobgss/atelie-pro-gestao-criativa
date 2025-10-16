-- Script para verificar se os clientes foram movidos
-- Execute no Supabase SQL Editor

-- 1. Verificar clientes na sua empresa
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.empresa_id,
  c.created_at
FROM public.customers c
WHERE c.empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY c.created_at DESC;

-- 2. Verificar se ainda há clientes na empresa antiga
SELECT 
  COUNT(*) as clientes_na_empresa_antiga
FROM public.customers 
WHERE empresa_id = '6dcece50-9535-4dd4-bfe1-848654417629';

-- 3. Verificar total de clientes
SELECT 
  COUNT(*) as total_clientes
FROM public.customers;

-- 4. Verificar políticas RLS da tabela customers
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'customers' AND schemaname = 'public';

-- 5. Testar consulta com usuário específico
SELECT 
  c.*,
  ue.user_id,
  ue.empresa_id as empresa_do_usuario
FROM public.customers c
LEFT JOIN public.user_empresas ue ON c.empresa_id = ue.empresa_id
WHERE ue.user_id = '313bfb51-8657-41bd-b543-0f3faa61fefd';




