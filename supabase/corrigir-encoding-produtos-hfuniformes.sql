-- =====================================================
-- CORREÇÃO DE ENCODING EM PRODUTOS - HF UNIFORMES
-- =====================================================
-- Este script corrige caracteres especiais (como ~ e ç)
-- que foram salvos com encoding incorreto nos produtos
-- da conta Hfuniformes12@gmail.com
-- =====================================================

-- =====================================================
-- PASSO 1: FAZER BACKUP
-- =====================================================
-- IMPORTANTE: Execute este comando PRIMEIRO para fazer backup!
-- Isso criará uma tabela temporária com todos os produtos da empresa

-- Primeiro, verificar se existem produtos antes do backup
SELECT 
  COUNT(*) as total_produtos_antes_backup,
  'Produtos existentes antes do backup' as status
FROM atelie_products 
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836';

-- Se a tabela de backup já existe, removê-la primeiro
DROP TABLE IF EXISTS atelie_products_backup_hfuniformes;

-- Backup completo dos produtos da empresa
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
-- Total de produtos esperado: 790
CREATE TABLE atelie_products_backup_hfuniformes AS 
SELECT * FROM atelie_products 
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836';

-- Verificar quantos produtos foram salvos no backup
SELECT 
  COUNT(*) as total_produtos_backup,
  'Backup criado com sucesso!' as status
FROM atelie_products_backup_hfuniformes;

-- Verificar alguns produtos do backup para confirmar
SELECT 
  id,
  name,
  empresa_id
FROM atelie_products_backup_hfuniformes
LIMIT 5;

-- =====================================================
-- PASSO 1.5: DIAGNÓSTICO - VERIFICAR SE EMPRESA EXISTE
-- =====================================================
-- Execute esta query PRIMEIRO para verificar se encontramos a empresa
-- e quantos produtos ela tem

-- Verificar se o usuário existe
SELECT 
  u.id as user_id,
  u.email,
  'Usuário encontrado' as status
FROM auth.users u
WHERE LOWER(u.email) = LOWER('Hfuniformes12@gmail.com');

-- Verificar se o usuário tem empresa associada
SELECT 
  ue.user_id,
  ue.empresa_id,
  e.nome as nome_empresa,
  u.email,
  'Empresa associada encontrada' as status
FROM user_empresas ue
JOIN auth.users u ON u.id = ue.user_id
LEFT JOIN empresas e ON e.id = ue.empresa_id
WHERE LOWER(u.email) = LOWER('Hfuniformes12@gmail.com');

-- Verificar quantos produtos existem para essa empresa
SELECT 
  ue.empresa_id,
  e.nome as nome_empresa,
  COUNT(p.id) as total_produtos,
  'Produtos encontrados' as status
FROM user_empresas ue
JOIN auth.users u ON u.id = ue.user_id
LEFT JOIN empresas e ON e.id = ue.empresa_id
LEFT JOIN atelie_products p ON p.empresa_id = ue.empresa_id
WHERE LOWER(u.email) = LOWER('Hfuniformes12@gmail.com')
GROUP BY ue.empresa_id, e.nome;

-- =====================================================
-- PASSO 2: IDENTIFICAR A EMPRESA
-- =====================================================
-- Execute esta query para encontrar o empresa_id
SELECT 
  ue.empresa_id,
  e.nome as nome_empresa,
  u.email as email_usuario,
  COUNT(p.id) as total_produtos
FROM user_empresas ue
JOIN auth.users u ON u.id = ue.user_id
JOIN empresas e ON e.id = ue.empresa_id
LEFT JOIN atelie_products p ON p.empresa_id = ue.empresa_id
WHERE LOWER(u.email) = LOWER('Hfuniformes12@gmail.com')
GROUP BY ue.empresa_id, e.nome, u.email;

-- =====================================================
-- PASSO 3: IDENTIFICAR PRODUTOS COM PROBLEMAS
-- =====================================================
-- Execute esta query para ver quais produtos têm problemas de encoding
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
SELECT 
  id,
  name,
  CASE 
    WHEN name LIKE '%Ã%' THEN 'Possível problema (contém Ã)'
    WHEN name LIKE '%â€%' THEN 'Possível problema (contém caracteres estranhos)'
    ELSE 'OK'
  END as status
FROM atelie_products
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND (name LIKE '%Ã%' OR name LIKE '%â€%')
ORDER BY name
LIMIT 50;

-- =====================================================
-- PASSO 4: CORREÇÕES ESPECÍFICAS
-- =====================================================
-- Execute estas queries UMA POR VEZ e verifique os resultados antes de continuar

-- 4.1: Corrigir padrões específicos encontrados (Ãƒ e Ã‡)
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
-- Padrão 1: "BLUSÃƒO" -> "BLUSÃO" (Ãƒ = ã)
UPDATE atelie_products
SET name = REPLACE(name, 'Ãƒ', 'ã')
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%Ãƒ%';

-- Padrão 2: "CALÃ‡A" -> "CALÇA" (Ã‡ = ç)
UPDATE atelie_products
SET name = REPLACE(name, 'Ã‡', 'ç')
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%Ã‡%';

-- 4.1.1: Corrigir "~" que foi salvo como "Ã" (quando não é parte de outro caractere)
-- ATENÇÃO: Esta query corrige "Ã" para "~" apenas quando não faz parte de "á", "é", "í", "ó", "ú", "ã", "õ", "ç"
UPDATE atelie_products
SET name = REPLACE(name, 'Ã', '~')
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%Ã%' 
AND name NOT LIKE '%Ã¡%'  -- não é "á"
AND name NOT LIKE '%Ã©%'   -- não é "é"
AND name NOT LIKE '%Ã­%'   -- não é "í"
AND name NOT LIKE '%Ã³%'   -- não é "ó"
AND name NOT LIKE '%Ãº%'   -- não é "ú"
AND name NOT LIKE '%Ã£%'   -- não é "ã"
AND name NOT LIKE '%Ãµ%'   -- não é "õ"
AND name NOT LIKE '%Ã§%';  -- não é "ç"

-- Verificar quantos produtos foram corrigidos
SELECT 
  COUNT(*) as produtos_corrigidos,
  'Correção de ~ aplicada' as status
FROM atelie_products
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%~%';

-- 4.2: Corrigir "ç" que foi salvo como "Ã§"
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
UPDATE atelie_products
SET name = REPLACE(name, 'Ã§', 'ç')
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%Ã§%';

-- Verificar quantos produtos foram corrigidos
SELECT 
  COUNT(*) as produtos_corrigidos,
  'Correção de ç aplicada' as status
FROM atelie_products
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%ç%';

-- 4.3: Corrigir outros acentos comuns
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
UPDATE atelie_products
SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(
  name,
  'Ã¡', 'á'),  -- á
  'Ã©', 'é'),  -- é
  'Ã­', 'í'),  -- í
  'Ã³', 'ó'),  -- ó
  'Ãº', 'ú'),  -- ú
  'Ã£', 'ã'),  -- ã
  'Ãµ', 'õ'),  -- õ
  'Ã‰', 'É')   -- É
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND name LIKE '%Ã%';

-- =====================================================
-- PASSO 5: VERIFICAR RESULTADOS
-- =====================================================
-- Execute esta query para ver se ainda há produtos com problemas
-- EMPRESA_ID: 8a9c1c7e-81f1-4186-ac89-ed584f549836
SELECT 
  id,
  name,
  'Ainda tem problema' as status
FROM atelie_products
WHERE empresa_id = '8a9c1c7e-81f1-4186-ac89-ed584f549836'
AND (name LIKE '%Ã%' OR name LIKE '%â€%')
ORDER BY name
LIMIT 20;

-- =====================================================
-- PASSO 6: ESTATÍSTICAS FINAIS
-- =====================================================
-- Ver estatísticas após as correções
DO $$
DECLARE
  empresa_id_param UUID;
  total_produtos INTEGER;
  produtos_com_problema INTEGER;
BEGIN
  -- Usar empresa_id conhecido
  empresa_id_param := '8a9c1c7e-81f1-4186-ac89-ed584f549836'::UUID;
  
  SELECT COUNT(*) INTO total_produtos 
  FROM atelie_products 
  WHERE empresa_id = empresa_id_param;
  
  SELECT COUNT(*) INTO produtos_com_problema 
  FROM atelie_products 
  WHERE empresa_id = empresa_id_param
    AND (name LIKE '%Ã%' OR name LIKE '%â€%');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTATÍSTICAS DE CORREÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de produtos: %', total_produtos;
  RAISE NOTICE 'Produtos com problema restantes: %', produtos_com_problema;
  IF total_produtos > 0 THEN
    RAISE NOTICE 'Percentual corrigido: %%%', ROUND(((total_produtos - produtos_com_problema)::NUMERIC / total_produtos * 100)::NUMERIC, 2);
  END IF;
  RAISE NOTICE '========================================';
  
  IF produtos_com_problema > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Ainda existem produtos com problemas. Revise manualmente:';
    FOR produto IN 
      SELECT name 
      FROM atelie_products
      WHERE empresa_id = empresa_id_param
        AND (name LIKE '%Ã%' OR name LIKE '%â€%')
      LIMIT 10
    LOOP
      RAISE NOTICE '  - %', produto.name;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Todos os produtos foram corrigidos!';
  END IF;
END $$;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
-- 
-- 1. FAÇA BACKUP PRIMEIRO (PASSO 1)
--    Execute o comando CREATE TABLE do PASSO 1
--    Verifique se o backup foi criado com sucesso
--
-- 2. IDENTIFIQUE A EMPRESA (PASSO 2)
--    Execute a query do PASSO 2 e anote o empresa_id
--
-- 3. VERIFIQUE OS PROBLEMAS (PASSO 3)
--    Execute a query do PASSO 3 para ver quais produtos têm problemas
--
-- 4. APLIQUE AS CORREÇÕES (PASSO 4)
--    Execute as queries do PASSO 4 UMA POR VEZ
--    Verifique os resultados após cada correção
--
-- 5. VERIFIQUE OS RESULTADOS (PASSO 5)
--    Execute a query do PASSO 5 para ver se ainda há problemas
--
-- 6. VEJA AS ESTATÍSTICAS (PASSO 6)
--    Execute o bloco DO do PASSO 6 para ver um resumo
--
-- =====================================================
-- RESTAURAR BACKUP (SE NECESSÁRIO)
-- =====================================================
-- Se algo der errado, você pode restaurar o backup:
-- 
-- DELETE FROM atelie_products 
-- WHERE empresa_id = (SELECT empresa_id FROM atelie_products_backup_hfuniformes LIMIT 1);
-- 
-- INSERT INTO atelie_products 
-- SELECT * FROM atelie_products_backup_hfuniformes;
--
-- =====================================================
-- DELETAR BACKUP (APÓS CONFIRMAR QUE TUDO ESTÁ OK)
-- =====================================================
-- Após confirmar que tudo está funcionando corretamente:
-- DROP TABLE IF EXISTS atelie_products_backup_hfuniformes;

