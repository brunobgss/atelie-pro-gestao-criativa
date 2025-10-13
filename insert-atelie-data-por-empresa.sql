-- =====================================================
-- SCRIPT CORRIGIDO PARA INSERIR DADOS POR EMPRESA
-- =====================================================
-- Execute este script APÓS criar as tabelas

-- IMPORTANTE: Este script cria dados específicos para cada empresa
-- Cada empresa terá seus próprios dados isolados

-- 1. Primeiro, vamos criar dados para empresas existentes
-- (Se não houver empresas, crie uma empresa de teste primeiro)

-- Verificar se existem empresas
DO $$
DECLARE
    empresa_count INTEGER;
    empresa_id UUID;
BEGIN
    -- Contar empresas existentes
    SELECT COUNT(*) INTO empresa_count FROM empresas;
    
    IF empresa_count = 0 THEN
        RAISE NOTICE 'Nenhuma empresa encontrada. Crie uma empresa primeiro!';
        RETURN;
    END IF;
    
    -- Para cada empresa existente, criar dados específicos
    FOR empresa_id IN SELECT id FROM empresas LOOP
        RAISE NOTICE 'Criando dados para empresa: %', empresa_id;
        
        -- Inserir orçamentos específicos para esta empresa
        INSERT INTO atelie_quotes (code, customer_name, customer_phone, customer_email, date, observations, total_value, status, empresa_id) VALUES
        ('ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-001', 'Cliente A - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-1111', 'clienteA@empresa.com', '2025-01-09', 'Camisetas bordadas para empresa', 850.00, 'pending', empresa_id),
        ('ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-002', 'Escola Municipal - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-2222', 'contato@escola.edu.br', '2025-01-08', 'Uniformes escolares completos', 3500.00, 'approved', empresa_id),
        ('ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-003', 'Mariana Souza - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-3333', 'mariana@email.com', '2025-01-07', 'Bordados personalizados', 225.00, 'pending', empresa_id);
        
        -- Inserir itens dos orçamentos para esta empresa
        INSERT INTO atelie_quote_items (quote_id, description, quantity, value) VALUES
        -- ORC-001 desta empresa
        ((SELECT id FROM atelie_quotes WHERE code = 'ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-001' AND empresa_id = empresa_id), 'Camiseta bordada - Logo empresa', 20, 25.00),
        ((SELECT id FROM atelie_quotes WHERE code = 'ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-001' AND empresa_id = empresa_id), 'Camiseta polo - Bordado peito', 10, 35.00),
        
        -- ORC-002 desta empresa
        ((SELECT id FROM atelie_quotes WHERE code = 'ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-002' AND empresa_id = empresa_id), 'Camisa uniforme escolar', 50, 30.00),
        ((SELECT id FROM atelie_quotes WHERE code = 'ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-002' AND empresa_id = empresa_id), 'Calça uniforme escolar', 50, 40.00),
        
        -- ORC-003 desta empresa
        ((SELECT id FROM atelie_quotes WHERE code = 'ORC-' || SUBSTRING(empresa_id::text, 1, 8) || '-003' AND empresa_id = empresa_id), 'Toalha bordada personalizada', 5, 45.00);
        
        -- Inserir pedidos específicos para esta empresa
        INSERT INTO atelie_orders (code, customer_name, customer_phone, customer_email, type, description, value, paid, delivery_date, status, empresa_id) VALUES
        ('PED-' || SUBSTRING(empresa_id::text, 1, 8) || '-001', 'Maria Silva - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-1111', 'maria@empresa.com', 'Bordado Computadorizado', 'Logo empresa em 50 camisetas', 850.00, 425.00, '2025-01-12', 'Em produção', empresa_id),
        ('PED-' || SUBSTRING(empresa_id::text, 1, 8) || '-002', 'João Santos - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-2222', 'joao@escola.edu.br', 'Uniforme Escolar', '15 uniformes tam. P-M-G', 1200.00, 1200.00, '2025-01-10', 'Pronto', empresa_id),
        ('PED-' || SUBSTRING(empresa_id::text, 1, 8) || '-003', 'Ana Costa - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-3333', 'ana@email.com', 'Personalizado', 'Toalhinhas com bordado nome', 320.00, 160.00, '2025-01-15', 'Aguardando aprovação', empresa_id);
        
        -- Inserir clientes específicos para esta empresa
        INSERT INTO atelie_customers (name, phone, email, address, empresa_id) VALUES
        ('Roberto Alves - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-1111', 'roberto@empresa.com', 'Rua das Flores, 123 - São Paulo/SP', empresa_id),
        ('Escola Municipal - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-2222', 'contato@escola.edu.br', 'Av. Principal, 456 - São Paulo/SP', empresa_id),
        ('Mariana Souza - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-3333', 'mariana@email.com', 'Rua da Paz, 789 - São Paulo/SP', empresa_id),
        ('João Santos - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-4444', 'joao@loja.com', 'Rua Comercial, 321 - São Paulo/SP', empresa_id),
        ('Ana Costa - Empresa ' || SUBSTRING(empresa_id::text, 1, 8), '(11) 99999-5555', 'ana@restaurante.com', 'Av. Gastronômica, 654 - São Paulo/SP', empresa_id);
        
    END LOOP;
    
    RAISE NOTICE 'Dados criados para % empresas', empresa_count;
END $$;

-- 2. Verificar se os dados foram inseridos corretamente por empresa
SELECT 
    'Empresas com dados:' as info, 
    COUNT(DISTINCT empresa_id) as total_empresas 
FROM atelie_quotes;

SELECT 
    'Orçamentos por empresa:' as info,
    empresa_id,
    COUNT(*) as total_orcamentos
FROM atelie_quotes 
GROUP BY empresa_id;

SELECT 
    'Pedidos por empresa:' as info,
    empresa_id,
    COUNT(*) as total_pedidos
FROM atelie_orders 
GROUP BY empresa_id;

SELECT 
    'Clientes por empresa:' as info,
    empresa_id,
    COUNT(*) as total_clientes
FROM atelie_customers 
GROUP BY empresa_id;


