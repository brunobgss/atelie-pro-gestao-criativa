-- Atualizar dados do usuário brunobgs1888@gmail.com
-- Execute este script APÓS executar o script "verificar-e-adicionar-coluna.sql"

-- Primeiro, vamos encontrar o ID da empresa do usuário
-- (Execute este SELECT para ver os dados atuais)
SELECT 
  e.id,
  e.nome,
  e.email,
  e.telefone,
  e.responsavel,
  e.cpf_cnpj,
  ue.user_id
FROM empresas e
JOIN user_empresas ue ON e.id = ue.empresa_id
WHERE e.email = 'brunobgs1888@gmail.com';

-- Atualizar os dados da empresa com CPF e telefone
UPDATE empresas 
SET 
  cpf_cnpj = '91875099620',
  telefone = '5535997610231',
  updated_at = NOW()
WHERE email = 'brunobgs1888@gmail.com';

-- Verificar se a atualização foi bem-sucedida
SELECT 
  e.id,
  e.nome,
  e.email,
  e.telefone,
  e.responsavel,
  e.cpf_cnpj,
  e.updated_at
FROM empresas e
WHERE e.email = 'brunobgs1888@gmail.com';
