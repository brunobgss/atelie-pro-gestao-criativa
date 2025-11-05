-- 🔧 SOLUÇÃO COMPLETA: Sincronização Automática de Status
-- Este script cria mecanismos para manter o status sempre correto

-- ==========================================
-- PARTE 1: Função para sincronizar status automaticamente
-- ==========================================

CREATE OR REPLACE FUNCTION sync_empresa_status()
RETURNS TRIGGER AS $$
DECLARE
    v_trial_end_date_calculado TIMESTAMPTZ;
BEGIN
    -- Se é premium, manter status como 'active' (se estiver ativo)
    -- Premium users não dependem do trial
    IF NEW.is_premium = true THEN
        -- Se o premium expirou (trial_end_date < NOW), mudar para expired
        IF NEW.trial_end_date IS NOT NULL AND NEW.trial_end_date < NOW() THEN
            NEW.status = 'expired';
            NEW.is_premium = false;  -- Desativar premium também
        ELSE
            -- Premium ativo, manter como active
            IF NEW.status IS NULL OR NEW.status NOT IN ('active', 'expired') THEN
                NEW.status = 'active';
            END IF;
        END IF;
    ELSE
        -- Usuário não premium: sincronizar baseado em created_at + 7 dias
        -- IMPORTANTE: O trial é calculado a partir da data de criação (created_at)
        
        -- Calcular trial_end_date baseado em created_at + 7 dias
        -- IMPORTANTE: Só fazer isso para não premium users
        IF NEW.created_at IS NOT NULL THEN
            v_trial_end_date_calculado := NEW.created_at + INTERVAL '7 days';
            
            -- Se trial_end_date não existe ou está diferente, corrigir
            -- MAS: só corrigir se não for premium (proteção extra)
            IF (NEW.is_premium IS NULL OR NEW.is_premium = false) THEN
                IF NEW.trial_end_date IS NULL OR 
                   ABS(EXTRACT(DAYS FROM (NEW.trial_end_date - v_trial_end_date_calculado))) > 1 THEN
                    NEW.trial_end_date := v_trial_end_date_calculado;
                END IF;
            END IF;
            
            -- Verificar se o trial expirou baseado em created_at + 7 dias
            -- MAS: para premium users, usar trial_end_date diretamente (não recalcular)
            IF NEW.is_premium = true AND NEW.trial_end_date IS NOT NULL THEN
                -- Premium: usar trial_end_date como expiração do plano
                IF NEW.trial_end_date < NOW() THEN
                    NEW.status = 'expired';
                ELSE
                    NEW.status = 'active';
                END IF;
            ELSIF v_trial_end_date_calculado < NOW() THEN
                -- Trial expirado (mais de 7 dias desde criação)
                NEW.status = 'expired';
            ELSE
                -- Trial ativo (ainda dentro dos 7 dias)
                NEW.status = 'trial';
            END IF;
        ELSE
            -- Sem created_at, usar trial_end_date se existir
            IF NEW.trial_end_date IS NOT NULL THEN
                IF NEW.trial_end_date < NOW() THEN
                    NEW.status = 'expired';
                ELSE
                    NEW.status = 'trial';
                END IF;
            ELSE
                -- Sem created_at e sem trial_end_date, considerar como trial (usuário novo)
                NEW.status = 'trial';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTE 2: Trigger para sincronizar status ao inserir/atualizar
-- ==========================================

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS sync_empresa_status_trigger ON public.empresas;

-- Criar trigger que executa antes de INSERT ou UPDATE
CREATE TRIGGER sync_empresa_status_trigger
    BEFORE INSERT OR UPDATE OF trial_end_date, is_premium, status, created_at
    ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION sync_empresa_status();

-- ==========================================
-- PARTE 3: Função para corrigir status de todas as empresas
-- ==========================================

CREATE OR REPLACE FUNCTION fix_all_empresa_status()
RETURNS TABLE (
    total_updated INTEGER,
    premium_updated INTEGER,
    trial_expired_updated INTEGER,
    trial_active_updated INTEGER
) AS $$
DECLARE
    v_total INTEGER := 0;
    v_premium INTEGER := 0;
    v_premium_active INTEGER := 0;
    v_trial_expired INTEGER := 0;
    v_trial_active INTEGER := 0;
    v_row_count INTEGER;
BEGIN
    -- IMPORTANTE: O trial é baseado em created_at + 7 dias
    -- MAS: Premium users têm trial_end_date como expiração do plano, NÃO alterar
    
    -- 1. Corrigir trial_end_date para created_at + 7 dias (se necessário)
    -- APENAS para não premium users
    UPDATE public.empresas
    SET trial_end_date = created_at + INTERVAL '7 days', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)  -- APENAS não premium
        AND created_at IS NOT NULL
        AND (
            trial_end_date IS NULL
            OR ABS(EXTRACT(DAYS FROM (trial_end_date - (created_at + INTERVAL '7 days')))) > 1
        );
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_total := v_total + v_row_count;
    
    -- 2. Corrigir premium users expirados
    UPDATE public.empresas
    SET status = 'expired', is_premium = false, updated_at = NOW()
    WHERE is_premium = true
        AND trial_end_date IS NOT NULL
        AND trial_end_date < NOW();
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_premium := v_premium + v_row_count;
    v_total := v_total + v_row_count;
    
    -- 3. Corrigir trials expirados baseado em created_at + 7 dias (não premium)
    UPDATE public.empresas
    SET status = 'expired', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)
        AND created_at IS NOT NULL
        AND (created_at + INTERVAL '7 days') < NOW()
        AND (status IS NULL OR status != 'expired');
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_trial_expired := v_row_count;
    v_total := v_total + v_row_count;
    
    -- 4. Corrigir trials ativos baseado em created_at + 7 dias (não premium)
    UPDATE public.empresas
    SET status = 'trial', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)
        AND created_at IS NOT NULL
        AND (created_at + INTERVAL '7 days') >= NOW()
        AND (status IS NULL OR status != 'trial');
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_trial_active := v_row_count;
    v_total := v_total + v_row_count;
    
    -- 5. Corrigir premium users ativos
    UPDATE public.empresas
    SET status = 'active', updated_at = NOW()
    WHERE is_premium = true
        AND (trial_end_date IS NULL OR trial_end_date >= NOW())
        AND (status IS NULL OR status != 'active');
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_premium_active := v_row_count;
    v_total := v_total + v_row_count;
    v_premium := v_premium + v_premium_active;
    
    RETURN QUERY SELECT v_total, v_premium, v_trial_expired, v_trial_active;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTE 4: Executar correção inicial dos dados existentes
-- ==========================================

-- Executar a função de correção
SELECT * FROM fix_all_empresa_status();

-- ==========================================
-- PARTE 5: Criar função para ser executada periodicamente (cron job)
-- ==========================================

-- Esta função pode ser chamada por um cron job do Supabase
-- ou manualmente quando necessário
CREATE OR REPLACE FUNCTION sync_trial_status_daily()
RETURNS void AS $$
BEGIN
    -- IMPORTANTE: O trial é baseado em created_at + 7 dias, não apenas trial_end_date
    
    -- 1. Corrigir trial_end_date para created_at + 7 dias (se necessário)
    UPDATE public.empresas
    SET trial_end_date = created_at + INTERVAL '7 days', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)
        AND created_at IS NOT NULL
        AND (
            trial_end_date IS NULL
            OR ABS(EXTRACT(DAYS FROM (trial_end_date - (created_at + INTERVAL '7 days')))) > 1
        );
    
    -- 2. Atualizar status de trials que expiraram baseado em created_at + 7 dias
    UPDATE public.empresas
    SET status = 'expired', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)
        AND created_at IS NOT NULL
        AND (created_at + INTERVAL '7 days') < NOW()
        AND status != 'expired';
    
    -- 3. Atualizar status de trials ativos (ainda dentro dos 7 dias)
    UPDATE public.empresas
    SET status = 'trial', updated_at = NOW()
    WHERE (is_premium IS NULL OR is_premium = false)
        AND created_at IS NOT NULL
        AND (created_at + INTERVAL '7 days') >= NOW()
        AND status != 'trial';
    
    -- 4. Atualizar premium users que expiraram
    UPDATE public.empresas
    SET status = 'expired', is_premium = false, updated_at = NOW()
    WHERE is_premium = true
        AND trial_end_date IS NOT NULL
        AND trial_end_date < NOW()
        AND status != 'expired';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTE 6: Verificação após correção
-- ==========================================

SELECT 
    '📊 RESUMO APÓS CORREÇÃO' as info,
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
          THEN 1 END) as trial_expirado_incorreto,
    COUNT(CASE WHEN (is_premium IS NULL OR is_premium = false) 
               AND trial_end_date IS NOT NULL 
               AND trial_end_date >= NOW() 
               AND status != 'trial' 
          THEN 1 END) as trial_ativo_incorreto
FROM public.empresas;

