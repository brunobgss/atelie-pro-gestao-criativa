-- Script para corrigir constraints únicas de CNPJ e CPF na tabela fornecedores
-- O problema: havia uma constraint UNIQUE global no CNPJ/CPF que impedia
-- empresas diferentes de cadastrar o mesmo CNPJ/CPF
-- Solução: remover a constraint global e manter apenas UNIQUE(empresa_id, cnpj) e UNIQUE(empresa_id, cpf)

-- PASSO 1: Verificar constraints existentes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.fornecedores'::regclass
AND contype = 'u'
ORDER BY conname;

-- PASSO 2: Remover constraint UNIQUE global do CNPJ (se existir)
-- A constraint pode ter nomes diferentes dependendo de como foi criada
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Tentar encontrar e remover constraint UNIQUE global do CNPJ
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.fornecedores'::regclass
    AND contype = 'u'
    AND (
        conname LIKE '%cnpj%' OR
        conname = 'fornecedores_cnpj_key' OR
        pg_get_constraintdef(oid) LIKE '%cnpj%'
    )
    AND pg_get_constraintdef(oid) NOT LIKE '%empresa_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.fornecedores DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint UNIQUE global do CNPJ removida: %', constraint_name;
    ELSE
        RAISE NOTICE 'Nenhuma constraint UNIQUE global do CNPJ encontrada';
    END IF;
END $$;

-- PASSO 3: Remover constraint UNIQUE global do CPF (se existir)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Tentar encontrar e remover constraint UNIQUE global do CPF
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.fornecedores'::regclass
    AND contype = 'u'
    AND (
        conname LIKE '%cpf%' OR
        conname = 'fornecedores_cpf_key' OR
        pg_get_constraintdef(oid) LIKE '%cpf%'
    )
    AND pg_get_constraintdef(oid) NOT LIKE '%empresa_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.fornecedores DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint UNIQUE global do CPF removida: %', constraint_name;
    ELSE
        RAISE NOTICE 'Nenhuma constraint UNIQUE global do CPF encontrada';
    END IF;
END $$;

-- PASSO 4: Garantir que as constraints por empresa existam
-- (UNIQUE(empresa_id, cnpj) e UNIQUE(empresa_id, cpf))
-- Essas constraints permitem que empresas diferentes tenham o mesmo CNPJ/CPF

-- Verificar se UNIQUE(empresa_id, cnpj) existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.fornecedores'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%empresa_id%'
        AND pg_get_constraintdef(oid) LIKE '%cnpj%'
    ) THEN
        ALTER TABLE public.fornecedores 
        ADD CONSTRAINT fornecedores_empresa_cnpj_unique 
        UNIQUE(empresa_id, cnpj);
        RAISE NOTICE 'Constraint UNIQUE(empresa_id, cnpj) criada';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE(empresa_id, cnpj) já existe';
    END IF;
END $$;

-- Verificar se UNIQUE(empresa_id, cpf) existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.fornecedores'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%empresa_id%'
        AND pg_get_constraintdef(oid) LIKE '%cpf%'
    ) THEN
        ALTER TABLE public.fornecedores 
        ADD CONSTRAINT fornecedores_empresa_cpf_unique 
        UNIQUE(empresa_id, cpf);
        RAISE NOTICE 'Constraint UNIQUE(empresa_id, cpf) criada';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE(empresa_id, cpf) já existe';
    END IF;
END $$;

-- PASSO 5: Verificar constraints finais
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.fornecedores'::regclass
AND contype = 'u'
ORDER BY conname;

DO $$
BEGIN
    RAISE NOTICE '✅ Correção de constraints concluída! Agora cada empresa pode ter seu próprio fornecedor com o mesmo CNPJ/CPF.';
END $$;

