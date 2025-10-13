-- Verificar vinculação usuário-empresa
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o usuário está vinculado à empresa
SELECT 
  ue.user_id,
  ue.empresa_id,
  ue.role,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.cpf_cnpj,
  e.telefone
FROM user_empresas ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE e.email = 'brunobgs1888@gmail.com';

-- 2. Verificar o ID do usuário no auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'brunobgs1888@gmail.com';

-- 3. Se não houver vinculação, criar uma
-- (Execute apenas se o primeiro SELECT não retornar nada)
INSERT INTO user_empresas (user_id, empresa_id, role)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'brunobgs1888@gmail.com'),
  (SELECT id FROM empresas WHERE email = 'brunobgs1888@gmail.com'),
  'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM user_empresas ue
  JOIN empresas e ON ue.empresa_id = e.id
  WHERE e.email = 'brunobgs1888@gmail.com'
);
