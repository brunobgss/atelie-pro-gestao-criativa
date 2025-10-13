-- =====================================================
-- SCRIPT PARA RESETAR TRIAL NO BANCO DE DADOS
-- =====================================================
-- Execute este script para resetar o trial das empresas

-- Atualizar todas as empresas para ter trial de 7 dias a partir de agora
UPDATE public.empresas 
SET trial_ends_at = NOW() + INTERVAL '7 days'
WHERE trial_ends_at IS NOT NULL;

-- Verificar as datas atualizadas
SELECT 
    id,
    nome,
    trial_ends_at,
    EXTRACT(DAYS FROM (trial_ends_at - NOW())) as dias_restantes
FROM public.empresas 
WHERE trial_ends_at IS NOT NULL
ORDER BY trial_ends_at;


