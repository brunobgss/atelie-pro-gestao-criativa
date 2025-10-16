-- Script para investigar clientes perdidos
-- Execute no Supabase SQL Editor

-- 1. Verificar se há clientes na tabela (sem filtro de empresa)
SELECT 
  COUNT(*) as total_clientes_geral,
  COUNT(DISTINCT empresa_id) as empresas_com_clientes
FROM public.customers;

-- 2. Mostrar todos os clientes existentes (sem filtro)
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
ORDER BY created_at DESC;

-- 3. Verificar empresas e suas associações
SELECT 
  e.id as empresa_id,
  e.nome as empresa_nome,
  e.cpf_cnpj,
  COUNT(ue.user_id) as usuarios_vinculados,
  COUNT(c.id) as clientes_vinculados
FROM public.empresas e
LEFT JOIN public.user_empresas ue ON e.id = ue.empresa_id
LEFT JOIN public.customers c ON e.id = c.empresa_id
GROUP BY e.id, e.nome, e.cpf_cnpj
ORDER BY e.created_at DESC;

-- 4. Verificar usuários e suas empresas
SELECT 
  ue.user_id,
  ue.empresa_id,
  e.nome as empresa_nome,
  COUNT(c.id) as clientes_da_empresa
FROM public.user_empresas ue
JOIN public.empresas e ON ue.empresa_id = e.id
LEFT JOIN public.customers c ON ue.empresa_id = c.empresa_id
GROUP BY ue.user_id, ue.empresa_id, e.nome
ORDER BY ue.created_at DESC;

-- 5. Verificar se há clientes órfãos (sem empresa válida)
SELECT 
  c.id,
  c.name,
  c.empresa_id,
  c.created_at
FROM public.customers c
LEFT JOIN public.empresas e ON c.empresa_id = e.id
WHERE e.id IS NULL;

-- 6. Verificar histórico de alterações (se houver tabela de logs)
-- SELECT * FROM audit_log WHERE table_name = 'customers' ORDER BY created_at DESC;

-- 7. Verificar se há clientes com empresa_id NULL
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
WHERE empresa_id IS NULL;

-- 8. Verificar se há clientes com empresa_id inválido
SELECT 
  c.id,
  c.name,
  c.empresa_id,
  c.created_at
FROM public.customers c
WHERE c.empresa_id NOT IN (SELECT id FROM public.empresas);
