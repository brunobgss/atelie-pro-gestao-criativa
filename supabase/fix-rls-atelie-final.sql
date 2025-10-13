-- =====================================================
-- SCRIPT CORRETO DE RLS - ATELIÊ PRO (TABELAS CONFIRMADAS)
-- =====================================================
-- Apenas tabelas que realmente existem no banco

-- HABILITAR RLS NAS TABELAS QUE EXISTEM
-- =====================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN tablename = 'customers' THEN '👥 Clientes'
        WHEN tablename = 'empresas' THEN '🏢 Ateliês'
        WHEN tablename = 'quotes' THEN '📋 Orçamentos'
        WHEN tablename = 'user_empresas' THEN '👤 Usuários'
        WHEN tablename = 'inventory_items' THEN '📦 Estoque'
        ELSE tablename
    END as descricao
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'customers', 'empresas', 'quotes', 'user_empresas', 'inventory_items'
)
ORDER BY tablename;


