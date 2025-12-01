-- Verificar usuário dival7@gmail.com e sua empresa associada
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar o ID do usuário no auth.users
SELECT 
  'Usuário encontrado:' as info,
  id as user_id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'dival7@gmail.com';

-- 2. Verificar se o usuário tem empresa associada
SELECT 
  'Associação usuário-empresa:' as info,
  ue.user_id,
  ue.empresa_id,
  ue.role,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.telefone,
  e.status as empresa_status,
  e.is_premium,
  e.trial_end_date
FROM user_empresas ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = (
  SELECT id FROM auth.users WHERE email = 'dival7@gmail.com'
);

-- 3. Se não houver associação, verificar se existe empresa com esse email
SELECT 
  'Empresa com email dival7@gmail.com:' as info,
  id,
  nome,
  email,
  telefone,
  status,
  is_premium,
  trial_end_date
FROM empresas
WHERE email = 'dival7@gmail.com';

-- 4. Verificar todas as empresas disponíveis (para referência)
SELECT 
  'Todas as empresas:' as info,
  id,
  nome,
  email,
  telefone,
  status,
  is_premium,
  created_at
FROM empresas
ORDER BY created_at DESC
LIMIT 10;

