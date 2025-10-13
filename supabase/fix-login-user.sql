-- Script para corrigir usuário sem empresa associada
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar se você tem uma conta sem empresa
SELECT 
  au.id as user_id,
  au.email,
  ue.empresa_id
FROM auth.users au
LEFT JOIN user_empresas ue ON au.id = ue.user_id
WHERE ue.empresa_id IS NULL;

-- 2. Se você aparecer na lista acima, execute o script abaixo
-- Substitua 'SEU_EMAIL@exemplo.com' pelo seu email real

DO $$
DECLARE
  user_id UUID;
  empresa_id UUID;
BEGIN
  -- Buscar seu usuário pelo email (SUBSTITUA PELO SEU EMAIL)
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'SEU_EMAIL@exemplo.com'; -- SUBSTITUA AQUI
  
  IF user_id IS NOT NULL THEN
    -- Criar empresa para você
    INSERT INTO empresas (nome, email, responsavel)
    VALUES (
      'Minha Empresa',
      'SEU_EMAIL@exemplo.com', -- SUBSTITUA AQUI
      'Usuário'
    )
    RETURNING id INTO empresa_id;
    
    -- Vincular você à empresa
    INSERT INTO user_empresas (user_id, empresa_id, role)
    VALUES (user_id, empresa_id, 'owner');
    
    RAISE NOTICE 'Empresa criada e usuário vinculado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário não encontrado. Verifique o email.';
  END IF;
END $$;

-- 3. Verificar se funcionou
SELECT 
  au.email,
  e.nome as empresa_nome,
  ue.role
FROM auth.users au
JOIN user_empresas ue ON au.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id
WHERE au.email = 'SEU_EMAIL@exemplo.com'; -- SUBSTITUA AQUI


