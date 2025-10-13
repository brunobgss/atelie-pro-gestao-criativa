-- 🔄 FORÇAR ATUALIZAÇÃO DO SCHEMA CACHE
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a coluna 'paid' realmente existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_orders'
AND column_name = 'paid';

-- 2. Fazer uma operação simples para forçar refresh do cache
SELECT COUNT(*) as total_orders FROM public.atelie_orders;

-- 3. Verificar se conseguimos inserir um registro de teste (depois deletar)
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
    'TEST-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::text, -10),
    'Teste Cache',
    '(11) 99999-9999',
    'Teste de cache',
    100.00,
    0.00,
    (CURRENT_DATE + INTERVAL '7 days')::date,
    'Aguardando aprovação',
    (SELECT id FROM public.empresas LIMIT 1)
) RETURNING id, code;

-- 4. Deletar o registro de teste
DELETE FROM public.atelie_orders 
WHERE code LIKE 'TEST-%';

-- 5. Verificar estrutura final
SELECT 
    'Estrutura da tabela atelie_orders:' as info,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_orders';
