-- Script SIMPLES para configurar Storage
-- Execute este script no Supabase SQL Editor

-- 1. Criar bucket 'orders' (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar se foi criado
SELECT * FROM storage.buckets WHERE id = 'orders';

-- 3. Configurar RLS básico para o bucket
-- Remover políticas existentes primeiro
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Criar políticas
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'orders' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'orders' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'orders' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'orders' AND auth.role() = 'authenticated'
);

-- 4. Verificar políticas
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
