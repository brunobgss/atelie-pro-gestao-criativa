-- Script para verificar clientes no banco de dados
-- Execute no Supabase SQL Editor

-- 1. Verificar se a tabela customers existe
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'customers' AND table_schema = 'public';

-- 2. Verificar estrutura da tabela customers
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Contar total de clientes
SELECT COUNT(*) as total_clientes FROM public.customers;

-- 4. Verificar clientes com empresa_id
SELECT 
  COUNT(*) as clientes_com_empresa,
  COUNT(empresa_id) as clientes_com_empresa_id,
  COUNT(*) - COUNT(empresa_id) as clientes_sem_empresa_id
FROM public.customers;

-- 5. Mostrar todos os clientes com seus empresa_id
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
ORDER BY created_at DESC;

-- 6. Verificar empresas disponíveis
SELECT 
  id,
  nome,
  cpf_cnpj,
  created_at
FROM public.empresas
ORDER BY created_at DESC;

-- 7. Verificar associação usuário-empresa
SELECT 
  ue.user_id,
  ue.empresa_id,
  e.nome as empresa_nome
FROM public.user_empresas ue
JOIN public.empresas e ON ue.empresa_id = e.id
ORDER BY ue.created_at DESC;

-- 8. Verificar se há clientes órfãos (sem empresa_id válida)
SELECT 
  c.id,
  c.name,
  c.empresa_id,
  c.created_at
FROM public.customers c
LEFT JOIN public.empresas e ON c.empresa_id = e.id
WHERE e.id IS NULL;





