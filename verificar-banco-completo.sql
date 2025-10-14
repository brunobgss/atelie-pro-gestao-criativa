-- VERIFICAÇÃO COMPLETA DO BANCO DE DADOS
-- Execute no Supabase SQL Editor

-- 1. Verificar tabelas principais
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('empresas', 'user_empresas', 'customers', 'atelie_orders', 'atelie_quotes', 'atelie_quote_items', 'inventory_items', 'atelie_receitas') 
    THEN '✅ EXISTE'
    ELSE '❌ FALTANDO'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('empresas', 'user_empresas', 'customers', 'atelie_orders', 'atelie_quotes', 'atelie_quote_items', 'inventory_items', 'atelie_receitas')
ORDER BY table_name;

-- 2. Verificar colunas da tabela empresas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'empresas' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar colunas da tabela customers
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('empresas', 'user_empresas', 'customers', 'atelie_orders', 'atelie_quotes', 'atelie_quote_items', 'inventory_items', 'atelie_receitas')
ORDER BY tablename, policyname;

-- 5. Verificar dados de teste
SELECT 'empresas' as tabela, COUNT(*) as total_registros FROM empresas
UNION ALL
SELECT 'user_empresas' as tabela, COUNT(*) as total_registros FROM user_empresas
UNION ALL
SELECT 'customers' as tabela, COUNT(*) as total_registros FROM customers
UNION ALL
SELECT 'atelie_orders' as tabela, COUNT(*) as total_registros FROM atelie_orders
UNION ALL
SELECT 'atelie_quotes' as tabela, COUNT(*) as total_registros FROM atelie_quotes
UNION ALL
SELECT 'inventory_items' as tabela, COUNT(*) as total_registros FROM inventory_items
UNION ALL
SELECT 'atelie_receitas' as tabela, COUNT(*) as total_registros FROM atelie_receitas;

-- 6. Verificar se há dados de usuário real
SELECT 
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.cpf_cnpj,
  e.telefone,
  e.trial_end_date,
  ue.user_id
FROM empresas e
JOIN user_empresas ue ON e.id = ue.empresa_id
LIMIT 5;

-- 7. Verificar se customers tem dados reais
SELECT 
  c.name,
  c.phone,
  c.email,
  c.created_at
FROM customers c
ORDER BY c.created_at DESC
LIMIT 5;
