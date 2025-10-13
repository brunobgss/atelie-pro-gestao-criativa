-- 📊 VERIFICAR RECEITAS REGISTRADAS
-- Este script verifica se as receitas estão sendo registradas corretamente

-- 1. Verificar se a tabela atelie_receitas existe e tem dados
SELECT 'Receitas registradas:' as info, 
       COUNT(*) as total_receitas,
       SUM(amount) as valor_total
FROM atelie_receitas;

-- 2. Listar todas as receitas com detalhes
SELECT 'Detalhes das receitas:' as info,
       order_code,
       customer_name,
       amount,
       payment_date,
       status,
       description
FROM atelie_receitas 
ORDER BY payment_date DESC;

-- 3. Verificar pedidos entregues
SELECT 'Pedidos entregues:' as info,
       code,
       customer_name,
       value,
       status,
       updated_at
FROM atelie_orders 
WHERE status = 'Entregue'
ORDER BY updated_at DESC;

-- 4. Comparar: pedidos entregues vs receitas registradas
SELECT 
    'Comparação:' as info,
    o.code as pedido_codigo,
    o.customer_name as cliente,
    o.value as valor_pedido,
    r.amount as valor_receita,
    CASE 
        WHEN r.amount IS NULL THEN 'RECEITA NÃO REGISTRADA'
        WHEN o.value = r.amount THEN 'OK'
        ELSE 'VALORES DIFERENTES'
    END as status_comparacao
FROM atelie_orders o
LEFT JOIN atelie_receitas r ON o.code = r.order_code
WHERE o.status = 'Entregue'
ORDER BY o.updated_at DESC;


