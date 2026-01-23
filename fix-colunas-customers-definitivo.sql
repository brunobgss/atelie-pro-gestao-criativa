-- SCRIPT DEFINITIVO PARA ADICIONAR COLUNAS FALTANTES NA TABELA CUSTOMERS
-- Execute no SQL Editor do Supabase - UMA LINHA POR VEZ se necessário

-- Adicionar colunas faltantes (execute uma por vez se der erro)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_logradouro VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(10);

-- Verificar se todas as colunas foram adicionadas
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
AND column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
ORDER BY column_name;

-- Teste: tentar buscar dados de um cliente (deve funcionar agora)
SELECT
  id,
  name,
  phone,
  email,
  cpf_cnpj,
  endereco_logradouro,
  endereco_numero,
  endereco_complemento,
  endereco_bairro,
  endereco_cidade,
  endereco_uf,
  endereco_cep
FROM public.customers
WHERE empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
LIMIT 1;