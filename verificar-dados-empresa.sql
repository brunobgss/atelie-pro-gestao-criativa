-- Script URGENTE para verificar se os dados ainda existem no banco
-- Execute no Supabase SQL Editor

-- 1. Verificar quantos clientes existem no total
SELECT 
  'Total de clientes' as tipo,
  COUNT(*) as quantidade
FROM public.customers;

-- 2. Verificar clientes por empresa
SELECT 
  empresa_id,
  COUNT(*) as total_clientes,
  STRING_AGG(name, ', ') as nomes_clientes
FROM public.customers
GROUP BY empresa_id
ORDER BY total_clientes DESC;

-- 3. Verificar pedidos por empresa
SELECT 
  empresa_id,
  COUNT(*) as total_pedidos
FROM public.atelie_orders
WHERE status != 'Cancelado'
GROUP BY empresa_id
ORDER BY total_pedidos DESC;

-- 4. Verificar orçamentos por empresa
SELECT 
  empresa_id,
  COUNT(*) as total_orcamentos
FROM public.atelie_quotes
GROUP BY empresa_id
ORDER BY total_orcamentos DESC;

-- 5. Verificar qual empresa_id está associada ao usuário
-- (Substitua 'USER_ID_AQUI' pelo ID do usuário que está logado)
-- SELECT 
--   ue.user_id,
--   ue.empresa_id,
--   e.nome as nome_empresa
-- FROM public.user_empresas ue
-- LEFT JOIN public.empresas e ON e.id = ue.empresa_id
-- WHERE ue.user_id = 'USER_ID_AQUI';

-- 6. Verificar se há clientes sem empresa_id
SELECT 
  'Clientes sem empresa_id' as tipo,
  COUNT(*) as quantidade
FROM public.customers
WHERE empresa_id IS NULL;

-- 7. Verificar se há pedidos sem empresa_id
SELECT 
  'Pedidos sem empresa_id' as tipo,
  COUNT(*) as quantidade
FROM public.atelie_orders
WHERE empresa_id IS NULL;

-- 8. Listar TODOS os clientes (últimos 20)
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
ORDER BY created_at DESC
LIMIT 20;

