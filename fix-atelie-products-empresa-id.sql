-- Script para adicionar empresa_id na tabela atelie_products
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna empresa_id se não existir
ALTER TABLE public.atelie_products 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 2. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_atelie_products_empresa_id ON public.atelie_products(empresa_id);

-- 3. Atualizar produtos existentes com empresa padrão (se necessário)
-- NOTA: Execute apenas se houver produtos sem empresa_id
-- UPDATE public.atelie_products 
-- SET empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae' -- Substitua pelo ID da empresa desejada
-- WHERE empresa_id IS NULL;

-- 4. Criar política RLS para filtrar por empresa
DROP POLICY IF EXISTS "Users can view products from their company" ON public.atelie_products;
DROP POLICY IF EXISTS "Users can insert products for their company" ON public.atelie_products;
DROP POLICY IF EXISTS "Users can update products from their company" ON public.atelie_products;
DROP POLICY IF EXISTS "Users can delete products from their company" ON public.atelie_products;

-- Política para SELECT (visualizar)
CREATE POLICY "Users can view products from their company" ON public.atelie_products
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para INSERT (inserir)
CREATE POLICY "Users can insert products for their company" ON public.atelie_products
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para UPDATE (atualizar)
CREATE POLICY "Users can update products from their company" ON public.atelie_products
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
) WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para DELETE (deletar)
CREATE POLICY "Users can delete products from their company" ON public.atelie_products
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- 5. Verificar se as políticas foram criadas
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'atelie_products' AND schemaname = 'public'
ORDER BY policyname;

-- 6. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'atelie_products' 
  AND table_schema = 'public'
ORDER BY ordinal_position;


