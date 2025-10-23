-- Script para criar a tabela profiles e corrigir usuários existentes
-- Execute este script no SQL Editor do Supabase

-- 1. Criar a tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS para profiles
DROP POLICY IF EXISTS "users_select_own_profile" ON public.profiles;
CREATE POLICY "users_select_own_profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Criar perfis para usuários existentes que não têm
INSERT INTO public.profiles (user_id, email, full_name)
SELECT 
  au.id,
  COALESCE(au.email, e.email, 'sem-email@exemplo.com'),
  COALESCE(e.responsavel, e.nome, 'Usuário')
FROM auth.users au
LEFT JOIN public.user_empresas ue ON au.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL
  AND ue.empresa_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Verificar se a correção funcionou
SELECT 
  au.email as auth_email,
  p.email as profile_email,
  p.full_name,
  e.nome as empresa_nome
FROM auth.users au
JOIN public.profiles p ON au.id = p.user_id
LEFT JOIN public.user_empresas ue ON au.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
ORDER BY au.email;
