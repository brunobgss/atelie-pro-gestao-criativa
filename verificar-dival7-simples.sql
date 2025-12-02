-- ============================================
-- VERIFICAR USUÁRIO: dival7@gmail.com
-- Execute APENAS este conteúdo no SQL Editor
-- ============================================

-- 1. Buscar ID do usuário
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'dival7@gmail.com';

-- 2. Verificar empresa associada (execute após obter o user_id acima)
-- Substitua 'USER_ID_AQUI' pelo user_id encontrado no passo 1
SELECT 
  ue.user_id,
  ue.empresa_id,
  ue.role,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.status,
  e.is_premium
FROM user_empresas ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = (
  SELECT id FROM auth.users WHERE email = 'dival7@gmail.com'
);

-- 3. Se não retornar nada no passo 2, verificar se existe empresa com esse email
SELECT 
  id,
  nome,
  email,
  telefone,
  status,
  is_premium
FROM empresas
WHERE email = 'dival7@gmail.com';

