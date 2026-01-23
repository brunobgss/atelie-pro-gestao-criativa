-- Verificar status completo das colunas da tabela customers
SELECT
  CASE
    WHEN column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
    THEN 'NECESSÁRIA'
    ELSE 'OUTRAS'
  END as status_necessaria,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name = 'cpf_cnpj' THEN '✅ CPF/CNPJ do cliente'
    WHEN column_name = 'endereco_logradouro' THEN '✅ Rua, Avenida, etc.'
    WHEN column_name = 'endereco_numero' THEN '✅ Número do endereço'
    WHEN column_name = 'endereco_complemento' THEN '✅ Complemento (apto, bloco, etc.)'
    WHEN column_name = 'endereco_bairro' THEN '✅ Bairro'
    WHEN column_name = 'endereco_cidade' THEN '✅ Cidade'
    WHEN column_name = 'endereco_uf' THEN '✅ UF (2 letras)'
    WHEN column_name = 'endereco_cep' THEN '✅ CEP (8 dígitos)'
    ELSE 'ℹ️ Coluna existente'
  END as descricao
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public'
ORDER BY
  CASE
    WHEN column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep')
    THEN 1
    ELSE 2
  END,
  column_name;

-- Contagem das colunas necessárias
SELECT
  COUNT(*) as total_colunas_existentes,
  COUNT(CASE WHEN column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep') THEN 1 END) as colunas_necessarias_encontradas,
  8 - COUNT(CASE WHEN column_name IN ('cpf_cnpj', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep') THEN 1 END) as colunas_faltando
FROM information_schema.columns
WHERE table_name = 'customers'
AND table_schema = 'public';