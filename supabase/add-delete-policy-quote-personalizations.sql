-- =====================================================
-- CORRIGIR POLÍTICA DELETE PARA QUOTE PERSONALIZATIONS
-- =====================================================
-- Este script corrige a política RLS DELETE para seguir
-- o mesmo padrão das outras políticas (verificando via quote)
-- =====================================================

-- Remover a política antiga se existir
DROP POLICY IF EXISTS "Users can delete quote personalizations from their empresa" 
ON public.atelie_quote_personalizations;

-- Criar política DELETE seguindo o mesmo padrão das outras políticas
-- (verificando através do quote, não diretamente pelo empresa_id)
CREATE POLICY "Users can delete quote personalizations from their empresa" 
ON public.atelie_quote_personalizations
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    JOIN public.atelie_quotes q ON q.empresa_id = ue.empresa_id
    WHERE ue.user_id = auth.uid()
    AND q.id = atelie_quote_personalizations.quote_id
  )
);

RAISE NOTICE 'Política DELETE corrigida com sucesso!';

-- Verificar todas as políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'atelie_quote_personalizations'
ORDER BY policyname;

