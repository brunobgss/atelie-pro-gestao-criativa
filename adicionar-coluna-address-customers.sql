-- Script para adicionar coluna address na tabela customers
-- Execute no Supabase SQL Editor

-- Verificar se a coluna já existe e adicionar se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.customers 
        ADD COLUMN address TEXT;
        
        RAISE NOTICE 'Coluna address adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna address já existe na tabela customers.';
    END IF;
END $$;

-- Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

