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

