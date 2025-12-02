-- Sistema de Comissões e Presentes Físicos para Programa de Referência
-- Este script cria as tabelas e funções necessárias para rastrear comissões e presentes físicos

-- 1. Tabela de Comissões
CREATE TABLE IF NOT EXISTS public.referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    referrer_empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    referred_empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    commission_type VARCHAR(20) NOT NULL, -- 'one_time' ou 'recurring'
    percentage DECIMAL(5,2) NOT NULL, -- Porcentagem da comissão (ex: 15.00)
    amount DECIMAL(10,2) NOT NULL, -- Valor da comissão em R$
    subscription_value DECIMAL(10,2) NOT NULL, -- Valor da assinatura que gerou a comissão
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    payment_date TIMESTAMP WITH TIME ZONE,
    period_start TIMESTAMP WITH TIME ZONE, -- Para comissões recorrentes
    period_end TIMESTAMP WITH TIME ZONE, -- Para comissões recorrentes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Presentes Físicos
CREATE TABLE IF NOT EXISTS public.referral_physical_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    level_reached VARCHAR(20) NOT NULL, -- 'ouro', 'platina', 'lendario'
    reward_type VARCHAR(50) NOT NULL, -- 'pulseira', 'placa', 'kit_premium'
    reward_description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered'
    shipping_address JSONB, -- Endereço de entrega
    tracking_code VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_empresa_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referral ON public.referral_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON public.referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_type ON public.referral_commissions(commission_type);

CREATE INDEX IF NOT EXISTS idx_physical_rewards_referrer ON public.referral_physical_rewards(referrer_empresa_id);
CREATE INDEX IF NOT EXISTS idx_physical_rewards_status ON public.referral_physical_rewards(status);
CREATE INDEX IF NOT EXISTS idx_physical_rewards_level ON public.referral_physical_rewards(level_reached);

-- Função para calcular e criar comissão quando indicação converte
-- OPÇÃO C (PROGRESSIVA): Cada indicação mantém a comissão do nível em que converteu
-- OPÇÃO 2 (HÍBRIDA): Comissão única + recorrente conforme o nível
CREATE OR REPLACE FUNCTION create_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
    v_level VARCHAR(20);
    v_one_time_percentage DECIMAL(5,2);
    v_recurring_percentage DECIMAL(5,2);
    v_subscription_value DECIMAL(10,2);
    v_one_time_amount DECIMAL(10,2);
    v_recurring_amount DECIMAL(10,2);
    v_converted_count INTEGER;
BEGIN
    -- Só processar se a empresa virou premium (converteu)
    IF NEW.is_premium = true AND (OLD.is_premium IS NULL OR OLD.is_premium = false) THEN
        -- Buscar referência
        SELECT id, referrer_empresa_id INTO v_referral_id, v_referrer_id
        FROM public.referrals
        WHERE referred_empresa_id = NEW.id
        AND status = 'converted'
        AND reward_applied = true
        LIMIT 1;
        
        IF v_referrer_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Contar indicações convertidas do referrer ATÉ ESTA (progressiva)
        -- Isso determina o nível em que ESTA indicação converteu
        SELECT COUNT(*) INTO v_converted_count
        FROM public.referrals
        WHERE referrer_empresa_id = v_referrer_id
        AND status = 'converted'
        AND converted_at <= (SELECT converted_at FROM public.referrals WHERE id = v_referral_id);
        
        -- OPÇÃO 2 (HÍBRIDA): Determinar comissão única + recorrente baseado no nível
        -- Bronze (1-2): Sem comissão, só 1 mês grátis
        -- Prata (3-4): 5% única + 5% recorrente
        -- Ouro (5-9): 10% única + 10% recorrente
        -- Platina (10-19): 15% única + 15% recorrente
        -- Diamante (20-49): 20% única + 20% recorrente
        -- Lendário (50+): 25% única + 25% recorrente
        
        IF v_converted_count >= 50 THEN
            v_level := 'lendario';
            v_one_time_percentage := 25.00;
            v_recurring_percentage := 25.00;
        ELSIF v_converted_count >= 20 THEN
            v_level := 'diamante';
            v_one_time_percentage := 20.00;
            v_recurring_percentage := 20.00;
        ELSIF v_converted_count >= 10 THEN
            v_level := 'platina';
            v_one_time_percentage := 15.00;
            v_recurring_percentage := 15.00;
        ELSIF v_converted_count >= 5 THEN
            v_level := 'ouro';
            v_one_time_percentage := 10.00;
            v_recurring_percentage := 10.00;
        ELSIF v_converted_count >= 3 THEN
            v_level := 'prata';
            v_one_time_percentage := 5.00;
            v_recurring_percentage := 5.00;
        ELSE
            -- Bronze (1-2): Sem comissão, só 1 mês grátis
            RETURN NEW;
        END IF;
        
        -- Buscar valor da assinatura (assumindo plano básico de R$ 39.00)
        v_subscription_value := 39.00;
        
        -- Calcular comissões
        v_one_time_amount := (v_subscription_value * v_one_time_percentage) / 100.00;
        v_recurring_amount := (v_subscription_value * v_recurring_percentage) / 100.00;
        
        -- Criar comissão única
        INSERT INTO public.referral_commissions (
            referral_id,
            referrer_empresa_id,
            referred_empresa_id,
            commission_type,
            percentage,
            amount,
            subscription_value,
            status,
            period_start,
            period_end
        ) VALUES (
            v_referral_id,
            v_referrer_id,
            NEW.id,
            'one_time',
            v_one_time_percentage,
            v_one_time_amount,
            v_subscription_value,
            'pending',
            NULL,
            NULL
        );
        
        -- Criar comissão recorrente
        INSERT INTO public.referral_commissions (
            referral_id,
            referrer_empresa_id,
            referred_empresa_id,
            commission_type,
            percentage,
            amount,
            subscription_value,
            status,
            period_start,
            period_end
        ) VALUES (
            v_referral_id,
            v_referrer_id,
            NEW.id,
            'recurring',
            v_recurring_percentage,
            v_recurring_amount,
            v_subscription_value,
            'pending',
            NOW(),
            NOW() + INTERVAL '1 month'
        );
        
        RAISE NOTICE 'Comissões criadas (nível %): Única R$ % + Recorrente R$ %/mês para empresa %', 
            v_level, v_one_time_amount, v_recurring_amount, v_referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar comissão quando indicação converte
DROP TRIGGER IF EXISTS create_referral_commission_trigger ON public.empresas;
CREATE TRIGGER create_referral_commission_trigger
    AFTER UPDATE OF is_premium ON public.empresas
    FOR EACH ROW
    WHEN (NEW.is_premium = true AND (OLD.is_premium IS NULL OR OLD.is_premium = false))
    EXECUTE FUNCTION create_referral_commission();

-- Função para criar presente físico quando nível é alcançado
CREATE OR REPLACE FUNCTION check_and_create_physical_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_converted_count INTEGER;
    v_level VARCHAR(20);
    v_reward_type VARCHAR(50);
    v_reward_description TEXT;
    v_existing_reward BOOLEAN;
BEGIN
    -- Só processar se a empresa virou premium (converteu)
    IF NEW.is_premium = true AND (OLD.is_premium IS NULL OR OLD.is_premium = false) THEN
        -- Buscar referência
        SELECT referrer_empresa_id INTO v_referrer_id
        FROM public.referrals
        WHERE referred_empresa_id = NEW.id
        AND status = 'converted'
        LIMIT 1;
        
        IF v_referrer_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Contar indicações convertidas do referrer
        SELECT COUNT(*) INTO v_converted_count
        FROM public.referrals
        WHERE referrer_empresa_id = v_referrer_id
        AND status = 'converted';
        
        -- Determinar se deve criar presente físico
        IF v_converted_count = 5 THEN
            v_level := 'ouro';
            v_reward_type := 'pulseira';
            v_reward_description := '🎁 Pulseira personalizada Ateliê Pro';
        ELSIF v_converted_count = 10 THEN
            v_level := 'platina';
            v_reward_type := 'placa';
            v_reward_description := '🏆 Placa personalizada Embaixador Ateliê Pro';
        ELSIF v_converted_count = 50 THEN
            v_level := 'lendario';
            v_reward_type := 'kit_premium';
            v_reward_description := '👑 Kit Premium (Pulseira + Placa + Brinde exclusivo)';
        ELSE
            RETURN NEW;
        END IF;
        
        -- Verificar se já existe presente para este nível
        SELECT EXISTS(
            SELECT 1 FROM public.referral_physical_rewards
            WHERE referrer_empresa_id = v_referrer_id
            AND level_reached = v_level
        ) INTO v_existing_reward;
        
        IF NOT v_existing_reward THEN
            -- Criar registro de presente físico
            INSERT INTO public.referral_physical_rewards (
                referrer_empresa_id,
                level_reached,
                reward_type,
                reward_description,
                status
            ) VALUES (
                v_referrer_id,
                v_level,
                v_reward_type,
                v_reward_description,
                'pending'
            );
            
            RAISE NOTICE 'Presente físico criado: % para empresa %', v_reward_description, v_referrer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar presente físico quando nível é alcançado
DROP TRIGGER IF EXISTS create_physical_reward_trigger ON public.empresas;
CREATE TRIGGER create_physical_reward_trigger
    AFTER UPDATE OF is_premium ON public.empresas
    FOR EACH ROW
    WHEN (NEW.is_premium = true AND (OLD.is_premium IS NULL OR OLD.is_premium = false))
    EXECUTE FUNCTION check_and_create_physical_reward();

-- RLS (Row Level Security)
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_physical_rewards ENABLE ROW LEVEL SECURITY;

-- Políticas para comissões
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.referral_commissions;
CREATE POLICY "Users can view their own commissions"
    ON public.referral_commissions
    FOR SELECT
    USING (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para presentes físicos
DROP POLICY IF EXISTS "Users can view their own physical rewards" ON public.referral_physical_rewards;
CREATE POLICY "Users can view their own physical rewards"
    ON public.referral_physical_rewards
    FOR SELECT
    USING (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own physical rewards" ON public.referral_physical_rewards;
CREATE POLICY "Users can update their own physical rewards"
    ON public.referral_physical_rewards
    FOR UPDATE
    USING (
        referrer_empresa_id IN (
            SELECT empresa_id FROM public.user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Comentários
COMMENT ON TABLE public.referral_commissions IS 'Sistema de comissões para programa de referência';
COMMENT ON TABLE public.referral_physical_rewards IS 'Sistema de presentes físicos para programa de referência';
COMMENT ON COLUMN public.referral_commissions.commission_type IS 'Tipo: one_time (única) ou recurring (recorrente)';
COMMENT ON COLUMN public.referral_physical_rewards.level_reached IS 'Nível alcançado: ouro (5), platina (10), lendario (50)';

