-- 🔧 CORRIGIR CONSTRAINT DE STATUS NA TABELA ATELIE_ORDERS
-- Este script corrige a constraint para permitir todos os status necessários

-- 1. Verificar constraint atual
SELECT 'Constraint atual:' as info, 
       conname, 
       pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'atelie_orders'::regclass 
AND conname LIKE '%status%';

-- 2. Remover constraint antiga
ALTER TABLE atelie_orders DROP CONSTRAINT IF EXISTS atelie_orders_status_check;

-- 3. Criar nova constraint com todos os status necessários
ALTER TABLE atelie_orders ADD CONSTRAINT atelie_orders_status_check 
CHECK (status IN (
    'Aguardando aprovação',
    'Em produção', 
    'Pronto',
    'Aguardando retirada',
    'Entregue'
));

-- 4. Verificar se a constraint foi criada
SELECT 'Nova constraint:' as info, 
       conname, 
       pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'atelie_orders'::regclass 
AND conname LIKE '%status%';

-- 5. Teste: atualizar pedido para "Aguardando retirada"
UPDATE atelie_orders 
SET status = 'Aguardando retirada'
WHERE code = 'PED-002';

-- 6. Verificar se funcionou
SELECT 'Pedido atualizado:' as info, code, status, customer_name
FROM atelie_orders 
WHERE code = 'PED-002';

-- 7. Teste: atualizar para "Entregue"
UPDATE atelie_orders 
SET status = 'Entregue'
WHERE code = 'PED-002';

-- 8. Verificar resultado final
SELECT 'Resultado final:' as info, code, status, customer_name
FROM atelie_orders 
WHERE code = 'PED-002';


