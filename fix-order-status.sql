-- 🔧 VERIFICAR E CORRIGIR STATUS DOS PEDIDOS
-- Este script verifica os status permitidos e corrige se necessário

-- 1. Verificar estrutura da tabela atelie_orders
SELECT 'Estrutura da tabela:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'atelie_orders' 
AND column_name = 'status';

-- 2. Verificar se existe constraint de status
SELECT 'Constraints de status:' as info, conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'atelie_orders'::regclass 
AND conname LIKE '%status%';

-- 3. Verificar dados atuais
SELECT 'Status atuais:' as info, status, COUNT(*) as quantidade
FROM atelie_orders 
GROUP BY status;

-- 4. Atualizar status do pedido PED-002 para "Aguardando retirada"
UPDATE atelie_orders 
SET status = 'Aguardando retirada'
WHERE code = 'PED-002';

-- 5. Verificar se a atualização funcionou
SELECT 'Pedido atualizado:' as info, code, status, customer_name
FROM atelie_orders 
WHERE code = 'PED-002';

-- 6. Teste: tentar atualizar para "Entregue"
UPDATE atelie_orders 
SET status = 'Entregue'
WHERE code = 'PED-002';

-- 7. Verificar resultado final
SELECT 'Resultado final:' as info, code, status, customer_name
FROM atelie_orders 
WHERE code = 'PED-002';


