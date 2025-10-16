-- Script para corrigir políticas RLS da tabela customers
-- Execute no Supabase SQL Editor

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers for their own company" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

-- 2. Criar novas políticas RLS mais simples
-- Política para SELECT (visualizar)
CREATE POLICY "Users can view customers from their company" ON public.customers
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para INSERT (inserir)
CREATE POLICY "Users can insert customers for their company" ON public.customers
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para UPDATE (atualizar)
CREATE POLICY "Users can update customers from their company" ON public.customers
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
CREATE POLICY "Users can delete customers from their company" ON public.customers
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- 3. Verificar se as políticas foram criadas
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'customers' AND schemaname = 'public'
ORDER BY policyname;

-- 4. Testar consulta com usuário específico
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.empresa_id,
  c.created_at
FROM public.customers c
WHERE c.empresa_id IN (
  SELECT empresa_id 
  FROM public.user_empresas 
  WHERE user_id = '313bfb51-8657-41bd-b543-0f3faa61fefd'
);




