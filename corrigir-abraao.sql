-- Script SQL para corrigir acesso do usuário abraaoelionai032@gmail.com
-- Execute diretamente no SQL Editor do Supabase

-- Passo 1: Verificar empresa atual
SELECT 
    id,
    nome,
    is_premium,
    status,
    trial_end_date,
    created_at,
    updated_at
FROM empresas
WHERE nome LIKE '%Ms uniformes%' OR nome LIKE '%Alpha%'
ORDER BY created_at DESC;

-- Passo 2: Atualizar empresa para garantir premium ativo
UPDATE empresas
SET 
    is_premium = true,
    status = 'active',
    trial_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE id = 'a6b7fc5c-a957-411f-8ac6-524be28ce901';

-- Passo 3: Verificar atualização
SELECT 
    id,
    nome,
    is_premium,
    status,
    trial_end_date,
    updated_at
FROM empresas
WHERE id = 'a6b7fc5c-a957-411f-8ac6-524be28ce901';

-- Verificar vinculação usuário-empresa
SELECT 
    ue.id,
    ue.user_id,
    ue.empresa_id,
    e.nome as empresa_nome,
    e.is_premium,
    e.status
FROM user_empresas ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE e.id = 'a6b7fc5c-a957-411f-8ac6-524be28ce901';
