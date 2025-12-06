-- =====================================================
-- SCRIPT PARA RESETAR TRIAL NO BANCO DE DADOS
-- =====================================================
-- Execute este script para resetar o trial das empresas

-- Atualizar todas as empresas para ter trial de 7 dias a partir de agora
UPDATE public.empresas 
SET trial_end_date = NOW() + INTERVAL '7 days'
WHERE trial_end_date IS NOT NULL;

-- Verificar as datas atualizadas
SELECT 
    id,
    nome,
    trial_end_date,
    EXTRACT(DAYS FROM (trial_end_date - NOW())) as dias_restantes
FROM public.empresas 
WHERE trial_end_date IS NOT NULL
ORDER BY trial_end_date;


