-- =====================================================
-- SCRIPT PARA INSERIR DADOS REAIS DO ATELIÊ PRO
-- =====================================================
-- Execute este script APÓS criar as tabelas

-- 1. Inserir dados de exemplo de orçamentos
INSERT INTO atelie_quotes (code, customer_name, customer_phone, customer_email, date, observations, total_value, status, empresa_id) VALUES
('ORC-001', 'Roberto Alves', '(11) 99999-1111', 'roberto@empresa.com', '2025-01-09', 'Camisetas bordadas para empresa', 850.00, 'pending', (SELECT id FROM empresas LIMIT 1)),
('ORC-002', 'Escola Municipal', '(11) 99999-2222', 'contato@escola.edu.br', '2025-01-08', 'Uniformes escolares completos', 3500.00, 'approved', (SELECT id FROM empresas LIMIT 1)),
('ORC-003', 'Mariana Souza', '(11) 99999-3333', 'mariana@email.com', '2025-01-07', 'Bordados personalizados', 225.00, 'pending', (SELECT id FROM empresas LIMIT 1)),
('ORC-004', 'João Santos', '(11) 99999-4444', 'joao@loja.com', '2025-01-06', 'Bordado em toalhas de mesa', 480.00, 'approved', (SELECT id FROM empresas LIMIT 1)),
('ORC-005', 'Ana Costa', '(11) 99999-5555', 'ana@restaurante.com', '2025-01-05', 'Uniformes para funcionários', 1200.00, 'completed', (SELECT id FROM empresas LIMIT 1));

-- 2. Inserir itens dos orçamentos
INSERT INTO atelie_quote_items (quote_id, description, quantity, value) VALUES
-- ORC-001
((SELECT id FROM atelie_quotes WHERE code = 'ORC-001'), 'Camiseta bordada - Logo empresa', 20, 25.00),
((SELECT id FROM atelie_quotes WHERE code = 'ORC-001'), 'Camiseta polo - Bordado peito', 10, 35.00),

-- ORC-002
((SELECT id FROM atelie_quotes WHERE code = 'ORC-002'), 'Camisa uniforme escolar', 50, 30.00),
((SELECT id FROM atelie_quotes WHERE code = 'ORC-002'), 'Calça uniforme escolar', 50, 40.00),

-- ORC-003
((SELECT id FROM atelie_quotes WHERE code = 'ORC-003'), 'Toalha bordada personalizada', 5, 45.00),

-- ORC-004
((SELECT id FROM atelie_quotes WHERE code = 'ORC-004'), 'Toalha de mesa bordada', 12, 40.00),

-- ORC-005
((SELECT id FROM atelie_quotes WHERE code = 'ORC-005'), 'Camiseta uniforme funcionário', 15, 35.00),
((SELECT id FROM atelie_quotes WHERE code = 'ORC-005'), 'Calça uniforme funcionário', 15, 45.00);

-- 3. Inserir dados de exemplo de pedidos
INSERT INTO atelie_orders (code, customer_name, customer_phone, customer_email, type, description, value, paid, delivery_date, status, empresa_id) VALUES
('PED-001', 'Maria Silva', '(11) 99999-1111', 'maria@empresa.com', 'Bordado Computadorizado', 'Logo empresa em 50 camisetas', 850.00, 425.00, '2025-01-12', 'Em produção', (SELECT id FROM empresas LIMIT 1)),
('PED-002', 'João Santos', '(11) 99999-2222', 'joao@escola.edu.br', 'Uniforme Escolar', '15 uniformes tam. P-M-G', 1200.00, 1200.00, '2025-01-10', 'Pronto', (SELECT id FROM empresas LIMIT 1)),
('PED-003', 'Ana Costa', '(11) 99999-3333', 'ana@email.com', 'Personalizado', 'Toalhinhas com bordado nome', 320.00, 160.00, '2025-01-15', 'Aguardando aprovação', (SELECT id FROM empresas LIMIT 1)),
('PED-004', 'Pedro Oliveira', '(11) 99999-4444', 'pedro@loja.com', 'Camiseta Estampada', '30 camisetas estampa personalizada', 600.00, 300.00, '2025-01-13', 'Em produção', (SELECT id FROM empresas LIMIT 1)),
('PED-005', 'Carla Mendes', '(11) 99999-5555', 'carla@restaurante.com', 'Uniforme Profissional', '20 uniformes para funcionários', 800.00, 400.00, '2025-01-14', 'Pronto', (SELECT id FROM empresas LIMIT 1));

-- 4. Inserir dados de exemplo de clientes
INSERT INTO atelie_customers (name, phone, email, address, empresa_id) VALUES
('Roberto Alves', '(11) 99999-1111', 'roberto@empresa.com', 'Rua das Flores, 123 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Escola Municipal', '(11) 99999-2222', 'contato@escola.edu.br', 'Av. Principal, 456 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Mariana Souza', '(11) 99999-3333', 'mariana@email.com', 'Rua da Paz, 789 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('João Santos', '(11) 99999-4444', 'joao@loja.com', 'Rua Comercial, 321 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Ana Costa', '(11) 99999-5555', 'ana@restaurante.com', 'Av. Gastronômica, 654 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Maria Silva', '(11) 99999-6666', 'maria@empresa.com', 'Rua Industrial, 987 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Pedro Oliveira', '(11) 99999-7777', 'pedro@loja.com', 'Rua do Comércio, 147 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1)),
('Carla Mendes', '(11) 99999-8888', 'carla@restaurante.com', 'Av. dos Sabores, 258 - São Paulo/SP', (SELECT id FROM empresas LIMIT 1));

-- 5. Verificar se os dados foram inseridos corretamente
SELECT 'Orçamentos inseridos:' as info, COUNT(*) as total FROM atelie_quotes;
SELECT 'Itens de orçamentos inseridos:' as info, COUNT(*) as total FROM atelie_quote_items;
SELECT 'Pedidos inseridos:' as info, COUNT(*) as total FROM atelie_orders;
SELECT 'Clientes inseridos:' as info, COUNT(*) as total FROM atelie_customers;


