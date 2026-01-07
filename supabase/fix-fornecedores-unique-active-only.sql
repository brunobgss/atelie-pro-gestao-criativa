-- Script para modificar a constraint única de CNPJ/CPF para considerar apenas fornecedores ATIVOS
-- Isso permite que um CNPJ seja reutilizado se o fornecedor anterior foi deletado (marcado como inativo)

-- PASSO 1: Remover as constraints únicas atuais
ALTER TABLE public.fornecedores 
DROP CONSTRAINT IF EXISTS fornecedores_empresa_id_cnpj_key;

ALTER TABLE public.fornecedores 
DROP CONSTRAINT IF EXISTS fornecedores_empresa_id_cpf_key;

-- PASSO 2: Criar índices únicos parciais que consideram apenas fornecedores ATIVOS
-- Isso permite múltiplos fornecedores inativos com o mesmo CNPJ, mas apenas 1 ativo

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_empresa_cnpj_unique_active 
ON public.fornecedores(empresa_id, cnpj) 
WHERE cnpj IS NOT NULL AND ativo = true;

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_empresa_cpf_unique_active 
ON public.fornecedores(empresa_id, cpf) 
WHERE cpf IS NOT NULL AND ativo = true;

-- PASSO 3: Verificar os índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'fornecedores'
AND indexname LIKE '%unique%'
ORDER BY indexname;

-- PASSO 4: Verificar se há múltiplos fornecedores ativos com o mesmo CNPJ (não deveria ter)
SELECT 
    empresa_id,
    cnpj,
    COUNT(*) AS total_ativos,
    STRING_AGG(id::text, ', ') AS ids_fornecedores,
    STRING_AGG(nome_fantasia, ' | ') AS nomes_fornecedores
FROM public.fornecedores
WHERE cnpj IS NOT NULL
  AND ativo = true
GROUP BY empresa_id, cnpj
HAVING COUNT(*) > 1;

DO $$
BEGIN
    RAISE NOTICE '✅ Constraints únicas modificadas! Agora apenas fornecedores ATIVOS precisam ter CNPJ/CPF único.';
    RAISE NOTICE 'Fornecedores inativos não impedem mais o cadastro de novos fornecedores com o mesmo CNPJ/CPF.';
END $$;

