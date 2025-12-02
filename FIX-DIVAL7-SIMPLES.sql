-- ============================================
-- ASSOCIAR dival7@gmail.com À EMPRESA "Bainha EXpress"
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Verificar se o usuário existe
SELECT 
  'Usuário:' as info,
  id as user_id,
  email
FROM auth.users
WHERE email = 'dival7@gmail.com';

-- Verificar associação atual
SELECT 
  'Associação atual:' as info,
  ue.user_id,
  ue.empresa_id,
  e.nome as empresa_nome,
  e.email as empresa_email
FROM user_empresas ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = (
  SELECT id FROM auth.users WHERE email = 'dival7@gmail.com'
);

-- Criar associação (execute apenas se não houver associação acima)
INSERT INTO user_empresas (user_id, empresa_id, role)
SELECT 
  u.id as user_id,
  '809a0c50-6907-443f-b962-2ce11582a2f9' as empresa_id, -- ID da empresa "Bainha EXpress"
  'owner' as role
FROM auth.users u
WHERE u.email = 'dival7@gmail.com'
AND NOT EXISTS (
  SELECT 1 
  FROM user_empresas ue 
  WHERE ue.user_id = u.id 
  AND ue.empresa_id = '809a0c50-6907-443f-b962-2ce11582a2f9'
);

-- Verificar resultado final
SELECT 
  'Resultado final:' as info,
  u.email as usuario_email,
  ue.empresa_id,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.status,
  e.is_premium,
  ue.role
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email = 'dival7@gmail.com';

