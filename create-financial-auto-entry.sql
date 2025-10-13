-- 💰 CRIAR TABELA DE RECEITAS PARA ATELIÊ PRO
-- Esta tabela registrará automaticamente as receitas quando pedidos são entregues

-- 1. Criar tabela de receitas específica para Ateliê Pro
CREATE TABLE IF NOT EXISTS atelie_receitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    order_id UUID REFERENCES atelie_orders(id),
    order_code VARCHAR(50),
    customer_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'dinheiro',
    payment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'realizada',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE atelie_receitas ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS
DROP POLICY IF EXISTS "Users can view receitas from their empresa" ON atelie_receitas;
CREATE POLICY "Users can view receitas from their empresa" ON atelie_receitas
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert receitas for their empresa" ON atelie_receitas;
CREATE POLICY "Users can insert receitas for their empresa" ON atelie_receitas
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update receitas for their empresa" ON atelie_receitas;
CREATE POLICY "Users can update receitas for their empresa" ON atelie_receitas
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- 4. Criar função para registrar receita automaticamente
CREATE OR REPLACE FUNCTION registrar_receita_entrega()
RETURNS TRIGGER AS $$
BEGIN
    -- Só registrar se o status mudou para "Entregue"
    IF NEW.status = 'Entregue' AND OLD.status != 'Entregue' THEN
        INSERT INTO atelie_receitas (
            empresa_id,
            order_id,
            order_code,
            customer_name,
            description,
            amount,
            payment_method,
            payment_date,
            status
        ) VALUES (
            NEW.empresa_id,
            NEW.id,
            NEW.code,
            NEW.customer_name,
            'Receita de pedido entregue: ' || NEW.description,
            NEW.value,
            'dinheiro', -- Método padrão, pode ser alterado depois
            CURRENT_DATE,
            'realizada'
        );
        
        RAISE NOTICE 'Receita registrada automaticamente para pedido %', NEW.code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para executar automaticamente
DROP TRIGGER IF EXISTS trigger_registrar_receita ON atelie_orders;
CREATE TRIGGER trigger_registrar_receita
    AFTER UPDATE ON atelie_orders
    FOR EACH ROW
    EXECUTE FUNCTION registrar_receita_entrega();

-- 6. Teste: atualizar um pedido para "Entregue" para testar
UPDATE atelie_orders 
SET status = 'Entregue'
WHERE code = 'PED-002';

-- 7. Verificar se a receita foi registrada
SELECT 'Receita registrada:' as info, 
       order_code, 
       customer_name, 
       amount, 
       payment_date, 
       status
FROM atelie_receitas 
WHERE order_code = 'PED-002';

-- 8. Listar todas as receitas
SELECT 'Todas as receitas:' as info, 
       order_code, 
       customer_name, 
       amount, 
       payment_date, 
       status
FROM atelie_receitas 
ORDER BY payment_date DESC;


