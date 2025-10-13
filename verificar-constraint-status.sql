-- Verificar a constraint atual de status (versão corrigida)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.atelie_orders'::regclass 
AND conname LIKE '%status%';

-- Verificar quais status são permitidos
SELECT DISTINCT status 
FROM public.atelie_orders 
WHERE status IS NOT NULL;

-- Verificar se existe constraint de status usando information_schema
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'atelie_orders' 
AND tc.constraint_type = 'CHECK';
