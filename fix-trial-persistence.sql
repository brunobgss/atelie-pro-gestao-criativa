-- 🔧 CORREÇÃO CRÍTICA: PERSISTÊNCIA DO TRIAL GRATUITO
-- Este script corrige o problema de reset do trial gratuito

-- 1. Verificar se existe a coluna trial_end_date na tabela empresas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'empresas' 
        AND column_name = 'trial_end_date'
    ) THEN
        ALTER TABLE public.empresas 
        ADD COLUMN trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
        RAISE NOTICE 'Coluna trial_end_date adicionada à tabela empresas';
    ELSE
        RAISE NOTICE 'Coluna trial_end_date já existe na tabela empresas';
    END IF;
END $$;

-- 2. Atualizar empresas existentes que não têm trial_end_date definido
UPDATE public.empresas 
SET trial_end_date = (NOW() + INTERVAL '7 days')
WHERE trial_end_date IS NULL;

-- 3. Verificar se existe a coluna is_premium na tabela empresas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'empresas' 
        AND column_name = 'is_premium'
    ) THEN
        ALTER TABLE public.empresas 
        ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna is_premium adicionada à tabela empresas';
    ELSE
        RAISE NOTICE 'Coluna is_premium já existe na tabela empresas';
    END IF;
END $$;

-- 4. Verificar se existe a coluna status na tabela empresas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'empresas' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.empresas 
        ADD COLUMN status TEXT DEFAULT 'trial';
        RAISE NOTICE 'Coluna status adicionada à tabela empresas';
    ELSE
        RAISE NOTICE 'Coluna status já existe na tabela empresas';
    END IF;
END $$;

-- 5. Atualizar empresas existentes para status 'trial' se não definido
UPDATE public.empresas 
SET status = 'trial'
WHERE status IS NULL OR status = '';

-- 6. Verificar dados atuais
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

-- 7. Verificar se a função update_updated_at_column existe
DO $func$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ language 'plpgsql';
        RAISE NOTICE 'Função update_updated_at_column criada';
    ELSE
        RAISE NOTICE 'Função update_updated_at_column já existe';
    END IF;
END $func$;

-- 8. Criar trigger para atualizar updated_at automaticamente
DO $trigger$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_empresas_updated_at'
    ) THEN
        CREATE TRIGGER update_empresas_updated_at
            BEFORE UPDATE ON public.empresas
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_empresas_updated_at criado';
    ELSE
        RAISE NOTICE 'Trigger update_empresas_updated_at já existe';
    END IF;
END $trigger$;

-- 9. Adicionar coluna updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'empresas' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.empresas 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada à tabela empresas';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela empresas';
    END IF;
END $$;

-- 10. Verificação final
SELECT 
    'CORREÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_empresas,
    COUNT(CASE WHEN trial_end_date IS NOT NULL THEN 1 END) as empresas_com_trial,
    COUNT(CASE WHEN is_premium = TRUE THEN 1 END) as empresas_premium
FROM public.empresas;
