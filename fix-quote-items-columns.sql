-- =====================================================
-- SCRIPT PARA CORRIGIR COLUNAS FALTANTES
-- Execute este script no Editor SQL do Supabase
-- =====================================================

-- 1. Verificar estrutura atual da tabela atelie_quote_items
SELECT 'Estrutura atual da tabela atelie_quote_items:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'atelie_quote_items'
ORDER BY ordinal_position;

-- 2. Adicionar coluna unit_value se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_quote_items' AND column_name='unit_value') THEN
        ALTER TABLE public.atelie_quote_items ADD COLUMN unit_value DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Coluna unit_value adicionada à tabela atelie_quote_items.';
    ELSE
        RAISE NOTICE 'Coluna unit_value já existe na tabela atelie_quote_items.';
    END IF;
END $$;

-- 3. Adicionar coluna empresa_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_quote_items' AND column_name='empresa_id') THEN
        ALTER TABLE public.atelie_quote_items ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);
        RAISE NOTICE 'Coluna empresa_id adicionada à tabela atelie_quote_items.';
    ELSE
        RAISE NOTICE 'Coluna empresa_id já existe na tabela atelie_quote_items.';
    END IF;
END $$;

-- 4. Adicionar coluna updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atelie_quote_items' AND column_name='updated_at') THEN
        ALTER TABLE public.atelie_quote_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada à tabela atelie_quote_items.';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela atelie_quote_items.';
    END IF;
END $$;

-- 5. Verificar se há dados na tabela e migrar se necessário
DO $$
DECLARE
    has_value_column BOOLEAN;
    has_unit_value_column BOOLEAN;
BEGIN
    -- Verificar se existe coluna 'value'
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='atelie_quote_items' AND column_name='value'
    ) INTO has_value_column;
    
    -- Verificar se existe coluna 'unit_value'
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='atelie_quote_items' AND column_name='unit_value'
    ) INTO has_unit_value_column;
    
    -- Se existe 'value' mas não 'unit_value', migrar dados
    IF has_value_column AND NOT has_unit_value_column THEN
        UPDATE public.atelie_quote_items SET unit_value = value WHERE unit_value = 0;
        RAISE NOTICE 'Dados migrados da coluna value para unit_value.';
    END IF;
END $$;

-- 6. Criar índice para unit_value se não existir
CREATE INDEX IF NOT EXISTS idx_atelie_quote_items_unit_value ON public.atelie_quote_items(unit_value);

-- 7. Verificar estrutura final da tabela
SELECT 'Estrutura final da tabela atelie_quote_items:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'atelie_quote_items'
ORDER BY ordinal_position;

-- 8. Verificar se há dados na tabela
SELECT 'Dados na tabela atelie_quote_items:' as info;
SELECT COUNT(*) as total_items FROM public.atelie_quote_items;

-- 9. Mostrar alguns registros de exemplo
SELECT 'Exemplo de registros:' as info;
SELECT id, quote_id, description, quantity, unit_value
FROM public.atelie_quote_items
LIMIT 5;
