-- 🔧 CORREÇÃO: Ajustar trial baseado em created_at + 7 dias
-- O trial deve ser calculado a partir da data de criação da conta

-- ==========================================
-- PARTE 1: Corrigir trial_end_date para created_at + 7 dias
-- ==========================================

-- Atualizar trial_end_date para corresponder a created_at + 7 dias
-- IMPORTANTE: NÃO alterar trial_end_date de premium users (ele representa expiração do plano)
UPDATE public.empresas
SET 
    trial_end_date = created_at + INTERVAL '7 days',
    updated_at = NOW()
WHERE 
    (is_premium IS NULL OR is_premium = false)  -- APENAS não premium
    AND created_at IS NOT NULL
    AND (
        -- trial_end_date não existe
        trial_end_date IS NULL
        OR
        -- trial_end_date não corresponde a created_at + 7 dias (mais de 1 dia de diferença)
        ABS(EXTRACT(DAYS FROM (trial_end_date - (created_at + INTERVAL '7 days')))) > 1
    );

-- ==========================================
-- PARTE 2: Corrigir status baseado em created_at + 7 dias
-- ==========================================

-- Marcar como expired se mais de 7 dias desde criação
UPDATE public.empresas
SET 
    status = 'expired',
    updated_at = NOW()
WHERE 
    (is_premium IS NULL OR is_premium = false)
    AND created_at IS NOT NULL
    AND (created_at + INTERVAL '7 days') < NOW()  -- Mais de 7 dias desde criação
    AND (status = 'trial' OR status IS NULL);  -- Mas ainda está como trial

-- Marcar como trial se ainda está dentro dos 7 dias
UPDATE public.empresas
SET 
    status = 'trial',
    updated_at = NOW()
WHERE 
    (is_premium IS NULL OR is_premium = false)
    AND created_at IS NOT NULL
    AND (created_at + INTERVAL '7 days') >= NOW()  -- Ainda dentro dos 7 dias
    AND status = 'expired';  -- Mas está marcado como expired

-- ==========================================
-- PARTE 3: Verificação após correção
-- ==========================================

SELECT 
    '📊 APÓS CORREÇÃO' as info,
    COUNT(*) as total_usuarios_nao_premium,
    COUNT(CASE WHEN (created_at + INTERVAL '7 days') < NOW() AND status = 'expired' THEN 1 END) as trial_expirado_correto,
    COUNT(CASE WHEN (created_at + INTERVAL '7 days') >= NOW() AND status = 'trial' THEN 1 END) as trial_ativo_correto,
    COUNT(CASE WHEN (created_at + INTERVAL '7 days') < NOW() AND (status = 'trial' OR status IS NULL) THEN 1 END) as ainda_problema_expirado,
    COUNT(CASE WHEN (created_at + INTERVAL '7 days') >= NOW() AND status = 'expired' THEN 1 END) as ainda_problema_ativo
FROM public.empresas e
WHERE (is_premium IS NULL OR is_premium = false)
    AND created_at IS NOT NULL;

-- Listar alguns exemplos
SELECT 
    u.email,
    e.nome,
    e.created_at,
    e.trial_end_date,
    (e.created_at + INTERVAL '7 days') as deveria_ser_trial_end_date,
    e.status,
    EXTRACT(DAYS FROM (NOW() - e.created_at)) as dias_desde_criacao,
    CASE 
        WHEN (e.created_at + INTERVAL '7 days') < NOW() THEN 'EXPIRADO'
        ELSE 'ATIVO'
    END as status_baseado_em_created_at
FROM auth.users u
JOIN public.user_empresas ue ON u.id = ue.user_id
JOIN public.empresas e ON ue.empresa_id = e.id
WHERE (e.is_premium IS NULL OR e.is_premium = false)
    AND e.created_at IS NOT NULL
ORDER BY e.created_at ASC
LIMIT 20;

