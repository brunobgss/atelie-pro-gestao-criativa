-- Verificar dados do usuário brunobgs1888@gmail.com
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a empresa existe e tem os dados corretos
SELECT 
  e.id,
  e.nome,
  e.email,
  e.telefone,
  e.responsavel,
  e.cpf_cnpj,
  e.created_at,
  e.updated_at
FROM empresas e
WHERE e.email = 'brunobgs1888@gmail.com';

-- 2. Verificar se o usuário está vinculado à empresa
SELECT 
  ue.user_id,
  ue.empresa_id,
  ue.role,
  e.nome as empresa_nome,
  e.cpf_cnpj,
  e.telefone
FROM user_empresas ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE e.email = 'brunobgs1888@gmail.com';

-- 3. Verificar o usuário no auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'brunobgs1888@gmail.com';
