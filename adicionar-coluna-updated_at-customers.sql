-- Script para adicionar coluna updated_at na tabela customers
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.customers 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Atualizar registros existentes com a data atual
        UPDATE public.customers 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Coluna updated_at adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela customers.';
    END IF;
END $$;

-- 2. Criar ou substituir função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Remover trigger existente se houver
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;

-- 4. Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar se o trigger foi criado
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'customers' AND trigger_schema = 'public';

