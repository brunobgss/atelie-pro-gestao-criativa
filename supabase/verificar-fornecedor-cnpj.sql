-- Script para verificar se existe uma constraint global do CNPJ
-- e verificar se o CNPJ já está cadastrado para alguma empresa

-- PASSO 1: Verificar TODAS as constraints (incluindo as que podem ter nomes diferentes)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.fornecedores'::regclass
AND contype = 'u'
ORDER BY conname;

-- PASSO 2: Verificar se existe especificamente a constraint 'fornecedores_cnpj_key'
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.fornecedores'::regclass
AND conname = 'fornecedores_cnpj_key';

-- PASSO 3: Verificar se o CNPJ "16.965.817/0001-34" já está cadastrado
-- e em qual(is) empresa(s)
SELECT 
    f.id,
    f.nome_fantasia,
    f.cnpj,
    f.empresa_id,
    e.nome AS nome_empresa,
    e.email AS email_empresa
FROM public.fornecedores f
LEFT JOIN public.empresas e ON e.id = f.empresa_id
WHERE f.cnpj = '16.965.817/0001-34'
   OR f.cnpj = '16965817000134'  -- Sem formatação
ORDER BY f.created_at DESC;

-- PASSO 4: Verificar se há CNPJs duplicados (mesmo CNPJ em empresas diferentes)
-- Isso não deveria ser possível com a constraint atual, mas vamos verificar
SELECT 
    cnpj,
    COUNT(*) AS total_empresas,
    STRING_AGG(DISTINCT empresa_id::text, ', ') AS empresas_ids
FROM public.fornecedores
WHERE cnpj IS NOT NULL
GROUP BY cnpj
HAVING COUNT(*) > 1;

-- PASSO 5: Verificar se há algum índice único no CNPJ que possa estar causando o problema
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'fornecedores'
AND indexdef LIKE '%cnpj%';

