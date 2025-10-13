-- =====================================================
-- SCRIPT PARA LIMPAR E INSERIR DADOS DO ATELIÊ
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos limpar os dados existentes (se houver)
DELETE FROM atelie_quote_items;
DELETE FROM atelie_quotes;
DELETE FROM atelie_orders;
DELETE FROM atelie_customers;

-- 2. Verificar se a empresa existe
SELECT id as empresa_id FROM empresas LIMIT 1;

-- 3. Inserir orçamentos para a empresa existente
INSERT INTO atelie_quotes (code, customer_name, customer_phone, customer_email, date, observations, total_value, status, empresa_id) VALUES
('ORC-001', 'Roberto Alves', '(11) 99999-1111', 'roberto@empresa.com', '2025-01-09', 'Camisetas bordadas para empresa', 850.00, 'pending', (SELECT id FROM empresas LIMIT 1)),
('ORC-002', 'Escola Municipal', '(11) 99999-2222', 'contato@escola.edu.br', '2025-01-08', 'Uniformes escolares completos', 3500.00, 'approved', (SELECT id FROM empresas LIMIT 1)),
('ORC-003', 'Mariana Souza', '(11) 99999-3333', 'mariana@email.com', '2025-01-07', 'Bordados personalizados', 225.00, 'pending', (SELECT id FROM empresas LIMIT 1));

-- 4. Inserir itens dos orçamentos
INSERT INTO atelie_quote_items (quote_id, description, quantity, value) VALUES
-- ORC-001
((SELECT id FROM atelie_quotes WHERE code = 'ORC-001'), 'Camiseta bordada - Logo empresa', 20, 25.00),
((SELECT id FROM atelie_quotes WHERE code = 'ORC-001'), 'Camiseta polo - Bordado peito', 10, 35.00),

-- ORC-002
((SELECT id FROM atelie_quotes WHERE code = 'ORC-002'), 'Camisa uniforme escolar', 50, 30.00),
((SELECT id FROM atelie_quotes WHERE code = 'ORC-002'), 'Calça uniforme escolar', 50, 40.00),

-- ORC-003
((SELECT id FROM atelie_quotes WHERE code = 'ORC-003'), 'Toalha bordada personalizada', 5, 45.00);

-- 5. Inserir pedidos
INSERT INTO atelie_orders (code, customer_name, customer_phone, customer_email, type, description, value, paid, delivery_date, status, empresa_id) VALUES
('PED-001', 'Maria Silva', '(11) 99999-1111', 'maria@empresa.com', 'Bordado Computadorizado', 'Logo empresa em 50 camisetas', 850.00, 425.00, '2025-01-12', 'Em produção', (SELECT id FROM empresas LIMIT 1)),
('PED-002', 'João Santos', '(11) 99999-2222', 'joao@escola.edu.br', 'Uniforme Escolar', '15 uniformes tam. P-M-G', 1200.00, 1200.00, '2025-01-10', 'Pronto', (SELECT id FROM empresas LIMIT 1)),
('PED-003', 'Ana Costa', '(11) 99999-3333', 'ana@email.com', 'Personalizado', 'Toalhinhas com bordado nome', 320.00, 160.00, '2025-01-15', 'Aguardando aprovação', (SELECT id FROM empresas LIMIT 1));

-- 6. Inserir clientes
INSERT INTO atelie_customers (name, phone, email, address, empresa_id) VALUES
('Roberto Alves', '(11) 99999-1111', 'roberto@empresa.com', 'Rua das Flores, 123 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Escola Municipal', '(11) 99999-2222', 'contato@escola.edu.br', 'Av. Principal, 456 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Mariana Souza', '(11) 99999-3333', 'mariana@email.com', 'Rua da Paz, 789 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('João Santos', '(11) 99999-4444', 'joao@loja.com', 'Rua Comercial, 321 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Ana Costa', '(11) 99999-5555', 'ana@restaurante.com', 'Av. Gastronômica, 654 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1));

-- 7. Verificar se os dados foram inseridos corretamente
SELECT 'Orçamentos inseridos:' as info, COUNT(*) as total FROM atelie_quotes;
SELECT 'Itens de orçamentos inseridos:' as info, COUNT(*) as total FROM atelie_quote_items;
SELECT 'Pedidos inseridos:' as info, COUNT(*) as total FROM atelie_orders;
SELECT 'Clientes inseridos:' as info, COUNT(*) as total FROM atelie_customers;

-- 8. Verificar dados por empresa
SELECT 
    'Dados por empresa:' as info,
    empresa_id,
    COUNT(*) as total_orcamentos
FROM atelie_quotes 
GROUP BY empresa_id;


