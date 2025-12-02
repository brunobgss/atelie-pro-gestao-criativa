-- 🔓 DESBLOQUEAR CONTA ADMIN E ATIVAR PREMIUM
-- Script para desbloquear e ativar premium para brunobgs1888@gmail.com
-- Execute este script no SQL Editor do Supabase

-- ==========================================
-- PARTE 1: Verificar dados atuais
-- ==========================================
SELECT 
    '📊 DADOS ATUAIS' as info,
    e.id as empresa_id,
    e.nome,
    e.email,
    e.is_premium,
    e.status,
    e.trial_end_date,
    e.created_at,
    u.id as user_id,
    u.email as user_email
FROM public.empresas e
LEFT JOIN public.user_empresas ue ON ue.empresa_id = e.id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE e.email = 'brunobgs1888@gmail.com' 
   OR u.email = 'brunobgs1888@gmail.com';

-- ==========================================
-- PARTE 2: Atualizar empresa para PREMIUM
-- ==========================================
UPDATE public.empresas
SET 
    is_premium = true,
    status = 'premium',
    trial_end_date = NOW() + INTERVAL '1 year', -- Premium por 1 ano
    updated_at = NOW()
WHERE id IN (
    -- Buscar empresa pelo email direto
    SELECT id FROM public.empresas WHERE email = 'brunobgs1888@gmail.com'
    UNION
    -- Buscar empresa vinculada ao usuário
    SELECT ue.empresa_id 
    FROM public.user_empresas ue
    INNER JOIN auth.users u ON u.id = ue.user_id
    WHERE u.email = 'brunobgs1888@gmail.com'
);

-- ==========================================
-- PARTE 3: Verificar resultado
-- ==========================================
SELECT 
    '✅ RESULTADO APÓS ATUALIZAÇÃO' as info,
    e.id as empresa_id,
    e.nome,
    e.email,
    e.is_premium,
    e.status,
    e.trial_end_date,
    CASE 
        WHEN e.trial_end_date > NOW() THEN 
            EXTRACT(DAYS FROM (e.trial_end_date - NOW()))::INTEGER || ' dias restantes'
        ELSE 'Expirado'
    END as dias_restantes,
    e.updated_at,
    u.email as user_email
FROM public.empresas e
LEFT JOIN public.user_empresas ue ON ue.empresa_id = e.id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE e.email = 'brunobgs1888@gmail.com' 
   OR u.email = 'brunobgs1888@gmail.com';

-- ==========================================
-- PARTE 4: Resumo final
-- ==========================================
SELECT 
    '📋 RESUMO FINAL' as info,
    COUNT(*) as total_empresas_encontradas,
    COUNT(CASE WHEN is_premium = true THEN 1 END) as empresas_premium,
    COUNT(CASE WHEN status = 'premium' THEN 1 END) as empresas_status_premium
FROM public.empresas
WHERE email = 'brunobgs1888@gmail.com'
   OR id IN (
       SELECT ue.empresa_id 
       FROM public.user_empresas ue
       INNER JOIN auth.users u ON u.id = ue.user_id
       WHERE u.email = 'brunobgs1888@gmail.com'
   );

