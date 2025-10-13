-- =====================================================
-- SCRIPT PARA CRIAR EMPRESA DE TESTE
-- =====================================================
-- Execute este script ANTES de inserir os dados

-- 1. Verificar se já existem empresas
DO $$
DECLARE
    empresa_count INTEGER;
BEGIN
    -- Contar empresas existentes
    SELECT COUNT(*) INTO empresa_count FROM empresas;
    
    IF empresa_count = 0 THEN
        RAISE NOTICE 'Nenhuma empresa encontrada. Criando empresa de teste...';
        
        -- Criar empresa de teste
        INSERT INTO empresas (nome, status, trial_ends_at, is_premium) VALUES
        ('Ateliê Pro - Empresa Teste', 'trial', NOW() + INTERVAL '7 days', false);
        
        RAISE NOTICE 'Empresa de teste criada com sucesso!';
    ELSE
        RAISE NOTICE 'Já existem % empresas no banco.', empresa_count;
    END IF;
END $$;

-- 2. Verificar empresas existentes
SELECT 
    'Empresas existentes:' as info,
    id,
    nome,
    status,
    trial_ends_at
FROM empresas
ORDER BY created_at;


