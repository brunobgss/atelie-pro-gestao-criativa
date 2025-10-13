-- =====================================================
-- SCRIPT SIMPLES PARA CRIAR EMPRESA DE TESTE
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se já existem empresas
SELECT 
    'Empresas existentes:' as info,
    COUNT(*) as total_empresas
FROM empresas;

-- 2. Se não houver empresas, criar uma empresa de teste
INSERT INTO empresas (nome, status, trial_ends_at, is_premium) 
SELECT 
    'Ateliê Pro - Empresa Teste',
    'trial',
    NOW() + INTERVAL '7 days',
    false
WHERE NOT EXISTS (SELECT 1 FROM empresas LIMIT 1);

-- 3. Verificar empresas existentes
SELECT 
    'Empresas após inserção:' as info,
    id,
    nome,
    status,
    trial_ends_at,
    created_at
FROM empresas
ORDER BY created_at;


