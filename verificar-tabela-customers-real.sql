-- Script para verificar se existem clientes na tabela customers
-- Execute no Supabase SQL Editor

-- 1. Verificar se a tabela customers existe e tem dados
SELECT 
  'customers' as tabela,
  COUNT(*) as total_registros
FROM public.customers;

-- 2. Mostrar todos os clientes da tabela customers
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
ORDER BY created_at DESC;

-- 3. Verificar se há clientes na sua empresa
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

-- 4. Verificar se há clientes em outras empresas
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.empresa_id,
  e.nome as empresa_nome,
  c.created_at
FROM public.customers c
LEFT JOIN public.empresas e ON c.empresa_id = e.id
WHERE c.empresa_id != '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY c.created_at DESC;

-- 5. Verificar estrutura da tabela customers
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;





