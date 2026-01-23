-- Script para adicionar as colunas faltantes na tabela customers
-- Execute uma por vez no SQL Editor do Supabase

-- Adicionar cada coluna individualmente se não existir

-- 1. endereco_logradouro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_logradouro'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_logradouro VARCHAR(255);
    COMMENT ON COLUMN public.customers.endereco_logradouro IS 'Rua, Avenida, etc.';
    RAISE NOTICE 'Coluna endereco_logradouro adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_logradouro já existe!';
  END IF;
END $$;

-- 2. endereco_numero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_numero'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_numero VARCHAR(20);
    COMMENT ON COLUMN public.customers.endereco_numero IS 'Número do endereço';
    RAISE NOTICE 'Coluna endereco_numero adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_numero já existe!';
  END IF;
END $$;

-- 3. endereco_complemento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_complemento'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_complemento VARCHAR(255);
    COMMENT ON COLUMN public.customers.endereco_complemento IS 'Complemento (apto, bloco, etc.)';
    RAISE NOTICE 'Coluna endereco_complemento adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_complemento já existe!';
  END IF;
END $$;

-- 4. endereco_bairro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_bairro'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_bairro VARCHAR(100);
    COMMENT ON COLUMN public.customers.endereco_bairro IS 'Bairro';
    RAISE NOTICE 'Coluna endereco_bairro adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_bairro já existe!';
  END IF;
END $$;

-- 5. endereco_cidade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_cidade'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_cidade VARCHAR(100);
    COMMENT ON COLUMN public.customers.endereco_cidade IS 'Cidade';
    RAISE NOTICE 'Coluna endereco_cidade adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_cidade já existe!';
  END IF;
END $$;

-- 6. endereco_uf
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_uf'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_uf VARCHAR(2);
    COMMENT ON COLUMN public.customers.endereco_uf IS 'UF (2 letras)';
    RAISE NOTICE 'Coluna endereco_uf adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_uf já existe!';
  END IF;
END $$;

-- 7. endereco_cep
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'endereco_cep'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN endereco_cep VARCHAR(10);
    COMMENT ON COLUMN public.customers.endereco_cep IS 'CEP (8 dígitos)';
    RAISE NOTICE 'Coluna endereco_cep adicionada!';
  ELSE
    RAISE NOTICE 'Coluna endereco_cep já existe!';
  END IF;
END $$;

-- Verificar resultado final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
AND column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
ORDER BY column_name;