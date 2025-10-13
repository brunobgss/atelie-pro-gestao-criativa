-- Corrigir RLS da tabela orders
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

-- Política para INSERT - permitir criação de pedidos para usuários autenticados
CREATE POLICY "orders_insert_policy" ON public.orders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para SELECT - permitir leitura de pedidos para usuários autenticados
CREATE POLICY "orders_select_policy" ON public.orders
FOR SELECT USING (auth.role() = 'authenticated');

-- Política para UPDATE - permitir atualização de pedidos para usuários autenticados
CREATE POLICY "orders_update_policy" ON public.orders
FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - permitir exclusão de pedidos para usuários autenticados
CREATE POLICY "orders_delete_policy" ON public.orders
FOR DELETE USING (auth.role() = 'authenticated');

-- Verificar se as políticas foram criadas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;


