-- =====================================================
-- SCRIPT SIMPLES DE CORREÇÃO DE RLS - ATELIÊ PRO
-- =====================================================
-- Execute este script em partes para evitar erros

-- PARTE 1: HABILITAR RLS (Execute primeiro)
-- =====================================================
ALTER TABLE public.cars_in_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi habilitado
SELECT 'RLS habilitado com sucesso!' as status;