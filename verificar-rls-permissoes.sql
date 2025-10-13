-- 🔒 VERIFICAR RLS E PERMISSÕES
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se RLS está ativo
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename = 'atelie_orders';

-- 2. Verificar políticas RLS específicas
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
AND tablename = 'atelie_orders'
ORDER BY policyname;

-- 3. Testar inserção com usuário atual
SELECT 
    'Testando inserção com usuário atual:' as info,
    auth.uid() as current_user_id;

-- 4. Verificar se conseguimos inserir (teste simples)
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Tentar inserir um registro de teste
    INSERT INTO public.atelie_orders (
        code,
        customer_name,
        customer_phone,
        description,
        value,
        paid,
        delivery_date,
        status,
        empresa_id
    ) VALUES (
        'RLS-TEST-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::text, -10),
        'Teste RLS',
        '(11) 99999-9999',
        'Teste de RLS',
        50.00,
        0.00,
        (CURRENT_DATE + INTERVAL '7 days')::date,
        'Aguardando aprovação',
        (SELECT id FROM public.empresas LIMIT 1)
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Inserção bem-sucedida! ID: %', test_id;
    
    -- Deletar o registro de teste
    DELETE FROM public.atelie_orders WHERE id = test_id;
    RAISE NOTICE 'Registro de teste deletado.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na inserção: %', SQLERRM;
END $$;
