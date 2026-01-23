-- Verificar se todas as colunas foram adicionadas na tabela customers
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
AND column_name IN (
  'cpf_cnpj',
  'endereco_logradouro',
  'endereco_numero',
  'endereco_complemento',
  'endereco_bairro',
  'endereco_cidade',
  'endereco_uf',
  'endereco_cep'
)
ORDER BY column_name;