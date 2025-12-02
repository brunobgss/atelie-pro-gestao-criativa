-- Sistema de Programa de Referência
-- Permite usuários indicarem amigos e ganharem recompensas

-- Tabela de referências
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    referred_empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, signed_up, converted, rewarded
    reward_applied BOOLEAN DEFAULT false,
    reward_type VARCHAR(50), -- '1_month_free', 'discount_10', etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signed_up_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    rewarded_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_empresa_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_empresa_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_referral_code(empresa_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Gerar código: primeira letra do nome da empresa + 6 dígitos aleatórios
        code := UPPER(SUBSTRING(
            (SELECT nome FROM public.empresas WHERE id = empresa_id LIMIT 1), 
            1, 1
        )) || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Verificar se já existe
        SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists_check;
        
        -- Se não existe, sair do loop
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para criar código de referência para uma empresa
CREATE OR REPLACE FUNCTION create_referral_code(empresa_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    existing_code VARCHAR(20);
BEGIN
    -- Verificar se já existe código para esta empresa
    SELECT referral_code INTO existing_code 
    FROM public.referrals 
    WHERE referrer_empresa_id = empresa_id 
    AND status = 'pending' 
    LIMIT 1;
    
    IF existing_code IS NOT NULL THEN
        RETURN existing_code;
    END IF;
    
    -- Gerar novo código
    code := generate_referral_code(empresa_id);
    
    -- Criar registro
    INSERT INTO public.referrals (referrer_empresa_id, referral_code, status)
    VALUES (empresa_id, code, 'pending')
    ON CONFLICT (referral_code) DO NOTHING;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para aplicar recompensa ao referrer
CREATE OR REPLACE FUNCTION apply_referral_reward(referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_type VARCHAR(50);
    v_empresa RECORD;
    v_referral_status VARCHAR(20);
BEGIN
    -- VALIDAÇÕES DE SEGURANÇA:
    -- 1. Verificar se a referência existe e não foi recompensada
    -- 2. Verificar se o status é 'converted' (indicado realmente assinou)
    -- 3. Garantir que não aplica recompensa duplicada
    
    SELECT referrer_empresa_id, reward_type, status 
    INTO v_referrer_id, v_reward_type, v_referral_status
    FROM public.referrals
    WHERE id = referral_id 
    AND reward_applied = false;
    
    -- Se não encontrou ou já foi recompensado, retornar false
    IF v_referrer_id IS NULL THEN
        RAISE NOTICE 'Referência não encontrada ou já recompensada: %', referral_id;
        RETURN false;
    END IF;
    
    -- VALIDAÇÃO CRÍTICA: Só aplicar se status for 'converted' (indicado realmente assinou)
    IF v_referral_status != 'converted' THEN
        RAISE NOTICE 'Referência não está com status converted. Status atual: %', v_referral_status;
        RETURN false;
    END IF;
    
    -- Buscar dados da empresa referrer
    SELECT * INTO v_empresa FROM public.empresas WHERE id = v_referrer_id;
    
    IF v_empresa IS NULL THEN
        RAISE NOTICE 'Empresa referrer não encontrada: %', v_referrer_id;
        RETURN false;
    END IF;
    
    -- Aplicar recompensa baseado no tipo
    IF v_reward_type = '1_month_free' OR v_reward_type IS NULL THEN
        -- Adicionar 30 dias ao trial_end_date ou criar se não existir
        -- Usar GREATEST para garantir que não reduz o trial se já tiver uma data maior
        UPDATE public.empresas
        SET 
            trial_end_date = COALESCE(
                GREATEST(trial_end_date, NOW()) + INTERVAL '30 days',
                NOW() + INTERVAL '30 days'
            ),
            updated_at = NOW()
        WHERE id = v_referrer_id;
        
        RAISE NOTICE 'Recompensa de 1 mês grátis aplicada para empresa: %', v_referrer_id;
    END IF;
    
    -- Marcar recompensa como aplicada (IMPORTANTE: fazer isso por último para evitar duplicatas)
    UPDATE public.referrals
    SET 
        reward_applied = true,
        rewarded_at = NOW(),
        updated_at = NOW()
    WHERE id = referral_id
    AND reward_applied = false; -- Proteção adicional contra duplicatas
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referrals_updated_at_trigger
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver suas próprias referências
CREATE POLICY "Users can view their own referrals"
    ON public.referrals
    FOR SELECT
    USING (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Política: Usuários podem criar suas próprias referências
CREATE POLICY "Users can create their own referrals"
    ON public.referrals
    FOR INSERT
    WITH CHECK (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Política: Usuários podem atualizar suas próprias referências
CREATE POLICY "Users can update their own referrals"
    ON public.referrals
    FOR UPDATE
    USING (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Comentários
COMMENT ON TABLE public.referrals IS 'Sistema de referências - usuários indicam amigos e ganham recompensas';
COMMENT ON COLUMN public.referrals.referrer_empresa_id IS 'ID da empresa que está indicando';
COMMENT ON COLUMN public.referrals.referred_empresa_id IS 'ID da empresa indicada (preenchido quando se cadastra)';
COMMENT ON COLUMN public.referrals.referral_code IS 'Código único de referência';
COMMENT ON COLUMN public.referrals.status IS 'Status: pending, signed_up, converted, rewarded';
COMMENT ON COLUMN public.referrals.reward_applied IS 'Se a recompensa já foi aplicada ao referrer';

