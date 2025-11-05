-- Tabela para produtos fiscais (NCM, CST, etc.)
-- Permite configurar produtos com informações tributárias específicas
CREATE TABLE IF NOT EXISTS public.focusnf_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  codigo_produto VARCHAR(100), -- Código interno do produto
  codigo_ncm VARCHAR(10) NOT NULL DEFAULT '6204.62.00', -- NCM padrão para confecções
  cfop VARCHAR(10) DEFAULT '5102', -- CFOP padrão
  unidade VARCHAR(10) DEFAULT 'UN',
  icms_situacao_tributaria INTEGER, -- NULL = usar do regime tributário
  pis_situacao_tributaria VARCHAR(10), -- NULL = usar do regime tributário
  cofins_situacao_tributaria VARCHAR(10), -- NULL = usar do regime tributário
  icms_origem INTEGER DEFAULT 0, -- 0=Nacional
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo_produto)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_focusnf_produtos_empresa_id ON public.focusnf_produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_focusnf_produtos_codigo ON public.focusnf_produtos(empresa_id, codigo_produto);

-- RLS (Row Level Security)
ALTER TABLE public.focusnf_produtos ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas aos produtos da empresa do usuário
CREATE POLICY "Users can access produtos from their empresa" ON public.focusnf_produtos
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.focusnf_produtos IS 'Produtos fiscais com configurações tributárias (NCM, CST, etc.)';

