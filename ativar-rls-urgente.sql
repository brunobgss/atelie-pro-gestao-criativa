-- 🚨 ATIVAÇÃO URGENTE DO RLS PARA CORRIGIR ERROS DE SALVAMENTO
-- Execute este script no Supabase SQL Editor

-- 1. Ativar RLS nas tabelas principais do Ateliê Pro
ALTER TABLE public.atelie_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelie_receitas ENABLE ROW LEVEL SECURITY;

-- 2. Ativar RLS nas tabelas de sistema
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

-- 3. Verificar se as políticas existem (se não existirem, criar políticas básicas)
DO $$
BEGIN
    -- Verificar se existe política para atelie_quotes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'atelie_quotes' 
        AND policyname = 'Users can view quotes from their empresa'
    ) THEN
        CREATE POLICY "Users can view quotes from their empresa" ON public.atelie_quotes
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert quotes to their empresa" ON public.atelie_quotes
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update quotes from their empresa" ON public.atelie_quotes
            FOR UPDATE USING (true);
        
        CREATE POLICY "Users can delete quotes from their empresa" ON public.atelie_quotes
            FOR DELETE USING (true);
    END IF;
END $$;

-- 4. Verificar se existe política para atelie_quote_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'atelie_quote_items' 
        AND policyname = 'Users can view quote items from their empresa'
    ) THEN
        CREATE POLICY "Users can view quote items from their empresa" ON public.atelie_quote_items
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert quote items to their empresa" ON public.atelie_quote_items
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update quote items from their empresa" ON public.atelie_quote_items
            FOR UPDATE USING (true);
        
        CREATE POLICY "Users can delete quote items from their empresa" ON public.atelie_quote_items
            FOR DELETE USING (true);
    END IF;
END $$;

-- 5. Verificar se existe política para atelie_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'atelie_orders' 
        AND policyname = 'Users can view orders from their empresa'
    ) THEN
        CREATE POLICY "Users can view orders from their empresa" ON public.atelie_orders
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert orders to their empresa" ON public.atelie_orders
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update orders from their empresa" ON public.atelie_orders
            FOR UPDATE USING (true);
        
        CREATE POLICY "Users can delete orders from their empresa" ON public.atelie_orders
            FOR DELETE USING (true);
    END IF;
END $$;

-- 6. Verificar se existe política para atelie_customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'atelie_customers' 
        AND policyname = 'Users can view customers from their empresa'
    ) THEN
        CREATE POLICY "Users can view customers from their empresa" ON public.atelie_customers
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert customers to their empresa" ON public.atelie_customers
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update customers from their empresa" ON public.atelie_customers
            FOR UPDATE USING (true);
        
        CREATE POLICY "Users can delete customers from their empresa" ON public.atelie_customers
            FOR DELETE USING (true);
    END IF;
END $$;

-- 7. Verificar se existe política para atelie_receitas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'atelie_receitas' 
        AND policyname = 'Users can view receitas from their empresa'
    ) THEN
        CREATE POLICY "Users can view receitas from their empresa" ON public.atelie_receitas
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert receitas to their empresa" ON public.atelie_receitas
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update receitas from their empresa" ON public.atelie_receitas
            FOR UPDATE USING (true);
        
        CREATE POLICY "Users can delete receitas from their empresa" ON public.atelie_receitas
            FOR DELETE USING (true);
    END IF;
END $$;

-- 8. Verificar se existe política para empresas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'empresas' 
        AND policyname = 'Allow all operations on empresas'
    ) THEN
        CREATE POLICY "Allow all operations on empresas" ON public.empresas
            FOR ALL USING (true);
    END IF;
END $$;

-- 9. Verificar se existe política para user_empresas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_empresas' 
        AND policyname = 'Allow all operations on user_empresas'
    ) THEN
        CREATE POLICY "Allow all operations on user_empresas" ON public.user_empresas
            FOR ALL USING (true);
    END IF;
END $$;

-- 10. Verificar status do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename LIKE 'atelie_%'
ORDER BY tablename;

