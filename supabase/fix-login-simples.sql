-- SOLUÇÃO RÁPIDA: Corrigir login
-- Execute este script no SQL Editor do Supabase

-- Substitua 'seuemail@gmail.com' pelo seu email real
WITH user_data AS (
  SELECT id FROM auth.users WHERE email = 'seuemail@gmail.com'
),
empresa_criada AS (
  INSERT INTO empresas (nome, email, responsavel)
  SELECT 'Minha Empresa', 'seuemail@gmail.com', 'Usuário'
  FROM user_data
  RETURNING id
)
INSERT INTO user_empresas (user_id, empresa_id, role)
SELECT ud.id, ec.id, 'owner'
FROM user_data ud, empresa_criada ec;

-- Verificar se funcionou
SELECT 
  au.email,
  e.nome as empresa_nome,
  ue.role
FROM auth.users au
JOIN user_empresas ue ON au.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id
WHERE au.email = 'seuemail@gmail.com';


