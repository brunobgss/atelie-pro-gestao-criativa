-- Remover constraint antiga de status
ALTER TABLE public.atelie_orders 
DROP CONSTRAINT IF EXISTS atelie_orders_status_check;

-- Adicionar nova constraint com todos os status permitidos
ALTER TABLE public.atelie_orders 
ADD CONSTRAINT atelie_orders_status_check 
CHECK (status IN (
    'Aguardando aprovação',
    'Em produção', 
    'Pronto',
    'Aguardando retirada',
    'Entregue',
    'Cancelado'
));

-- Verificar se a constraint foi aplicada (versão corrigida)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.atelie_orders'::regclass 
AND conname = 'atelie_orders_status_check';

-- Testar inserção com status Cancelado
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
    'Teste Cancelamento',
    '(11) 99999-9999',
    'Teste de cancelamento',
    100.00,
    0.00,
    'outro',
    CURRENT_DATE + INTERVAL '7 days',
    'Cancelado',
    (SELECT id FROM public.empresas LIMIT 1)
) RETURNING id, code, status;

-- Deletar o registro de teste
DELETE FROM public.atelie_orders 
WHERE code = 'TEST123';