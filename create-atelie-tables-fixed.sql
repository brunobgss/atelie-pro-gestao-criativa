-- =====================================================
-- SCRIPT CORRIGIDO PARA CRIAR TABELAS ESPECÍFICAS DO ATELIÊ PRO
-- Execute este script no Editor SQL do Supabase
-- =====================================================

-- 1. Criar tabela atelie_quotes
CREATE TABLE IF NOT EXISTS public.atelie_quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    observations TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    total_value DECIMAL(10,2) DEFAULT 0,
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela atelie_quote_items
CREATE TABLE IF NOT EXISTS public.atelie_quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES public.atelie_quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_value DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_value) STORED,
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela atelie_orders
CREATE TABLE IF NOT EXISTS public.atelie_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    description TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    paid_value DECIMAL(10,2) DEFAULT 0,
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'Aguardando aprovação' CHECK (status IN ('Aguardando aprovação', 'Em produção', 'Pronto', 'Aguardando retirada', 'Entregue')),
    observations TEXT,
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela atelie_customers
CREATE TABLE IF NOT EXISTS public.atelie_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Verificar e corrigir tabela atelie_receitas
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atelie_receitas') THEN
        -- Criar tabela se não existir
        CREATE TABLE public.atelie_receitas (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_code VARCHAR(50) NOT NULL,
            customer_name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'dinheiro',
            payment_date DATE DEFAULT CURRENT_DATE,
            status VARCHAR(50) DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'parcial')),
            empresa_id UUID REFERENCES public.empresas(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela atelie_receitas criada.';
    ELSE
        RAISE NOTICE 'Tabela atelie_receitas já existe.';
        
        -- Adicionar coluna empresa_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_receitas' AND column_name='empresa_id') THEN
            ALTER TABLE public.atelie_receitas ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);
            RAISE NOTICE 'Coluna empresa_id adicionada à tabela atelie_receitas.';
        END IF;
        
        -- Adicionar coluna status se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_receitas' AND column_name='status') THEN
            ALTER TABLE public.atelie_receitas ADD COLUMN status VARCHAR(50) DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'parcial'));
            RAISE NOTICE 'Coluna status adicionada à tabela atelie_receitas.';
        END IF;
        
        -- Adicionar coluna updated_at se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_receitas' AND column_name='updated_at') THEN
            ALTER TABLE public.atelie_receitas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada à tabela atelie_receitas.';
        END IF;
    END IF;
END $$;

-- 6. Adicionar índices para performance (sem empresa_id para atelie_receitas por enquanto)
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_code ON public.atelie_quotes(code);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_empresa_id ON public.atelie_quotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quotes_status ON public.atelie_quotes(status);

CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_quote_id ON public.atelie_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_empresa_id ON public.atelie_quote_items(empresa_id);

CREATE INDEX IF NOT EXISTS idx_atelie_orders_code ON public.atelie_orders(code);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_empresa_id ON public.atelie_orders(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_orders_status ON public.atelie_orders(status);

CREATE INDEX IF NOT EXISTS idx_atelie_customers_empresa_id ON public.atelie_customers(empresa_id);

CREATE INDEX IF NOT EXISTS idx_atelie_receitas_order_code ON public.atelie_receitas(order_code);

-- 7. Habilitar RLS nas tabelas
ALTER TABLE public.atelie_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_receitas ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS básicas
-- Políticas para atelie_quotes
CREATE POLICY "Users can view quotes from their empresa" ON public.atelie_quotes
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quotes for their empresa" ON public.atelie_quotes
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update quotes from their empresa" ON public.atelie_quotes
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete quotes from their empresa" ON public.atelie_quotes
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para atelie_quote_items
CREATE POLICY "Users can view quote items from their empresa" ON public.atelie_quote_items
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quote items for their empresa" ON public.atelie_quote_items
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update quote items from their empresa" ON public.atelie_quote_items
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete quote items from their empresa" ON public.atelie_quote_items
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para atelie_orders
CREATE POLICY "Users can view orders from their empresa" ON public.atelie_orders
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert orders for their empresa" ON public.atelie_orders
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update orders from their empresa" ON public.atelie_orders
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete orders from their empresa" ON public.atelie_orders
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para atelie_customers
CREATE POLICY "Users can view customers from their empresa" ON public.atelie_customers
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert customers for their empresa" ON public.atelie_customers
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update customers from their empresa" ON public.atelie_customers
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete customers from their empresa" ON public.atelie_customers
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para atelie_receitas (sem empresa_id por enquanto)
CREATE POLICY "Users can view receitas" ON public.atelie_receitas
    FOR SELECT USING (true);

CREATE POLICY "Users can insert receitas" ON public.atelie_receitas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update receitas" ON public.atelie_receitas
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete receitas" ON public.atelie_receitas
    FOR DELETE USING (true);

-- 9. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_atelie_quotes_updated_at ON public.atelie_quotes;
CREATE TRIGGER update_atelie_quotes_updated_at
    BEFORE UPDATE ON public.atelie_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_atelie_quote_items_updated_at ON public.atelie_quote_items;
CREATE TRIGGER update_atelie_quote_items_updated_at
    BEFORE UPDATE ON public.atelie_quote_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_atelie_orders_updated_at ON public.atelie_orders;
CREATE TRIGGER update_atelie_orders_updated_at
    BEFORE UPDATE ON public.atelie_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_atelie_customers_updated_at ON public.atelie_customers;
CREATE TRIGGER update_atelie_customers_updated_at
    BEFORE UPDATE ON public.atelie_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_atelie_receitas_updated_at ON public.atelie_receitas;
CREATE TRIGGER update_atelie_receitas_updated_at
    BEFORE UPDATE ON public.atelie_receitas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'atelie_%'
ORDER BY table_name;

