-- Adicionar campos CPF/CNPJ e endereço completo na tabela de clientes
-- Isso é necessário para emitir notas fiscais com dados corretos do destinatário

-- Adicionar CPF/CNPJ na tabela atelie_customers
ALTER TABLE public.atelie_customers
ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20),
ADD COLUMN IF NOT EXISTS endereco_logradouro VARCHAR(255),
ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(255),
ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100),
ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(10);

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN public.atelie_customers.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente';
COMMENT ON COLUMN public.atelie_customers.endereco_logradouro IS 'Rua, Avenida, etc.';
COMMENT ON COLUMN public.atelie_customers.endereco_numero IS 'Número do endereço';
COMMENT ON COLUMN public.atelie_customers.endereco_complemento IS 'Complemento (apto, bloco, etc.)';
COMMENT ON COLUMN public.atelie_customers.endereco_bairro IS 'Bairro';
COMMENT ON COLUMN public.atelie_customers.endereco_cidade IS 'Cidade';
COMMENT ON COLUMN public.atelie_customers.endereco_uf IS 'UF (2 letras)';
COMMENT ON COLUMN public.atelie_customers.endereco_cep IS 'CEP (8 dígitos)';

