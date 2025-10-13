-- 🔍 VERIFICAR ESTRUTURA DA TABELA atelie_orders
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela atelie_orders
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_orders'
ORDER BY ordinal_position;

-- 2. Verificar se a coluna 'paid' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'atelie_orders' 
            AND column_name = 'paid'
        ) THEN 'Coluna "paid" existe'
        ELSE 'Coluna "paid" NÃO existe'
    END as status_paid;

-- 3. Verificar se a coluna 'paid_value' existe (não deveria)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'atelie_orders' 
            AND column_name = 'paid_value'
        ) THEN 'Coluna "paid_value" existe (PROBLEMA!)'
        ELSE 'Coluna "paid_value" NÃO existe (OK)'
    END as status_paid_value;

-- 4. Se a coluna 'paid' não existir, criar ela
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'atelie_orders' 
        AND column_name = 'paid'
    ) THEN
        ALTER TABLE public.atelie_orders ADD COLUMN paid DECIMAL(10,2) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Coluna "paid" adicionada à tabela atelie_orders.';
    ELSE
        RAISE NOTICE 'Coluna "paid" já existe na tabela atelie_orders.';
    END IF;
END $$;

-- 5. Verificar alguns registros de exemplo
SELECT 
    id,
    code,
    customer_name,
    value,
    paid,
    status,
    created_at
FROM public.atelie_orders
ORDER BY created_at DESC
LIMIT 5;

