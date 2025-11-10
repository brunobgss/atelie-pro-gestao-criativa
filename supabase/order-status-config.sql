-- ============================================
-- CONFIGURAÇÃO: Personalização dos status do pedido por empresa
-- Execute no Supabase SQL Editor antes de rodar o app em produção
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_status_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, status_key)
);

CREATE INDEX IF NOT EXISTS idx_order_status_configs_empresa_id
  ON public.order_status_configs(empresa_id);

ALTER TABLE public.order_status_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their status configs" ON public.order_status_configs;
CREATE POLICY "Users can view their status configs" ON public.order_status_configs
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their status configs" ON public.order_status_configs;
CREATE POLICY "Users can insert their status configs" ON public.order_status_configs
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their status configs" ON public.order_status_configs;
CREATE POLICY "Users can update their status configs" ON public.order_status_configs
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
    )
  );

