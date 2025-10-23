-- Script para verificar se a coluna country existe na tabela empresas
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a coluna country existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'empresas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Se a coluna não existir, criar ela
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'country'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN country text DEFAULT 'BR';
        RAISE NOTICE 'Coluna country criada na tabela empresas';
    ELSE
        RAISE NOTICE 'Coluna country já existe na tabela empresas';
    END IF;
END $$;

-- 3. Verificar dados atuais
SELECT id, nome, country FROM public.empresas LIMIT 5;
