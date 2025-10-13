-- 🔧 CORREÇÃO CRÍTICA: PERSISTÊNCIA DO TRIAL GRATUITO (VERSÃO SIMPLIFICADA)
-- Execute este script em partes para evitar erros de sintaxe

-- PARTE 1: Adicionar colunas necessárias
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PARTE 2: Atualizar dados existentes
UPDATE public.empresas 
SET trial_end_date = (NOW() + INTERVAL '7 days')
WHERE trial_end_date IS NULL;

UPDATE public.empresas 
SET status = 'trial'
WHERE status IS NULL OR status = '';

-- PARTE 3: Verificar dados atuais
SELECT 
    id,
    nome,
    trial_end_date,
    is_premium,
    status,
    created_at
FROM public.empresas
ORDER BY created_at DESC
LIMIT 5;

-- PARTE 4: Verificação final
SELECT 
    'CORREÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN trial_end_date IS NOT NULL THEN 1 END) as empresas_com_trial,
    COUNT(CASE WHEN is_premium = TRUE THEN 1 END) as empresas_premium
FROM public.empresas;

