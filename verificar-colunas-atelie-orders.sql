-- Verificar colunas da tabela atelie_orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'atelie_orders'
ORDER BY ordinal_position;

-- Verificar se updated_at existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'atelie_orders' 
  AND column_name = 'updated_at'
) as updated_at_exists;

-- Adicionar updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'atelie_orders' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.atelie_orders 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada à tabela atelie_orders';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela atelie_orders';
    END IF;
END $$;

-- Verificar se observations existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'atelie_orders' 
  AND column_name = 'observations'
) as observations_exists;

-- Adicionar observations se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'atelie_orders' 
        AND column_name = 'observations'
    ) THEN
        ALTER TABLE public.atelie_orders 
        ADD COLUMN observations TEXT;
        RAISE NOTICE 'Coluna observations adicionada à tabela atelie_orders';
    ELSE
        RAISE NOTICE 'Coluna observations já existe na tabela atelie_orders';
    END IF;
END $$;

