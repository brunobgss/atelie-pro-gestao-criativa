-- ============================================
-- CORRIGIR USUÁRIO: dival7@gmail.com
-- Execute este script se o usuário não tiver empresa associada
-- ============================================

-- PASSO 1: Verificar se o usuário existe e obter o ID
DO $$
DECLARE
  v_user_id UUID;
  v_empresa_id UUID;
BEGIN
  -- Buscar ID do usuário
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'dival7@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário dival7@gmail.com não encontrado!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usuário encontrado: %', v_user_id;
  
  -- Verificar se já tem empresa associada
  SELECT empresa_id INTO v_empresa_id
  FROM user_empresas
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_empresa_id IS NOT NULL THEN
    RAISE NOTICE 'Usuário já tem empresa associada: %', v_empresa_id;
    RETURN;
  END IF;
  
  -- Buscar empresa com o mesmo email ou criar associação
  -- Primeiro, tentar encontrar empresa com mesmo email
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE email = 'dival7@gmail.com'
  LIMIT 1;
  
  -- Se não encontrar, usar a primeira empresa disponível
  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id
    FROM empresas
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa encontrada! É necessário criar uma empresa primeiro.';
    RETURN;
  END IF;
  
  -- Criar associação
  INSERT INTO user_empresas (user_id, empresa_id, role)
  VALUES (v_user_id, v_empresa_id, 'owner')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Associação criada com sucesso! User: %, Empresa: %', v_user_id, v_empresa_id;
END $$;

-- Verificar resultado
SELECT 
  u.email as usuario_email,
  ue.empresa_id,
  e.nome as empresa_nome,
  e.email as empresa_email,
  ue.role
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email = 'dival7@gmail.com';

