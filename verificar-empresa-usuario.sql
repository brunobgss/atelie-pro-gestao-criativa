-- Verificar se existe empresa para o usuário
SELECT 
  ue.user_id,
  ue.empresa_id,
  e.nome,
  e.email,
  e.telefone,
  e.responsavel,
  e.created_at
FROM user_empresas ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = 'SEU_USER_ID_AQUI';

-- Substitua 'SEU_USER_ID_AQUI' pelo ID do seu usuário
