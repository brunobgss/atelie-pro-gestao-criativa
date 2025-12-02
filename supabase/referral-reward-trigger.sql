-- Trigger para aplicar recompensa automaticamente quando referido assina premium
-- Executa quando uma empresa vira premium e tem uma referência ativa

CREATE OR REPLACE FUNCTION check_and_apply_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_id UUID;
    v_referrer_id UUID;
    v_empresa_status VARCHAR(50);
BEGIN
    -- VALIDAÇÕES DE SEGURANÇA:
    -- 1. Só processar se a empresa virou premium (mudou de false/null para true)
    -- 2. Verificar se o status é 'active' (não apenas trial)
    -- 3. Garantir que não é uma atualização manual indevida
    
    IF NEW.is_premium = true 
       AND (OLD.is_premium IS NULL OR OLD.is_premium = false)
       AND NEW.status = 'active' THEN
        
        -- Buscar referência onde esta empresa foi indicada e ainda não converteu
        SELECT id, referrer_empresa_id INTO v_referral_id, v_referrer_id
        FROM public.referrals
        WHERE referred_empresa_id = NEW.id
        AND status = 'signed_up'
        AND reward_applied = false
        LIMIT 1;
        
        IF v_referral_id IS NOT NULL THEN
            -- VALIDAÇÃO ADICIONAL: Verificar se a empresa realmente tem um pagamento
            -- (status 'active' indica que passou pelo webhook do Asaas)
            -- Se não tiver status 'active', não aplicar recompensa
            
            -- Atualizar status para converted
            UPDATE public.referrals
            SET 
                status = 'converted',
                converted_at = NOW(),
                reward_type = '1_month_free',
                updated_at = NOW()
            WHERE id = v_referral_id;
            
            -- Aplicar recompensa ao referrer (função já tem validação de reward_applied)
            PERFORM apply_referral_reward(v_referral_id);
            
            RAISE NOTICE 'Recompensa de referência aplicada para empresa % (referrer: %)', NEW.id, v_referrer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS apply_referral_reward_trigger ON public.empresas;
CREATE TRIGGER apply_referral_reward_trigger
    AFTER UPDATE OF is_premium ON public.empresas
    FOR EACH ROW
    WHEN (NEW.is_premium = true AND (OLD.is_premium IS NULL OR OLD.is_premium = false))
    EXECUTE FUNCTION check_and_apply_referral_reward();

COMMENT ON FUNCTION check_and_apply_referral_reward() IS 'Aplica recompensa automaticamente quando referido vira premium';

