-- Verificar estrutura da tabela empresas e adicionar coluna cpf_cnpj se necessário
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar a estrutura atual da tabela empresas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'empresas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se a coluna cpf_cnpj existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'empresas' 
  AND column_name = 'cpf_cnpj'
  AND table_schema = 'public'
) as cpf_cnpj_exists;

-- 3. Adicionar coluna cpf_cnpj se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'empresas' 
    AND column_name = 'cpf_cnpj'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE empresas ADD COLUMN cpf_cnpj VARCHAR(20);
    RAISE NOTICE 'Coluna cpf_cnpj adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna cpf_cnpj já existe!';
  END IF;
END $$;

-- 4. Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'empresas' 
AND table_schema = 'public'
ORDER BY ordinal_position;
