-- Script para corrigir tabela atelie_receitas e resolver erro 406

-- 1. Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'atelie_receitas';

-- 2. Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS public.atelie_receitas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id),
    order_id UUID,
    order_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'parcial')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_atelie_receitas_order_code ON public.atelie_receitas(order_code);
CREATE INDEX IF NOT EXISTS idx_atelie_receitas_empresa_id ON public.atelie_receitas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_receitas_status ON public.atelie_receitas(status);

-- 4. Habilitar RLS
ALTER TABLE public.atelie_receitas ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS
DROP POLICY IF EXISTS "Users can view receitas from their empresa" ON public.atelie_receitas;
CREATE POLICY "Users can view receitas from their empresa" ON public.atelie_receitas
    FOR SELECT USING (
        empresa_id IN (
            SELECT ue.empresa_id 
            FROM user_empresas ue 
            WHERE ue.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert receitas for their empresa" ON public.atelie_receitas;
CREATE POLICY "Users can insert receitas for their empresa" ON public.atelie_receitas
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT ue.empresa_id 
            FROM user_empresas ue 
            WHERE ue.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update receitas from their empresa" ON public.atelie_receitas;
CREATE POLICY "Users can update receitas from their empresa" ON public.atelie_receitas
    FOR UPDATE USING (
        empresa_id IN (
            SELECT ue.empresa_id 
            FROM user_empresas ue 
            WHERE ue.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete receitas from their empresa" ON public.atelie_receitas;
CREATE POLICY "Users can delete receitas from their empresa" ON public.atelie_receitas
    FOR DELETE USING (
        empresa_id IN (
            SELECT ue.empresa_id 
            FROM user_empresas ue 
            WHERE ue.user_id = auth.uid()
        )
    );

-- 6. Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_atelie_receitas_updated_at ON public.atelie_receitas;
CREATE TRIGGER update_atelie_receitas_updated_at
    BEFORE UPDATE ON public.atelie_receitas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Verificar estrutura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'atelie_receitas'
ORDER BY ordinal_position;
