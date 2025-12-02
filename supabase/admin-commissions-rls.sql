-- Política RLS adicional para admins verem todas as comissões
-- Esta política permite que usuários admin vejam todas as comissões para gerenciamento

-- IMPORTANTE: Esta política só funciona se você tiver uma tabela ou função que identifique admins
-- Por enquanto, vamos usar uma abordagem diferente: criar uma função que retorna todas as comissões
-- e usar service role key na página admin (ou ajustar a política para permitir leitura ampla para admins)

-- Opção 1: Política que permite admins verem tudo (requer tabela de admins ou função)
-- CREATE POLICY "Admins can view all commissions"
--     ON public.referral_commissions
--     FOR SELECT
--     USING (
--         -- Verificar se é admin (ajuste conforme sua lógica de admin)
--         auth.jwt() ->> 'email' = ANY(
--             SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
--         )
--     );

-- Opção 2: Função para buscar todas as comissões (mais simples)
-- Esta função pode ser chamada com service role key na página admin
CREATE OR REPLACE FUNCTION get_all_commissions()
RETURNS TABLE (
    id UUID,
    referral_id UUID,
    referrer_empresa_id UUID,
    referred_empresa_id UUID,
    commission_type VARCHAR,
    percentage DECIMAL,
    amount DECIMAL,
    subscription_value DECIMAL,
    status VARCHAR,
    payment_date TIMESTAMP WITH TIME ZONE,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER -- Executa com privilégios do criador da função
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.referral_id,
        rc.referrer_empresa_id,
        rc.referred_empresa_id,
        rc.commission_type,
        rc.percentage,
        rc.amount,
        rc.subscription_value,
        rc.status,
        rc.payment_date,
        rc.period_start,
        rc.period_end,
        rc.created_at,
        rc.updated_at
    FROM public.referral_commissions rc;
END;
$$;

-- Comentário
COMMENT ON FUNCTION get_all_commissions() IS 'Função para admins verem todas as comissões. Requer SECURITY DEFINER.';

-- NOTA: A página AdminComissoes.tsx já está usando query direta com RLS.
-- Se a política RLS estiver bloqueando, você pode:
-- 1. Usar service role key na página admin (mais seguro)
-- 2. Ou ajustar a política RLS para permitir admins
-- 3. Ou usar esta função get_all_commissions() com SECURITY DEFINER

