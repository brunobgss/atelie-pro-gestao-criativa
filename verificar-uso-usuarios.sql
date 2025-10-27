-- Script para verificar se os usuários cadastrados estão realmente usando o app
-- Execute no Supabase SQL Editor

-- 1. VISÃO GERAL: Total de usuários cadastrados vs usuários ativos
SELECT 
  'Total de usuários cadastrados' as metrica,
  COUNT(DISTINCT u.id) as valor
FROM auth.users u
UNION ALL
SELECT 
  'Total de empresas criadas',
  COUNT(DISTINCT e.id)
FROM public.empresas e
UNION ALL
SELECT 
  'Total de empresas com clientes',
  COUNT(DISTINCT e.id)
FROM public.empresas e
WHERE e.id IN (SELECT DISTINCT empresa_id FROM public.customers WHERE empresa_id IS NOT NULL)
UNION ALL
SELECT 
  'Total de empresas com pedidos',
  COUNT(DISTINCT e.id)
FROM public.empresas e
WHERE e.id IN (SELECT DISTINCT empresa_id FROM public.atelie_orders WHERE empresa_id IS NOT NULL)
UNION ALL
SELECT 
  'Total de empresas com orçamentos',
  COUNT(DISTINCT e.id)
FROM public.empresas e
WHERE e.id IN (SELECT DISTINCT empresa_id FROM public.atelie_quotes WHERE empresa_id IS NOT NULL);

-- 2. DETALHAMENTO POR USUÁRIO: Última atividade e engajamento
SELECT 
  au.email as usuario_email,
  au.created_at as data_cadastro,
  e.nome as empresa_nome,
  e.created_at as empresa_criada_em,
  e.trial_expires_at as trial_expira_em,
  e.is_premium,
  (SELECT COUNT(*) FROM public.customers c WHERE c.empresa_id = e.id) as total_clientes,
  (SELECT MAX(c.created_at) FROM public.customers c WHERE c.empresa_id = e.id) as ultimo_cliente_criado,
  (SELECT COUNT(*) FROM public.atelie_orders o WHERE o.empresa_id = e.id) as total_pedidos,
  (SELECT MAX(o.created_at) FROM public.atelie_orders o WHERE o.empresa_id = e.id) as ultimo_pedido,
  (SELECT COUNT(*) FROM public.atelie_quotes q WHERE q.empresa_id = e.id) as total_orcamentos,
  (SELECT MAX(q.created_at) FROM public.atelie_quotes q WHERE q.empresa_id = e.id) as ultimo_orcamento
FROM auth.users au
JOIN public.user_empresas ue ON au.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
ORDER BY e.created_at DESC;

-- 3. ANÁLISE DE ENGAGAMENTO: Classificação dos usuários
SELECT 
  CASE 
    WHEN e.is_premium = true THEN '🎯 Premium'
    WHEN e.trial_expires_at > NOW() THEN '⏳ Trial Ativo'
    WHEN e.trial_expires_at < NOW() THEN '❌ Trial Expirado'
  END as status_conta,
  COUNT(DISTINCT e.id) as total_empresas,
  COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id) THEN e.id END) as empresas_com_clientes,
  COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id) THEN e.id END) as empresas_com_pedidos,
  COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id) THEN e.id END) as empresas_com_orcamentos
FROM public.empresas e
GROUP BY status_conta
ORDER BY total_empresas DESC;

-- 4. USUÁRIOS INATIVOS: Cadastrados mas nunca usaram
SELECT 
  au.email as usuario_inativo,
  au.created_at as cadastrado_em,
  e.nome as empresa_nome,
  CASE 
    WHEN e.trial_expires_at > NOW() THEN 'Trial ativo'
    ELSE 'Trial expirado'
  END as status_trial
FROM auth.users au
JOIN public.user_empresas ue ON au.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id)
ORDER BY au.created_at DESC;

-- 5. USUÁRIOS MAIS ATIVOS: Top usuários por engajamento
SELECT 
  au.email as usuario,
  e.nome as empresa,
  (
    (SELECT COUNT(*) FROM public.customers WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_orders WHERE empresa_id = e.id) +
    (SELECT COUNT(*) FROM public.atelie_quotes WHERE empresa_id = e.id)
  ) as nivel_engajamento,
  e.is_premium,
  e.trial_expires_at
FROM auth.users au
JOIN public.user_empresas ue ON au.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id) OR
  EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id) OR
  EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id)
)
ORDER BY nivel_engajamento DESC;

-- 6. TIMELINE DE ATIVIDADE: Quando os usuários mais ativos estão usando
SELECT 
  e.nome as empresa,
  au.email as usuario,
  (
    SELECT MAX(GREATEST(
      COALESCE((SELECT MAX(c.created_at) FROM public.customers c WHERE c.empresa_id = e.id), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(o.created_at) FROM public.atelie_orders o WHERE o.empresa_id = e.id), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(q.created_at) FROM public.atelie_quotes q WHERE q.empresa_id = e.id), '1970-01-01'::timestamptz)
    ))
  ) as ultima_atividade,
  CASE 
    WHEN (
      SELECT MAX(GREATEST(
        COALESCE((SELECT MAX(c.created_at) FROM public.customers c WHERE c.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(o.created_at) FROM public.atelie_orders o WHERE o.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(q.created_at) FROM public.atelie_quotes q WHERE q.empresa_id = e.id), '1970-01-01'::timestamptz)
      ))
    ) > NOW() - INTERVAL '24 hours' THEN '🟢 Ativo hoje'
    WHEN (
      SELECT MAX(GREATEST(
        COALESCE((SELECT MAX(c.created_at) FROM public.customers c WHERE c.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(o.created_at) FROM public.atelie_orders o WHERE o.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(q.created_at) FROM public.atelie_quotes q WHERE q.empresa_id = e.id), '1970-01-01'::timestamptz)
      ))
    ) > NOW() - INTERVAL '7 days' THEN '🟡 Ativo na semana'
    WHEN (
      SELECT MAX(GREATEST(
        COALESCE((SELECT MAX(c.created_at) FROM public.customers c WHERE c.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(o.created_at) FROM public.atelie_orders o WHERE o.empresa_id = e.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(q.created_at) FROM public.atelie_quotes q WHERE q.empresa_id = e.id), '1970-01-01'::timestamptz)
      ))
    ) > NOW() - INTERVAL '30 days' THEN '🟠 Ativo no mês'
    ELSE '🔴 Inativo há mais de 30 dias'
  END as status
FROM public.empresas e
JOIN public.user_empresas ue ON e.id = ue.empresa_id
JOIN auth.users au ON ue.user_id = au.id
WHERE EXISTS (SELECT 1 FROM public.customers c WHERE c.empresa_id = e.id)
   OR EXISTS (SELECT 1 FROM public.atelie_orders o WHERE o.empresa_id = e.id)
   OR EXISTS (SELECT 1 FROM public.atelie_quotes q WHERE q.empresa_id = e.id)
ORDER BY ultima_atividade DESC;

