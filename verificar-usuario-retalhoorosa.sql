-- Verificar status do trial para o usuário Retalhoorosa@gmail.com
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais do usuário
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  e.id as empresa_id,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.trial_end_date,
  e.created_at as empresa_created_at,
  CASE 
    WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
    WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
    ELSE 'ATIVO'
  END as status_trial,
  CASE 
    WHEN e.trial_end_date IS NOT NULL 
    THEN EXTRACT(DAYS FROM (e.trial_end_date - NOW()))
    ELSE NULL
  END as dias_restantes
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email = 'Retalhoorosa@gmail.com';

-- 2. Verificar se existe associação user_empresas
SELECT 
  ue.user_id,
  ue.empresa_id,
  ue.created_at as associacao_created_at
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
WHERE u.email = 'Retalhoorosa@gmail.com';

-- 3. Verificar dados da empresa diretamente
SELECT 
  e.id,
  e.nome,
  e.email,
  e.trial_end_date,
  e.created_at,
  e.updated_at
FROM empresas e
WHERE e.email = 'Retalhoorosa@gmail.com' 
   OR e.nome ILIKE '%retalhoorosa%';