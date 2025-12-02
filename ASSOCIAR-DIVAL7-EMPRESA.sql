-- ============================================
-- ASSOCIAR USUÁRIO dival7@gmail.com À EMPRESA "Bainha EXpress"
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_empresa_id UUID := '809a0c50-6907-443f-b962-2ce11582a2f9'; -- ID da empresa "Bainha EXpress"
  v_associacao_existe BOOLEAN;
BEGIN
  -- 1. Buscar ID do usuário
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'dival7@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário dival7@gmail.com não encontrado no sistema!';
  END IF;
  
  RAISE NOTICE 'Usuário encontrado: %', v_user_id;
  
  -- 2. Verificar se já existe associação
  SELECT EXISTS(
    SELECT 1 
    FROM user_empresas 
    WHERE user_id = v_user_id 
    AND empresa_id = v_empresa_id
  ) INTO v_associacao_existe;
  
  IF v_associacao_existe THEN
    RAISE NOTICE 'Usuário já está associado à empresa!';
  ELSE
    -- 3. Criar associação
    INSERT INTO user_empresas (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'owner')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Associação criada com sucesso!';
  END IF;
  
  -- 4. Verificar se há outras associações e removê-las (opcional - manter apenas uma)
  -- Descomente as linhas abaixo se quiser remover outras associações
  /*
  DELETE FROM user_empresas
  WHERE user_id = v_user_id
  AND empresa_id != v_empresa_id;
  */
  
END $$;

-- Verificar resultado final
SELECT 
  u.email as usuario_email,
  u.id as user_id,
  ue.empresa_id,
  e.nome as empresa_nome,
  e.email as empresa_email,
  e.status as empresa_status,
  e.is_premium,
  ue.role
FROM auth.users u
LEFT JOIN user_empresas ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email = 'dival7@gmail.com';

