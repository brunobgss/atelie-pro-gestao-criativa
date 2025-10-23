-- Script para verificar e corrigir trial de todos os usuários
-- Execute este script no Supabase SQL Editor

-- 1. Verificar status atual de todos os usuários
SELECT 
  u.id as user_id,
  u.email,
  e.nome as empresa_nome,
  e.trial_end_date,
  e.created_at,
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
ORDER BY e.created_at DESC;

-- 2. Corrigir trial para usuários que não têm trial_end_date ou estão expirados
UPDATE empresas 
SET trial_end_date = NOW() + INTERVAL '7 days'
WHERE id IN (
  SELECT e.id 
  FROM auth.users u
  JOIN user_empresas ue ON u.id = ue.user_id
  JOIN empresas e ON ue.empresa_id = e.id
  WHERE (e.trial_end_date IS NULL OR e.trial_end_date < NOW())
);

-- 3. Verificar se a correção foi aplicada
SELECT 
  u.id as user_id,
  u.email,
  e.nome as empresa_nome,
  e.trial_end_date,
  CASE 
    WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
    WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
    ELSE 'ATIVO'
  END as status_trial,
  EXTRACT(DAYS FROM (e.trial_end_date - NOW())) as dias_restantes
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
ORDER BY e.created_at DESC;