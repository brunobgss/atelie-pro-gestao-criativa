-- 🔗 CORRIGIR ASSOCIAÇÃO USUÁRIO-EMPRESA
-- Este script associa o usuário logado com a empresa "Ateliê Borges"

-- 1. Verificar usuário atual
SELECT 'Usuário atual:' as info, auth.uid() as user_id;

-- 2. Verificar empresas disponíveis
SELECT 'Empresas disponíveis:' as info, id, nome FROM empresas;

-- 3. Verificar associações existentes
SELECT 'Associações existentes:' as info, user_id, empresa_id 
FROM user_empresas;

-- 4. Associar usuário atual com a primeira empresa (Ateliê Borges)
INSERT INTO user_empresas (user_id, empresa_id)
SELECT 
    auth.uid() as user_id,
    e.id as empresa_id
FROM empresas e
WHERE e.nome = 'Ateliê Borges'
AND NOT EXISTS (
    SELECT 1 FROM user_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = e.id
);

-- 5. Verificar se a associação foi criada
SELECT 'Associação criada:' as info, user_id, empresa_id 
FROM user_empresas 
WHERE user_id = auth.uid();

-- 6. Testar se consegue buscar empresa do usuário
SELECT 'Teste de busca:' as info, ue.user_id, ue.empresa_id, e.nome as empresa_nome
FROM user_empresas ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.user_id = auth.uid();


