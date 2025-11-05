-- Script para verificar e criar a tabela payments se necessário
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela payments existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'payments'
        ) THEN 'Tabela "payments" existe'
        ELSE 'Tabela "payments" NÃO existe - será criada'
    END as status_payments;

-- 2. Verificar se a tabela asaas_payments existe (pode ser que já exista)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'asaas_payments'
        ) THEN 'Tabela "asaas_payments" existe'
        ELSE 'Tabela "asaas_payments" NÃO existe'
    END as status_asaas_payments;

-- 3. Criar tabela payments se não existir
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    asaas_subscription_id VARCHAR(255) UNIQUE, -- ID da assinatura no ASAAS
    asaas_payment_id VARCHAR(255), -- ID do pagamento individual no ASAAS
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired
    billing_type VARCHAR(50), -- PIX, CREDIT_CARD, BOLETO
    value DECIMAL(10,2) NOT NULL,
    cycle VARCHAR(50), -- MONTHLY, YEARLY
    description TEXT,
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Criar índice para empresa_id
CREATE INDEX IF NOT EXISTS idx_payments_empresa_id ON public.payments(empresa_id);

-- 5. Criar índice para asaas_subscription_id
CREATE INDEX IF NOT EXISTS idx_payments_asaas_subscription_id ON public.payments(asaas_subscription_id);

-- 6. Criar índice para status
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 7. Verificar estrutura da tabela criada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 8. Adicionar RLS (Row Level Security) se necessário
DO $$
BEGIN
    -- Habilitar RLS
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

    -- Criar política para usuários verem apenas seus próprios pagamentos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND policyname = 'Users can view their own payments'
    ) THEN
        CREATE POLICY "Users can view their own payments"
            ON public.payments
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_empresas ue
                    JOIN auth.users u ON u.id = ue.user_id
                    WHERE ue.empresa_id = payments.empresa_id
                    AND u.id = auth.uid()
                )
            );
    END IF;

    -- Criar política para usuários inserirem seus próprios pagamentos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND policyname = 'Users can insert their own payments'
    ) THEN
        CREATE POLICY "Users can insert their own payments"
            ON public.payments
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.user_empresas ue
                    JOIN auth.users u ON u.id = ue.user_id
                    WHERE ue.empresa_id = payments.empresa_id
                    AND u.id = auth.uid()
                )
            );
    END IF;

    -- Criar política para usuários atualizarem seus próprios pagamentos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND policyname = 'Users can update their own payments'
    ) THEN
        CREATE POLICY "Users can update their own payments"
            ON public.payments
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_empresas ue
                    JOIN auth.users u ON u.id = ue.user_id
                    WHERE ue.empresa_id = payments.empresa_id
                    AND u.id = auth.uid()
                )
            );
    END IF;
END $$;

-- 9. Verificar se as políticas foram criadas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'payments';

