-- 🔄 AUTOMAÇÃO: Estender Trial Automaticamente para Usuários Ativos
-- Este script cria triggers que estendem o trial automaticamente quando usuários são ativos
-- Zero manutenção - funciona sozinho!

-- ==========================================
-- PARTE 1: Função para estender trial automaticamente
-- ==========================================

CREATE OR REPLACE FUNCTION auto_extend_trial_for_active_users()
RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id UUID;
    v_empresa RECORD;
    v_pedidos_recentes INTEGER;
    v_orcamentos_recentes INTEGER;
    v_clientes_recentes INTEGER;
    v_atividade_recente BOOLEAN;
BEGIN
    -- Pegar empresa_id do registro inserido
    v_empresa_id := COALESCE(NEW.empresa_id, NULL);
    
    -- Se não tem empresa_id, não fazer nada
    IF v_empresa_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados da empresa
    SELECT * INTO v_empresa
    FROM public.empresas
    WHERE id = v_empresa_id;
    
    -- Se empresa não existe ou já é premium, não fazer nada
    IF v_empresa IS NULL OR v_empresa.is_premium = true THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se trial está expirando em menos de 3 dias
    IF v_empresa.trial_end_date IS NULL OR 
       v_empresa.trial_end_date > NOW() + INTERVAL '3 days' THEN
        RETURN NEW;
    END IF;
    
    -- Contar atividades recentes (últimos 3 dias)
    SELECT COUNT(*) INTO v_pedidos_recentes
    FROM public.atelie_orders
    WHERE empresa_id = v_empresa_id
      AND created_at >= NOW() - INTERVAL '3 days';
    
    SELECT COUNT(*) INTO v_orcamentos_recentes
    FROM public.atelie_quotes
    WHERE empresa_id = v_empresa_id
      AND created_at >= NOW() - INTERVAL '3 days';
    
    SELECT COUNT(*) INTO v_clientes_recentes
    FROM public.customers
    WHERE empresa_id = v_empresa_id
      AND created_at >= NOW() - INTERVAL '3 days';
    
    -- Se teve atividade recente (pelo menos 1 ação nos últimos 3 dias)
    v_atividade_recente := (v_pedidos_recentes > 0 OR v_orcamentos_recentes > 0 OR v_clientes_recentes > 0);
    
    -- Se teve atividade recente E trial está expirando, estender +7 dias
    IF v_atividade_recente AND v_empresa.trial_end_date <= NOW() + INTERVAL '3 days' THEN
        UPDATE public.empresas
        SET 
            trial_end_date = trial_end_date + INTERVAL '7 days',
            updated_at = NOW(),
            status = CASE 
                WHEN trial_end_date + INTERVAL '7 days' < NOW() THEN 'expired'
                ELSE 'trial'
            END
        WHERE id = v_empresa_id
          AND is_premium = false;
        
        -- Log (opcional - pode remover se não quiser)
        RAISE NOTICE 'Trial estendido automaticamente para empresa % (ID: %)', v_empresa.nome, v_empresa_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTE 2: Criar triggers nas tabelas relevantes
-- ==========================================

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS auto_extend_trial_on_order ON public.atelie_orders;
DROP TRIGGER IF EXISTS auto_extend_trial_on_quote ON public.atelie_quotes;
DROP TRIGGER IF EXISTS auto_extend_trial_on_customer ON public.customers;

-- Trigger em pedidos
CREATE TRIGGER auto_extend_trial_on_order
    AFTER INSERT ON public.atelie_orders
    FOR EACH ROW 
    EXECUTE FUNCTION auto_extend_trial_for_active_users();

-- Trigger em orçamentos
CREATE TRIGGER auto_extend_trial_on_quote
    AFTER INSERT ON public.atelie_quotes
    FOR EACH ROW 
    EXECUTE FUNCTION auto_extend_trial_for_active_users();

-- Trigger em clientes
CREATE TRIGGER auto_extend_trial_on_customer
    AFTER INSERT ON public.customers
    FOR EACH ROW 
    EXECUTE FUNCTION auto_extend_trial_for_active_users();

-- ==========================================
-- PARTE 3: Verificação
-- ==========================================

-- Verificar se os triggers foram criados
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'auto_extend_trial%'
ORDER BY trigger_name;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Automação de extensão de trial configurada com sucesso!';
    RAISE NOTICE '📋 Triggers criados em: public.atelie_orders, public.atelie_quotes, public.customers';
    RAISE NOTICE '🔄 Funcionamento: Se usuário criar pedido/orçamento/cliente nos últimos 3 dias E trial expira em <3 dias → +7 dias grátis';
END $$;

