-- Script SQL para corrigir usuários sem perfil na tabela profiles
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar usuários sem perfil
SELECT 
  au.id as user_id,
  au.email as auth_email,
  p.id as profile_id,
  e.nome as empresa_nome,
  e.responsavel,
  e.email as empresa_email
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_empresas ue ON au.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE p.id IS NULL;

-- 2. Criar perfis para usuários que não têm
INSERT INTO profiles (user_id, email, full_name)
SELECT 
  au.id,
  COALESCE(au.email, e.email, 'sem-email@exemplo.com'),
  COALESCE(e.responsavel, e.nome, 'Usuário')
FROM auth.users au
LEFT JOIN user_empresas ue ON au.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.id IS NULL
  AND ue.empresa_id IS NOT NULL;

-- 3. Verificar se a correção funcionou
SELECT 
  au.email as auth_email,
  p.email as profile_email,
  p.full_name,
  e.nome as empresa_nome
FROM auth.users au
JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_empresas ue ON au.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
ORDER BY au.email;
