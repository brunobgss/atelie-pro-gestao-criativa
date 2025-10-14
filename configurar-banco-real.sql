-- Script para configurar banco de dados real para clientes
-- Execute no Supabase SQL Editor

-- 1. Criar tabela customers se não existir
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar índice para empresa_id para otimização
CREATE INDEX IF NOT EXISTS customers_empresa_id_idx ON public.customers (empresa_id);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
-- Política para permitir que usuários vejam apenas seus próprios clientes
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers" ON public.customers
FOR SELECT USING (
  (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) = empresa_id
);

-- Política para permitir que usuários insiram clientes para sua empresa
DROP POLICY IF EXISTS "Users can insert customers for their own company" ON public.customers;
CREATE POLICY "Users can insert customers for their own company" ON public.customers
FOR INSERT WITH CHECK (
  (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) = empresa_id
);

-- Política para permitir que usuários atualizem seus próprios clientes
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
CREATE POLICY "Users can update their own customers" ON public.customers
FOR UPDATE USING (
  (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) = empresa_id
) WITH CHECK (
  (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) = empresa_id
);

-- Política para permitir que usuários deletem seus próprios clientes
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
CREATE POLICY "Users can delete their own customers" ON public.customers
FOR DELETE USING (
  (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) = empresa_id
);

-- 5. Função para atualizar 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para 'customers'
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Verificar se a tabela foi criada e RLS está habilitado
SELECT 'customers table created and RLS configured' AS status;

-- 8. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customers';
