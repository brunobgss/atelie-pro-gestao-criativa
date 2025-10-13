-- =====================================================
-- SCRIPT ROBUSTO PARA CRIAR EMPRESA DE TESTE
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar se existem empresas
SELECT COUNT(*) as total_empresas FROM empresas;

-- 2. Se não houver empresas, vamos criar uma
-- Usando apenas as colunas essenciais que sabemos que existem
INSERT INTO empresas (nome) 
SELECT 'Ateliê Pro - Empresa Teste'
WHERE NOT EXISTS (SELECT 1 FROM empresas LIMIT 1);

-- 3. Agora vamos atualizar a empresa criada com os campos opcionais
-- (só se eles existirem)
UPDATE empresas 
SET 
    status = 'trial',
    trial_ends_at = NOW() + INTERVAL '7 days',
    is_premium = false
WHERE nome = 'Ateliê Pro - Empresa Teste'
AND id NOT IN (SELECT id FROM empresas WHERE trial_ends_at IS NOT NULL);

-- 4. Verificar o resultado final
SELECT 
    id,
    nome,
    created_at
FROM empresas
ORDER BY created_at;


