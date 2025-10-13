-- Script para corrigir usuários sem empresa associada
-- Execute este script no SQL Editor do Supabase se você já tem uma conta criada

-- 1. Primeiro, vamos verificar usuários sem empresa
SELECT 
  au.id as user_id,
  au.email,
  ue.empresa_id
FROM auth.users au
LEFT JOIN user_empresas ue ON au.id = ue.user_id
WHERE ue.empresa_id IS NULL;

-- 2. Para cada usuário sem empresa, vamos criar uma empresa e vincular
-- Substitua 'SEU_EMAIL@exemplo.com' pelo email do usuário que precisa ser corrigido

DO $$
DECLARE
  user_record RECORD;
  empresa_id UUID;
BEGIN
  -- Buscar usuários sem empresa associada
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN user_empresas ue ON au.id = ue.user_id
    WHERE ue.empresa_id IS NULL
  LOOP
    -- Criar empresa para o usuário
    INSERT INTO empresas (nome, email, responsavel)
    VALUES (
      'Empresa de ' || user_record.email,
      user_record.email,
      'Usuário'
    )
    RETURNING id INTO empresa_id;
    
    -- Vincular usuário à empresa
    INSERT INTO user_empresas (user_id, empresa_id, role)
    VALUES (user_record.id, empresa_id, 'owner');
    
    RAISE NOTICE 'Empresa criada e usuário % vinculado', user_record.email;
  END LOOP;
END $$;

-- 3. Verificar se a correção funcionou
SELECT 
  au.email,
  e.nome as empresa_nome,
  ue.role
FROM auth.users au
JOIN user_empresas ue ON au.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id;