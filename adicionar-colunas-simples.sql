-- Script simples para adicionar todas as colunas faltantes
-- Execute no SQL Editor do Supabase

-- Adicionar colunas uma por vez (mais seguro)

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_logradouro VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(10);

-- Adicionar comentários
COMMENT ON COLUMN public.customers.endereco_logradouro IS 'Rua, Avenida, etc.';
COMMENT ON COLUMN public.customers.endereco_numero IS 'Número do endereço';
COMMENT ON COLUMN public.customers.endereco_complemento IS 'Complemento (apto, bloco, etc.)';
COMMENT ON COLUMN public.customers.endereco_bairro IS 'Bairro';
COMMENT ON COLUMN public.customers.endereco_cidade IS 'Cidade';
COMMENT ON COLUMN public.customers.endereco_uf IS 'UF (2 letras)';
COMMENT ON COLUMN public.customers.endereco_cep IS 'CEP (8 dígitos)';

-- Verificar resultado
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
AND column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
ORDER BY column_name;