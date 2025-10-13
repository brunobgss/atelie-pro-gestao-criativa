-- 🔧 SCRIPT SIMPLES PARA ASSOCIAR USUÁRIO COM EMPRESA
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se existe a empresa "Ateliê Borges"
SELECT 'Empresas existentes:' as info, id, nome FROM empresas;

-- 2. Verificar se existe o usuário na tabela user_empresas
SELECT 'Usuários associados:' as info, user_id, empresa_id FROM user_empresas;

-- 3. Associar usuário atual com empresa (força a inserção)
INSERT INTO user_empresas (user_id, empresa_id)
SELECT 
    'c531cb70-efc1-4803-815f-e3d919f5dddd'::uuid as user_id,
    id as empresa_id
FROM empresas 
WHERE nome = 'Ateliê Borges'
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- 4. Verificar se a associação foi criada
SELECT 'Associação criada:' as info, user_id, empresa_id 
FROM user_empresas 
WHERE user_id = 'c531cb70-efc1-4803-815f-e3d919f5dddd'::uuid;

-- 5. Teste final - buscar empresa do usuário
SELECT 'Teste final:' as info, 
       ue.user_id, 
       ue.empresa_id, 
       e.nome as empresa_nome
FROM user_empresas ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.user_id = 'c531cb70-efc1-4803-815f-e3d919f5dddd'::uuid;


