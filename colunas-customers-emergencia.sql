-- EMERGÊNCIA: Script mais simples possível
-- Execute no Supabase SQL Editor

-- Comando único para adicionar todas as colunas (execute linha por linha se necessário)
ALTER TABLE customers ADD COLUMN cpf_cnpj VARCHAR(20);
ALTER TABLE customers ADD COLUMN endereco_logradouro VARCHAR(255);
ALTER TABLE customers ADD COLUMN endereco_numero VARCHAR(20);
ALTER TABLE customers ADD COLUMN endereco_complemento VARCHAR(255);
ALTER TABLE customers ADD COLUMN endereco_bairro VARCHAR(100);
ALTER TABLE customers ADD COLUMN endereco_cidade VARCHAR(100);
ALTER TABLE customers ADD COLUMN endereco_uf VARCHAR(2);
ALTER TABLE customers ADD COLUMN endereco_cep VARCHAR(10);