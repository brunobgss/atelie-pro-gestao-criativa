-- Teste: Verificar se o PDF consegue buscar dados do cliente
-- Execute este teste com um nome de cliente que existe na sua base

-- 1. Verificar dados de um cliente específico
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
WHERE name ILIKE '%ADRIANO%' -- Substitua pelo nome do cliente que você testou
LIMIT 1;

-- 2. Verificar se a query do PDF funcionaria
-- (simula a busca que o código faz)
SELECT
  "address",
  "phone",
  "email",
  "cpf_cnpj",
  "endereco_logradouro",
  "endereco_numero",
  "endereco_complemento",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_uf",
  "endereco_cep"
FROM public.customers
WHERE empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae' -- Substitua pelo seu empresa_id
AND name ILIKE '%ADRIANO%' -- Substitua pelo nome do cliente
LIMIT 1;