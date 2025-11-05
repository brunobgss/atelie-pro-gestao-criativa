-- 🔧 CORREÇÃO DOS DADOS EXISTENTES (Execute ANTES do script de sincronização)
-- Este script corrige todos os dados existentes antes de ativar a sincronização automática

-- ==========================================
-- ANTES: Verificar quantos registros precisam correção
-- ==========================================

SELECT 
    '📊 ANTES DA CORREÇÃO' as etapa,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date < NOW() 
               AND (status = 'trial' OR status IS NULL) 
          THEN 1 END) as problema_1_trial_expirado,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date >= NOW() 
               AND status = 'expired' 
          THEN 1 END) as problema_2_trial_ativo_expired,
    COUNT(CASE WHEN is_premium = true 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date < NOW() 
          THEN 1 END) as problema_3_premium_expirado
FROM public.empresas;

-- ==========================================
-- CORREÇÃO 1: Trials expirados → status = 'expired'
-- ==========================================

UPDATE public.empresas
SET 
    status = 'expired',
    updated_at = NOW()
WHERE 
    (is_premium IS NULL OR is_premium = false)  -- Não é premium
    AND trial_end_date IS NOT NULL 
    AND trial_end_date < NOW()  -- Trial expirado
    AND (status = 'trial' OR status IS NULL);  -- Mas status ainda é trial ou NULL

-- ==========================================
-- CORREÇÃO 2: Trials ativos → status = 'trial'
-- ==========================================

UPDATE public.empresas
SET 
    status = 'trial',
    updated_at = NOW()
WHERE 
    (is_premium IS NULL OR is_premium = false)  -- Não é premium
    AND trial_end_date IS NOT NULL 
    AND trial_end_date >= NOW()  -- Trial ainda ativo
    AND status = 'expired';  -- Mas status está como expired

-- ==========================================
-- CORREÇÃO 3: Premium users expirados → desativar premium e status = 'expired'
-- ==========================================

UPDATE public.empresas
SET 
    status = 'expired',
    is_premium = false,
    updated_at = NOW()
WHERE 
    is_premium = true  -- É premium
    AND trial_end_date IS NOT NULL 
    AND trial_end_date < NOW();  -- Mas trial/premium expirou

-- ==========================================
-- CORREÇÃO 4: Premium users ativos → status = 'active'
-- ==========================================

UPDATE public.empresas
SET 
    status = 'active',
    updated_at = NOW()
WHERE 
    is_premium = true  -- É premium
    AND (trial_end_date IS NULL OR trial_end_date >= NOW())  -- E ainda não expirou
    AND (status IS NULL OR status != 'active');  -- Mas status não é active

-- ==========================================
-- DEPOIS: Verificar se a correção funcionou
-- ==========================================

SELECT 
    '📊 DEPOIS DA CORREÇÃO' as etapa,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_users,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date < NOW() 
               AND status = 'expired' 
          THEN 1 END) as trial_expirado_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date >= NOW() 
               AND status = 'trial' 
          THEN 1 END) as trial_ativo_correto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date < NOW() 
               AND status != 'expired' 
          THEN 1 END) as ainda_incorreto_expirado,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date >= NOW() 
               AND status != 'trial' 
          THEN 1 END) as ainda_incorreto_ativo
FROM public.empresas;

