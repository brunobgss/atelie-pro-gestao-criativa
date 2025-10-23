-- Script simplificado para investigar clientes
-- Execute no Supabase SQL Editor

-- 1. Mostrar todos os clientes existentes
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
ORDER BY created_at DESC;

-- 2. Verificar empresas disponíveis
SELECT 
  id,
  nome,
  cpf_cnpj,
  created_at
FROM public.empresas
ORDER BY created_at DESC;

-- 3. Verificar associação usuário-empresa
SELECT 
  ue.user_id,
  ue.empresa_id,
  e.nome as empresa_nome
FROM public.user_empresas ue
JOIN public.empresas e ON ue.empresa_id = e.id
ORDER BY ue.created_at DESC;





