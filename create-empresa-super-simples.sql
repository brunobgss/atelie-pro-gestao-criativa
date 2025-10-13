-- =====================================================
-- SCRIPT SUPER SIMPLES PARA CRIAR EMPRESA
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar quantas empresas existem
SELECT COUNT(*) as total_empresas FROM empresas;

-- 2. Criar empresa apenas com nome (campo obrigatório)
INSERT INTO empresas (nome) 
SELECT 'Ateliê Pro - Empresa Teste'
WHERE NOT EXISTS (SELECT 1 FROM empresas LIMIT 1);

-- 3. Verificar empresas existentes
SELECT 
    id,
    nome,
    created_at
FROM empresas
ORDER BY created_at;


