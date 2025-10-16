-- Script para corrigir políticas RLS da tabela customers para CRUD
-- Execute no Supabase SQL Editor

-- 1. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view customers from their company" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers for their company" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers from their company" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers from their company" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers for their own company" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

-- 2. Criar políticas RLS mais simples e funcionais
-- Política para SELECT (visualizar)
CREATE POLICY "Enable read access for users based on company" ON public.customers
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para INSERT (inserir)
CREATE POLICY "Enable insert for users based on company" ON public.customers
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.user_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política para UPDATE (atualizar)
CREATE POLICY "Enable update for users based on company" ON public.customers
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
CREATE POLICY "Enable delete for users based on company" ON public.customers
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

-- 4. Testar inserção de cliente de teste
INSERT INTO public.customers (
  empresa_id,
  name,
  phone,
  email
) VALUES (
  '6fe21049-0417-48fd-bb67-646aeed028ae',
  'Cliente Teste RLS',
  '(11) 99999-9999',
  'teste@email.com'
);

-- 5. Verificar se o cliente foi inserido
SELECT 
  id,
  name,
  phone,
  email,
  empresa_id,
  created_at
FROM public.customers
WHERE empresa_id = '6fe21049-0417-48fd-bb67-646aeed028ae'
ORDER BY created_at DESC;




