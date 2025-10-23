-- Script para mover clientes da empresa antiga para a nova
-- Execute no Supabase SQL Editor

-- 1. Verificar clientes na empresa antiga
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.empresa_id,
  c.created_at
FROM public.customers c
WHERE c.empresa_id = '6dcece50-9535-4dd4-bfe1-848654417629';

-- 2. Mover clientes da empresa antiga para a nova
UPDATE public.customers 
SET empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
WHERE empresa_id = '6dcece50-9535-4dd4-bfe1-848654417629';

-- 3. Verificar se a movimentação funcionou
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

-- 4. Verificar se ainda há clientes na empresa antiga
SELECT 
  COUNT(*) as clientes_restantes_empresa_antiga
FROM public.customers 
WHERE empresa_id = '6dcece50-9535-4dd4-bfe1-848654417629';





