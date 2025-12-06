-- =====================================================
-- SCRIPT PARA RESETAR TRIAL DE 7 DIAS
-- Usuário: estampariasuprema@gmail.com
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. VERIFICAR DADOS ATUAIS DO USUÁRIO
SELECT 
  u.id as user_id,
  u.email,
  e.id as empresa_id,
  e.nome as empresa_nome,
  e.trial_end_date as trial_atual,
  e.status as status_atual,
  e.is_premium,
  e.created_at,
  CASE 
    WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
    WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
    ELSE 'ATIVO'
  END as status_trial_atual,
  CASE 
    WHEN e.trial_end_date IS NOT NULL 
    THEN EXTRACT(DAYS FROM (e.trial_end_date - NOW()))::INTEGER
    ELSE NULL
  END as dias_restantes_atual
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE u.email = 'estampariasuprema@gmail.com';

-- 2. RESETAR TRIAL PARA 7 DIAS A PARTIR DE AGORA
-- IMPORTANTE: Existe um trigger que calcula o trial baseado em created_at + 7 dias
-- Por isso, precisamos atualizar o created_at também para resetar o período
-- Método 1: Atualizar diretamente pelo ID da empresa (mais confiável)
-- Desabilita o trigger temporariamente para evitar que ele reverta as mudanças
ALTER TABLE public.empresas DISABLE TRIGGER sync_empresa_status_trigger;

UPDATE public.empresas 
SET 
  created_at = NOW(),  -- Reseta o created_at para agora (início do novo trial)
  trial_end_date = NOW() + INTERVAL '7 days',  -- 7 dias a partir de agora
  status = 'trial',  -- Define como trial
  updated_at = NOW()
WHERE id = '73a38f8a-dbc4-45fc-9c91-fff86d979fa1'
  AND (is_premium IS NULL OR is_premium = false);  -- Só atualiza se não for premium

-- Reabilita o trigger
ALTER TABLE public.empresas ENABLE TRIGGER sync_empresa_status_trigger;

-- Método 2 (alternativo - se o método 1 não funcionar): Atualizar apenas created_at
-- e deixar o trigger recalcular o resto
-- ALTER TABLE public.empresas DISABLE TRIGGER sync_empresa_status_trigger;
-- UPDATE public.empresas 
-- SET created_at = NOW(), updated_at = NOW()
-- WHERE id = '73a38f8a-dbc4-45fc-9c91-fff86d979fa1'
--   AND (is_premium IS NULL OR is_premium = false);
-- ALTER TABLE public.empresas ENABLE TRIGGER sync_empresa_status_trigger;

-- Método 2 (alternativo): Atualizar pelo email do usuário
-- UPDATE public.empresas 
-- SET 
--   trial_end_date = NOW() + INTERVAL '7 days',
--   status = CASE 
--     WHEN is_premium = true THEN status
--     ELSE 'trial'
--   END,
--   updated_at = NOW()
-- WHERE id IN (
--   SELECT e.id 
--   FROM auth.users u
--   JOIN public.user_empresas ue ON u.id = ue.user_id
--   JOIN public.empresas e ON ue.empresa_id = e.id
--   WHERE u.email = 'estampariasuprema@gmail.com'
-- );

-- 3. VERIFICAR RESULTADO APÓS RESET
SELECT 
  u.id as user_id,
  u.email,
  e.id as empresa_id,
  e.nome as empresa_nome,
  e.trial_end_date as novo_trial_end_date,
  e.status as novo_status,
  e.is_premium,
  CASE 
    WHEN e.trial_end_date IS NULL THEN 'SEM TRIAL'
    WHEN e.trial_end_date < NOW() THEN 'EXPIRADO'
    ELSE 'ATIVO'
  END as status_trial_novo,
  EXTRACT(DAYS FROM (e.trial_end_date - NOW()))::INTEGER as dias_restantes,
  TO_CHAR(e.trial_end_date, 'DD/MM/YYYY HH24:MI:SS') as data_expiracao_formatada
FROM auth.users u
LEFT JOIN public.user_empresas ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE u.email = 'estampariasuprema@gmail.com';

-- ✅ RESULTADO ESPERADO:
-- - trial_end_date: 7 dias a partir de agora
-- - status: 'trial' (se não for premium)
-- - dias_restantes: ~7 dias

