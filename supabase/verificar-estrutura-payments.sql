-- Script para verificar se a tabela payments foi criada corretamente
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'payments'
        ) THEN '✅ Tabela "payments" existe'
        ELSE '❌ Tabela "payments" NÃO existe'
    END as status_payments;

-- 2. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 3. Verificar se a coluna asaas_subscription_id existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name = 'asaas_subscription_id'
        ) THEN '✅ Coluna "asaas_subscription_id" existe'
        ELSE '❌ Coluna "asaas_subscription_id" NÃO existe'
    END as status_asaas_subscription_id;

-- 4. Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'payments';

-- 5. Verificar políticas RLS (você já viu isso)
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ Qual definido'
        ELSE '❌ Qual não definido'
    END as status_qual,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ With_check definido'
        ELSE '❌ With_check não definido'
    END as status_with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'payments';

