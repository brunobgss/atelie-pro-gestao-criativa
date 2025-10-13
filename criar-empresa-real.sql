-- Criar empresa real para o usuário
-- Substitua os valores pelos seus dados reais

INSERT INTO empresas (
  id,
  nome,
  email,
  telefone,
  responsavel,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Ateliê Borges',
  'brunobgs1888@gmail.com',
  '(35) 99761-0231',
  'BRUNO',
  NOW(),
  NOW()
);

-- Depois execute este comando para vincular ao usuário:
-- INSERT INTO user_empresas (user_id, empresa_id) 
-- VALUES ('SEU_USER_ID', 'ID_DA_EMPRESA_CRIADA');
