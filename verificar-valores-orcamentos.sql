-- 🔍 VERIFICAR VALORES DOS ORÇAMENTOS NO BANCO
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela atelie_quotes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_quotes'
ORDER BY ordinal_position;

-- 2. Verificar dados na tabela atelie_quotes
SELECT 
    id,
    code,
    customer_name,
    total_value,
    status,
    created_at
FROM public.atelie_quotes
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há orçamentos com total_value NULL ou 0
SELECT 
    COUNT(*) as total_quotes,
    COUNT(total_value) as with_total_value,
    COUNT(*) - COUNT(total_value) as without_total_value,
    COUNT(CASE WHEN total_value = 0 THEN 1 END) as zero_value,
    COUNT(CASE WHEN total_value > 0 THEN 1 END) as positive_value
FROM public.atelie_quotes;

-- 4. Verificar itens dos orçamentos
SELECT 
    q.code as quote_code,
    q.total_value as quote_total,
    qi.description,
    qi.quantity,
    qi.unit_value,
    (qi.quantity * qi.unit_value) as item_total
FROM public.atelie_quotes q
LEFT JOIN public.atelie_quote_items qi ON q.id = qi.quote_id
ORDER BY q.created_at DESC
LIMIT 10;

-- 5. Verificar se há inconsistências entre total_value e soma dos itens
SELECT 
    q.code,
    q.total_value as stored_total,
    COALESCE(SUM(qi.quantity * qi.unit_value), 0) as calculated_total,
    CASE 
        WHEN q.total_value = COALESCE(SUM(qi.quantity * qi.unit_value), 0) THEN 'OK'
        ELSE 'INCONSISTENTE'
    END as status
FROM public.atelie_quotes q
LEFT JOIN public.atelie_quote_items qi ON q.id = qi.quote_id
GROUP BY q.id, q.code, q.total_value
ORDER BY q.created_at DESC
LIMIT 10;

