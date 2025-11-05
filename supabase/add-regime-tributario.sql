-- Adicionar coluna regime_tributario à tabela focusnf_config
ALTER TABLE public.focusnf_config 
ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(20) DEFAULT 'simples_nacional' 
CHECK (regime_tributario IN ('simples_nacional', 'regime_normal', 'simples_nacional_excesso_sublimite'));

-- Comentário explicativo
COMMENT ON COLUMN public.focusnf_config.regime_tributario IS 
'Regime tributário: simples_nacional (1), simples_nacional_excesso_sublimite (2), regime_normal (3)';

