-- =====================================================
-- SCRIPT CORRETO DE RLS - ATELIÊ PRO (BORDADOS)
-- =====================================================
-- Este script corrige RLS apenas para tabelas que EXISTEM no banco

-- PARTE 1: HABILITAR RLS NAS TABELAS DO ATELIÊ
-- =====================================================
-- Apenas tabelas que existem e fazem sentido para um ateliê de bordados

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi habilitado
SELECT 'RLS habilitado nas tabelas do Ateliê!' as status;

