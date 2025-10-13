-- =====================================================
-- SCRIPT PARA CRIAR TABELAS DO ATELIÊ PRO (COM LIMPEZA)
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de orçamentos do ateliê
CREATE TABLE IF NOT EXISTS atelie_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  observations TEXT,
  total_value DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de itens dos orçamentos
CREATE TABLE IF NOT EXISTS atelie_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES atelie_quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de pedidos do ateliê
CREATE TABLE IF NOT EXISTS atelie_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  type VARCHAR(100) NOT NULL, -- Bordado Computadorizado, Uniforme Escolar, etc.
  description TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid DECIMAL(10,2) DEFAULT 0,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'Aguardando aprovação' CHECK (status IN ('Aguardando aprovação', 'Em produção', 'Pronto', 'Entregue', 'Cancelado')),
  file_url TEXT, -- URL do arquivo de bordado
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela de clientes do ateliê
CREATE TABLE IF NOT EXISTS atelie_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_code ON atelie_quotes(code);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_empresa ON atelie_quotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_date ON atelie_quotes(date);

CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_quote ON atelie_quote_items(quote_id);

CREATE INDEX IF NOT EXISTS idx_atelie_orders_code ON atelie_orders(code);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_empresa ON atelie_orders(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_status ON atelie_orders(status);

CREATE INDEX IF NOT EXISTS idx_atelie_customers_empresa ON atelie_customers(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_customers_name ON atelie_customers(name);

-- 6. Habilitar RLS nas tabelas
ALTER TABLE atelie_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE atelie_customers ENABLE ROW LEVEL SECURITY;

-- 7. REMOVER POLÍTICAS EXISTENTES (se existirem)
DROP POLICY IF EXISTS "Users can view quotes from their empresa" ON atelie_quotes;
DROP POLICY IF EXISTS "Users can insert quotes to their empresa" ON atelie_quotes;
DROP POLICY IF EXISTS "Users can update quotes from their empresa" ON atelie_quotes;
DROP POLICY IF EXISTS "Users can delete quotes from their empresa" ON atelie_quotes;

DROP POLICY IF EXISTS "Users can view quote items from their empresa" ON atelie_quote_items;
DROP POLICY IF EXISTS "Users can insert quote items to their empresa" ON atelie_quote_items;
DROP POLICY IF EXISTS "Users can update quote items from their empresa" ON atelie_quote_items;
DROP POLICY IF EXISTS "Users can delete quote items from their empresa" ON atelie_quote_items;

DROP POLICY IF EXISTS "Users can view orders from their empresa" ON atelie_orders;
DROP POLICY IF EXISTS "Users can insert orders to their empresa" ON atelie_orders;
DROP POLICY IF EXISTS "Users can update orders from their empresa" ON atelie_orders;
DROP POLICY IF EXISTS "Users can delete orders from their empresa" ON atelie_orders;

DROP POLICY IF EXISTS "Users can view customers from their empresa" ON atelie_customers;
DROP POLICY IF EXISTS "Users can insert customers to their empresa" ON atelie_customers;
DROP POLICY IF EXISTS "Users can update customers from their empresa" ON atelie_customers;
DROP POLICY IF EXISTS "Users can delete customers from their empresa" ON atelie_customers;

-- 8. Criar políticas RLS para atelie_quotes
CREATE POLICY "Users can view quotes from their empresa" ON atelie_quotes
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quotes to their empresa" ON atelie_quotes
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quotes from their empresa" ON atelie_quotes
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quotes from their empresa" ON atelie_quotes
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- 9. Criar políticas RLS para atelie_quote_items
CREATE POLICY "Users can view quote items from their empresa" ON atelie_quote_items
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM atelie_quotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert quote items to their empresa" ON atelie_quote_items
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM atelie_quotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update quote items from their empresa" ON atelie_quote_items
  FOR UPDATE USING (
    quote_id IN (
      SELECT id FROM atelie_quotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete quote items from their empresa" ON atelie_quote_items
  FOR DELETE USING (
    quote_id IN (
      SELECT id FROM atelie_quotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 10. Criar políticas RLS para atelie_orders
CREATE POLICY "Users can view orders from their empresa" ON atelie_orders
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders to their empresa" ON atelie_orders
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their empresa" ON atelie_orders
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders from their empresa" ON atelie_orders
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- 11. Criar políticas RLS para atelie_customers
CREATE POLICY "Users can view customers from their empresa" ON atelie_customers
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customers to their empresa" ON atelie_customers
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update customers from their empresa" ON atelie_customers
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete customers from their empresa" ON atelie_customers
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );


