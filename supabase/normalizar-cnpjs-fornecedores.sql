-- Script para normalizar todos os CNPJs/CPFs na tabela fornecedores
-- Remove pontos, barras e hífens para garantir consistência
-- Isso resolve problemas de duplicatas causados por formatação diferente

-- PASSO 1: Verificar quantos registros serão afetados
SELECT 
    COUNT(*) AS total_fornecedores,
    COUNT(CASE WHEN cnpj IS NOT NULL THEN 1 END) AS com_cnpj,
    COUNT(CASE WHEN cpf IS NOT NULL THEN 1 END) AS com_cpf,
    COUNT(CASE WHEN cnpj LIKE '%.%' OR cnpj LIKE '%/%' OR cnpj LIKE '%-%' THEN 1 END) AS cnpj_com_formatacao,
    COUNT(CASE WHEN cpf LIKE '%.%' OR cpf LIKE '%-%' THEN 1 END) AS cpf_com_formatacao
FROM public.fornecedores;

-- PASSO 2: Mostrar exemplos de CNPJs/CPFs que serão normalizados
SELECT 
    id,
    nome_fantasia,
    cnpj AS cnpj_original,
    REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') AS cnpj_normalizado,
    cpf AS cpf_original,
    REPLACE(REPLACE(cpf, '.', ''), '-', '') AS cpf_normalizado
FROM public.fornecedores
WHERE (cnpj IS NOT NULL AND (cnpj LIKE '%.%' OR cnpj LIKE '%/%' OR cnpj LIKE '%-%'))
   OR (cpf IS NOT NULL AND (cpf LIKE '%.%' OR cpf LIKE '%-%'))
LIMIT 20;

-- PASSO 3: Normalizar CNPJs (remover pontos, barras e hífens)
UPDATE public.fornecedores
SET cnpj = REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '')
WHERE cnpj IS NOT NULL
  AND (cnpj LIKE '%.%' OR cnpj LIKE '%/%' OR cnpj LIKE '%-%');

-- PASSO 4: Normalizar CPFs (remover pontos e hífens)
UPDATE public.fornecedores
SET cpf = REPLACE(REPLACE(cpf, '.', ''), '-', '')
WHERE cpf IS NOT NULL
  AND (cpf LIKE '%.%' OR cpf LIKE '%-%');

-- PASSO 5: Verificar se há duplicatas após normalização (por empresa)
SELECT 
    empresa_id,
    cnpj,
    COUNT(*) AS total_duplicatas,
    STRING_AGG(id::text, ', ') AS ids_fornecedores,
    STRING_AGG(nome_fantasia, ' | ') AS nomes_fornecedores
FROM public.fornecedores
WHERE cnpj IS NOT NULL
GROUP BY empresa_id, cnpj
HAVING COUNT(*) > 1;

-- PASSO 6: Verificar se há duplicatas de CPF após normalização (por empresa)
SELECT 
    empresa_id,
    cpf,
    COUNT(*) AS total_duplicatas,
    STRING_AGG(id::text, ', ') AS ids_fornecedores,
    STRING_AGG(nome_fantasia, ' | ') AS nomes_fornecedores
FROM public.fornecedores
WHERE cpf IS NOT NULL
GROUP BY empresa_id, cpf
HAVING COUNT(*) > 1;

-- PASSO 7: Verificar resultado final
SELECT 
    COUNT(*) AS total_fornecedores,
    COUNT(CASE WHEN cnpj IS NOT NULL THEN 1 END) AS com_cnpj,
    COUNT(CASE WHEN cpf IS NOT NULL THEN 1 END) AS com_cpf,
    COUNT(CASE WHEN cnpj LIKE '%.%' OR cnpj LIKE '%/%' OR cnpj LIKE '%-%' THEN 1 END) AS cnpj_com_formatacao_restante,
    COUNT(CASE WHEN cpf LIKE '%.%' OR cpf LIKE '%-%' THEN 1 END) AS cpf_com_formatacao_restante
FROM public.fornecedores;

DO $$
BEGIN
    RAISE NOTICE '✅ Normalização de CNPJs/CPFs concluída! Todos os registros agora estão sem formatação.';
END $$;

