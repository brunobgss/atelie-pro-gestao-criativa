-- 🔧 ATUALIZAR TABELA ATELIE_RECEITAS COM STATUS DE PAGAMENTO
-- Este script adiciona/atualiza o campo status para controlar pagamentos

-- 1. Verificar estrutura atual da tabela
SELECT 'Estrutura atual:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'atelie_receitas' 
AND column_name = 'status';

-- 2. Atualizar constraint de status para incluir status de pagamento
ALTER TABLE atelie_receitas DROP CONSTRAINT IF EXISTS atelie_receitas_status_check;

ALTER TABLE atelie_receitas ADD CONSTRAINT atelie_receitas_status_check 
CHECK (status IN (
    'realizada',  -- Receita registrada automaticamente
    'pago',       -- Pagamento completo
    'pendente',   -- Aguardando pagamento
    'parcial'     -- Pagamento parcial
));

-- 3. Atualizar receitas existentes para ter status correto
UPDATE atelie_receitas 
SET status = 'realizada'
WHERE status IS NULL OR status = '';

-- 4. Verificar receitas atualizadas
SELECT 'Receitas atualizadas:' as info,
       order_code,
       customer_name,
       amount,
       status,
       payment_date
FROM atelie_receitas 
ORDER BY payment_date DESC;

-- 5. Teste: atualizar status de uma receita
UPDATE atelie_receitas 
SET status = 'pago'
WHERE order_code = 'PED-002';

-- 6. Verificar resultado do teste
SELECT 'Teste de atualização:' as info,
       order_code,
       customer_name,
       amount,
       status
FROM atelie_receitas 
WHERE order_code = 'PED-002';


