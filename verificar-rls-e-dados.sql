-- 🔍 VERIFICAR STATUS DO RLS E DADOS DOS ORÇAMENTOS
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se RLS está ativo nas tabelas atelie_*
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename LIKE 'atelie_%'
ORDER BY tablename;

-- 2. Verificar dados na tabela atelie_quotes
SELECT 
    'Dados na tabela atelie_quotes:' as info,
    COUNT(*) as total_quotes
FROM public.atelie_quotes;

-- 3. Mostrar alguns registros de exemplo
SELECT 
    id,
    code,
    customer_name,
    customer_phone,
    date,
    observations,
    total_value,
    status,
    empresa_id
FROM public.atelie_quotes
LIMIT 5;

-- 4. Verificar se há problemas com empresa_id
SELECT 
    'Verificando empresa_id:' as info,
    COUNT(*) as total,
    COUNT(empresa_id) as with_empresa_id,
    COUNT(*) - COUNT(empresa_id) as without_empresa_id
FROM public.atelie_quotes;

-- 5. Verificar políticas RLS específicas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'atelie_%'
ORDER BY tablename, policyname;

