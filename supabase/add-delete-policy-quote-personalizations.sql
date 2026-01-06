-- =====================================================
-- ADICIONAR POLÍTICA DELETE PARA QUOTE PERSONALIZATIONS
-- =====================================================
-- Este script adiciona uma política RLS para permitir
-- DELETE em atelie_quote_personalizations
-- =====================================================

-- Verificar se a política já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'atelie_quote_personalizations'
    AND policyname = 'Users can delete quote personalizations from their empresa'
  ) THEN
    -- Criar política DELETE
    CREATE POLICY "Users can delete quote personalizations from their empresa" 
    ON public.atelie_quote_personalizations
    FOR DELETE 
    USING (
      empresa_id IN (
        SELECT empresa_id FROM public.user_empresas 
        WHERE user_id = auth.uid()
      )
    );
    
    RAISE NOTICE 'Política DELETE criada com sucesso!';
  ELSE
    RAISE NOTICE 'Política DELETE já existe.';
  END IF;
END $$;

-- Verificar todas as políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'atelie_quote_personalizations'
ORDER BY policyname;

