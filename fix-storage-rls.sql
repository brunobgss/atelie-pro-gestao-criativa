-- Script para configurar Storage e RLS para upload de arquivos
-- Este script cria o bucket 'orders' e configura as políticas de segurança

-- 1. Criar bucket 'orders' se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orders',
  'orders',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS no bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política para SELECT (visualizar arquivos)
CREATE POLICY "orders_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'orders' AND
  EXISTS (
    SELECT 1 FROM user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

-- 4. Política para INSERT (upload de arquivos)
CREATE POLICY "orders_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'orders' AND
  EXISTS (
    SELECT 1 FROM user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

-- 5. Política para UPDATE (atualizar arquivos)
CREATE POLICY "orders_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'orders' AND
  EXISTS (
    SELECT 1 FROM user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

-- 6. Política para DELETE (excluir arquivos)
CREATE POLICY "orders_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'orders' AND
  EXISTS (
    SELECT 1 FROM user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

-- 7. Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'orders';

-- 8. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
