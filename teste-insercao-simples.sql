-- 🔧 TESTE SIMPLES DE INSERÇÃO
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da coluna code
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_orders'
AND column_name = 'code';

-- 2. Teste simples de inserção
INSERT INTO public.atelie_orders (
    code,
    customer_name,
    customer_phone,
    description,
    value,
    paid,
    type,
    delivery_date,
    status,
    empresa_id
) VALUES (
    'TEST123',
    'Teste',
    '(11) 99999-9999',
    'Teste simples',
    100.00,
    0.00,
    'outro',
    CURRENT_DATE + INTERVAL '7 days',
    'Aguardando aprovação',
    (SELECT id FROM public.empresas LIMIT 1)
) RETURNING id, code;

-- 3. Deletar o teste
DELETE FROM public.atelie_orders WHERE code = 'TEST123';

-- 4. Verificar se a coluna paid existe e funciona
SELECT 
    'Coluna paid existe:' as info,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'atelie_orders' 
        AND column_name = 'paid'
    ) as paid_exists;
