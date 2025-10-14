-- Script para verificar e corrigir o sistema de cadastro
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se as tabelas existem e têm as colunas necessárias
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('empresas', 'user_empresas', 'auth.users')
ORDER BY table_name, ordinal_position;

-- 2. Verificar políticas RLS atuais
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('empresas', 'user_empresas')
ORDER BY tablename, policyname;

-- 3. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('empresas', 'user_empresas');

-- 4. Corrigir políticas RLS se necessário
-- Desabilitar RLS temporariamente para empresas
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS temporariamente para user_empresas
ALTER TABLE user_empresas DISABLE ROW LEVEL SECURITY;

-- 5. Criar políticas corretas para empresas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert empresas" ON empresas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can select empresas" ON empresas
  FOR SELECT USING (true);

CREATE POLICY "Users can update empresas" ON empresas
  FOR UPDATE USING (true);

-- 6. Criar políticas corretas para user_empresas
ALTER TABLE user_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert user_empresas" ON user_empresas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can select user_empresas" ON user_empresas
  FOR SELECT USING (true);

CREATE POLICY "Users can update user_empresas" ON user_empresas
  FOR UPDATE USING (true);

-- 7. Verificar se a coluna trial_end_date existe na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'empresas' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE empresas ADD COLUMN trial_end_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Coluna trial_end_date adicionada à tabela empresas';
  ELSE
    RAISE NOTICE 'Coluna trial_end_date já existe na tabela empresas';
  END IF;
END $$;

-- 8. Verificar se a coluna cpf_cnpj existe na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'empresas' AND column_name = 'cpf_cnpj'
  ) THEN
    ALTER TABLE empresas ADD COLUMN cpf_cnpj VARCHAR(20);
    RAISE NOTICE 'Coluna cpf_cnpj adicionada à tabela empresas';
  ELSE
    RAISE NOTICE 'Coluna cpf_cnpj já existe na tabela empresas';
  END IF;
END $$;

-- 9. Teste de inserção (simular cadastro)
-- Este teste deve funcionar após as correções
DO $$
DECLARE
  test_user_id UUID;
  test_empresa_id UUID;
  trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Simular criação de usuário (não vamos criar de verdade)
  test_user_id := gen_random_uuid();
  
  -- Calcular data de fim do trial (7 dias a partir de agora)
  trial_end_date := NOW() + INTERVAL '7 days';
  
  -- Tentar criar empresa
  INSERT INTO empresas (nome, email, telefone, responsavel, cpf_cnpj, trial_end_date)
  VALUES (
    'Empresa Teste',
    'teste@exemplo.com',
    '11999999999',
    'Usuário Teste',
    '12345678901',
    trial_end_date
  )
  RETURNING id INTO test_empresa_id;
  
  -- Tentar vincular usuário à empresa
  INSERT INTO user_empresas (user_id, empresa_id, role)
  VALUES (test_user_id, test_empresa_id, 'owner');
  
  -- Limpar dados de teste
  DELETE FROM user_empresas WHERE empresa_id = test_empresa_id;
  DELETE FROM empresas WHERE id = test_empresa_id;
  
  RAISE NOTICE 'Teste de cadastro realizado com sucesso!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro no teste de cadastro: %', SQLERRM;
END $$;

-- 10. Verificar resultado final
SELECT 
  'empresas' as tabela,
  COUNT(*) as total_registros
FROM empresas
UNION ALL
SELECT 
  'user_empresas' as tabela,
  COUNT(*) as total_registros
FROM user_empresas;
