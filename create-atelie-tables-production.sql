-- =====================================================
-- CRIAÇÃO DAS TABELAS DO ATELIÊ PRO PARA PRODUÇÃO
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de Orçamentos do Ateliê
CREATE TABLE IF NOT EXISTS atelie_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    observations TEXT,
    total_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Itens dos Orçamentos
CREATE TABLE IF NOT EXISTS atelie_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES atelie_quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atelie_quote_personalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES atelie_quotes(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    person_name TEXT NOT NULL,
    size TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Pedidos do Ateliê
CREATE TABLE IF NOT EXISTS atelie_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    type VARCHAR(50) DEFAULT 'outro',
    description TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid DECIMAL(10,2) DEFAULT 0,
    delivery_date DATE,
    status VARCHAR(30) DEFAULT 'Aguardando aprovação' CHECK (
        status IN (
            'Aguardando aprovação',
            'Em produção',
            'Finalizando',
            'Pronto',
            'Aguardando retirada',
            'Entregue',
            'Cancelado'
        )
    ),
    observations TEXT,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atelie_order_personalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES atelie_orders(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    person_name TEXT NOT NULL,
    size TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_status_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    status_key TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (empresa_id, status_key)
);

-- 4. Tabela de Clientes do Ateliê
CREATE TABLE IF NOT EXISTS atelie_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Receitas do Ateliê
CREATE TABLE IF NOT EXISTS atelie_receitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Dinheiro',
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'unidades',
    min_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ok',
    item_type TEXT NOT NULL DEFAULT 'produto_acabado' CHECK (item_type IN ('materia_prima','tecido','produto_acabado')),
    category TEXT,
    supplier TEXT,
    cost_per_unit NUMERIC(12,2),
    total_cost NUMERIC(12,2),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_empresa ON inventory_items(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tipo ON inventory_items(item_type);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    produto_id UUID REFERENCES atelie_products(id) ON DELETE SET NULL,
    variacao_id UUID REFERENCES produto_variacoes(id) ON DELETE SET NULL,
    tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('entrada','saida','ajuste','transferencia','perda','devolucao')),
    ajuste_sign VARCHAR(20) NOT NULL DEFAULT 'incremento' CHECK (ajuste_sign IN ('incremento','decremento')),
    quantidade NUMERIC(12,2) NOT NULL,
    quantidade_anterior NUMERIC(12,2),
    quantidade_atual NUMERIC(12,2),
    motivo TEXT,
    origem VARCHAR(100),
    origem_id UUID,
    lote VARCHAR(100),
    data_validade DATE,
    valor_unitario NUMERIC(12,2),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa ON movimentacoes_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_item ON movimentacoes_estoque(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(created_at);

CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  delta NUMERIC(12,2) := 0;
  current_quantity NUMERIC(12,2) := 0;
  new_quantity NUMERIC(12,2) := 0;
BEGIN
  IF NEW.inventory_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT quantity
    INTO current_quantity
    FROM inventory_items
   WHERE id = NEW.inventory_item_id
   FOR UPDATE;

  IF NEW.tipo_movimentacao IN ('entrada','devolucao','transferencia') THEN
    delta := NEW.quantidade;
  ELSIF NEW.tipo_movimentacao IN ('saida','perda') THEN
    delta := -NEW.quantidade;
  ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
    IF NEW.ajuste_sign = 'decremento' THEN
      delta := -NEW.quantidade;
    ELSE
      delta := NEW.quantidade;
    END IF;
  END IF;

  new_quantity := GREATEST(0, COALESCE(current_quantity, 0) + delta);

  UPDATE inventory_items
  SET quantity = new_quantity,
      total_cost = CASE
        WHEN cost_per_unit IS NOT NULL THEN new_quantity * cost_per_unit
        ELSE total_cost
      END,
      status = CASE
        WHEN new_quantity <= 0 THEN 'critical'
        WHEN new_quantity < min_quantity THEN 'low'
        ELSE 'ok'
      END,
      updated_at = NOW()
  WHERE id = NEW.inventory_item_id;

  NEW.quantidade_anterior := current_quantity;
  NEW.quantidade_atual := new_quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON movimentacoes_estoque;
CREATE TRIGGER trg_apply_inventory_movement
BEFORE INSERT ON movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_empresa_id ON atelie_quotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_code ON atelie_quotes(code);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_status ON atelie_quotes(status);

CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_quote_id ON atelie_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_empresa_id ON atelie_quote_items(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quote_personalizations_quote_id ON atelie_quote_personalizations(quote_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quote_personalizations_empresa_id ON atelie_quote_personalizations(empresa_id);

CREATE INDEX IF NOT EXISTS idx_atelie_orders_empresa_id ON atelie_orders(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_code ON atelie_orders(code);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_status ON atelie_orders(status);
CREATE INDEX IF NOT EXISTS idx_atelie_order_personalizations_order_id ON atelie_order_personalizations(order_id);
CREATE INDEX IF NOT EXISTS idx_atelie_order_personalizations_empresa_id ON atelie_order_personalizations(empresa_id);
CREATE INDEX IF NOT EXISTS idx_order_status_configs_empresa_id ON order_status_configs(empresa_id);

CREATE INDEX IF NOT EXISTS idx_atelie_customers_empresa_id ON atelie_customers(empresa_id);

CREATE INDEX IF NOT EXISTS idx_atelie_receitas_empresa_id ON atelie_receitas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_receitas_order_code ON atelie_receitas(order_code);

-- Ativar RLS
ALTER TABLE atelie_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_quote_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_order_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Users can view quotes from their empresa" ON atelie_quotes
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert quotes for their empresa" ON atelie_quotes
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update quotes from their empresa" ON atelie_quotes
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view quote items from their empresa" ON atelie_quote_items
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert quote items for their empresa" ON atelie_quote_items
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update quote items from their empresa" ON atelie_quote_items
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view quote personalizations from their empresa" ON atelie_quote_personalizations
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert quote personalizations for their empresa" ON atelie_quote_personalizations
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update quote personalizations from their empresa" ON atelie_quote_personalizations
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view orders from their empresa" ON atelie_orders
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert orders for their empresa" ON atelie_orders
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update orders from their empresa" ON atelie_orders
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view order personalizations from their empresa" ON atelie_order_personalizations
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert order personalizations for their empresa" ON atelie_order_personalizations
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update order personalizations from their empresa" ON atelie_order_personalizations
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their status configs" ON order_status_configs
    FOR ALL USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ))
    WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view customers from their empresa" ON atelie_customers
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert customers for their empresa" ON atelie_customers
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update customers from their empresa" ON atelie_customers
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view receitas from their empresa" ON atelie_receitas
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert receitas for their empresa" ON atelie_receitas
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update receitas from their empresa" ON atelie_receitas
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view inventory from their empresa" ON inventory_items
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert inventory for their empresa" ON inventory_items
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update inventory from their empresa" ON inventory_items
    FOR UPDATE USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ))
    WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view movimentacoes from their empresa" ON movimentacoes_estoque
    FOR SELECT USING (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert movimentacoes for their empresa" ON movimentacoes_estoque
    FOR INSERT WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    ));

