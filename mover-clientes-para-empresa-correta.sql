-- Script para mover clientes para a empresa correta
-- Execute no Supabase SQL Editor

-- 1. Verificar onde estão os clientes
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
ORDER BY c.created_at DESC;

-- 2. Verificar todas as empresas "Ateliê Borges"
SELECT 
  id,
  nome,
  cpf_cnpj,
  telefone,
  created_at
FROM public.empresas 
WHERE nome LIKE '%Borges%'
ORDER BY created_at;

-- 3. Mover clientes para a empresa correta do usuário
-- (Substitua '6fe21049-0417-48fd-bb67-646aeed028ae' pela sua empresa_id)
UPDATE public.customers 
SET empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
WHERE empresa_id IN (
  SELECT id 
  FROM public.empresas 
  WHERE nome LIKE '%Borges%' 
  AND id != '6fe21049-0417-48fd-bb67-646aeed028ae'
);

-- 4. Verificar se a movimentação funcionou
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
WHERE c.empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY c.created_at DESC;





