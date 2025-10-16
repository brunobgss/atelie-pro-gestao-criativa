-- Script para inserir um cliente de teste
-- Execute no Supabase SQL Editor

-- 1. Inserir cliente de teste na sua empresa
INSERT INTO public.customers (
  empresa_id,
  name,
  phone,
  email
) VALUES (
  '6fe21049-0417-48fd-bb67-646aeed028ae',
  'Cliente Teste',
  '(11) 99999-9999',
  'teste@email.com'
);

-- 2. Verificar se o cliente foi inserido
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
WHERE empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY created_at DESC;

-- 3. Inserir mais alguns clientes de teste
INSERT INTO public.customers (
  empresa_id,
  name,
  phone,
  email
) VALUES 
(
  '6fe21049-0417-48fd-bb67-646aeed028ae',
  'Maria Silva',
  '(11) 88888-8888',
  'maria@email.com'
),
(
  '6fe21049-0417-48fd-bb67-646aeed028ae',
  'João Santos',
  '(11) 77777-7777',
  'joao@email.com'
);

-- 4. Verificar todos os clientes inseridos
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
WHERE empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY created_at DESC;




