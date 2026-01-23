-- Script para adicionar coluna cpf_cnpj na tabela customers se não existir
-- Execute no SQL Editor do Supabase

-- Verificar se a coluna existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
    AND column_name = 'cpf_cnpj'
    AND table_schema = 'public'
  ) THEN
    -- Adicionar as colunas necessárias
    ALTER TABLE public.customers
    ADD COLUMN cpf_cnpj VARCHAR(20),
    ADD COLUMN endereco_logradouro VARCHAR(255),
    ADD COLUMN endereco_numero VARCHAR(20),
    ADD COLUMN endereco_complemento VARCHAR(255),
    ADD COLUMN endereco_bairro VARCHAR(100),
    ADD COLUMN endereco_cidade VARCHAR(100),
    ADD COLUMN endereco_uf VARCHAR(2),
    ADD COLUMN endereco_cep VARCHAR(10);

    -- Adicionar comentários
    COMMENT ON COLUMN public.customers.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente';
    COMMENT ON COLUMN public.customers.endereco_logradouro IS 'Rua, Avenida, etc.';
    COMMENT ON COLUMN public.customers.endereco_numero IS 'Número do endereço';
    COMMENT ON COLUMN public.customers.endereco_complemento IS 'Complemento (apto, bloco, etc.)';
    COMMENT ON COLUMN public.customers.endereco_bairro IS 'Bairro';
    COMMENT ON COLUMN public.customers.endereco_cidade IS 'Cidade';
    COMMENT ON COLUMN public.customers.endereco_uf IS 'UF (2 letras)';
    COMMENT ON COLUMN public.customers.endereco_cep IS 'CEP (8 dígitos)';

    RAISE NOTICE 'Colunas cpf_cnpj e endereço adicionadas com sucesso na tabela customers!';
  ELSE
    RAISE NOTICE 'Colunas já existem na tabela customers!';
  END IF;
END $$;

-- Verificar estrutura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
AND column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
ORDER BY ordinal_position;