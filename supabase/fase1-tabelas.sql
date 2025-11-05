-- =====================================================
-- FASE 1: TABELAS PARA EQUIPARAR AO BLING
-- =====================================================

-- 1. VARIAÇÕES DE PRODUTOS (Tamanhos, Cores, Modelos)
CREATE TABLE IF NOT EXISTS public.produto_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.atelie_products(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_variacao VARCHAR(50) NOT NULL CHECK (tipo_variacao IN ('tamanho', 'cor', 'modelo', 'outro')),
  valor VARCHAR(100) NOT NULL,
  codigo_barras VARCHAR(50),
  sku VARCHAR(50),
  estoque_atual NUMERIC(12,2) DEFAULT 0,
  estoque_minimo NUMERIC(12,2) DEFAULT 0,
  preco_venda NUMERIC(12,2),
  preco_custo NUMERIC(12,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, tipo_variacao, valor)
);

CREATE INDEX IF NOT EXISTS idx_produto_variacoes_produto ON public.produto_variacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_variacoes_empresa ON public.produto_variacoes(empresa_id);

-- 2. FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_fantasia VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE,
  cpf VARCHAR(14),
  inscricao_estadual VARCHAR(50),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  endereco_logradouro VARCHAR(255),
  endereco_numero VARCHAR(20),
  endereco_complemento VARCHAR(100),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_uf VARCHAR(2),
  endereco_cep VARCHAR(10),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, cnpj),
  UNIQUE(empresa_id, cpf)
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON public.fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj);

-- 3. CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  valor_total NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  pedido_compra_id UUID, -- Será referenciado depois
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa ON public.contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON public.contas_pagar(status);

-- 4. CONTAS A RECEBER (expandindo além de receitas)
CREATE TABLE IF NOT EXISTS public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  pedido_id UUID REFERENCES public.atelie_orders(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  valor_total NUMERIC(12,2) NOT NULL,
  valor_recebido NUMERIC(12,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'atrasado', 'cancelado')),
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_receber_empresa ON public.contas_receber(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON public.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_pedido ON public.contas_receber(pedido_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON public.contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON public.contas_receber(status);

-- 5. PEDIDOS DE COMPRA
CREATE TABLE IF NOT EXISTS public.pedidos_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  valor_total NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'recebido', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_empresa ON public.pedidos_compra(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_fornecedor ON public.pedidos_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status ON public.pedidos_compra(status);

-- 6. ITENS DE PEDIDO DE COMPRA
CREATE TABLE IF NOT EXISTS public.pedidos_compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_compra_id UUID NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.atelie_products(id) ON DELETE SET NULL,
  variacao_id UUID REFERENCES public.produto_variacoes(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL,
  valor_unitario NUMERIC(12,2) NOT NULL,
  valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  quantidade_recebida NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_pedido ON public.pedidos_compra_itens(pedido_compra_id);

-- 7. MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.atelie_products(id) ON DELETE SET NULL,
  variacao_id UUID REFERENCES public.produto_variacoes(id) ON DELETE SET NULL,
  tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'ajuste', 'transferencia', 'perda', 'devolucao')),
  quantidade NUMERIC(12,2) NOT NULL,
  quantidade_anterior NUMERIC(12,2),
  quantidade_atual NUMERIC(12,2),
  motivo TEXT,
  origem VARCHAR(100), -- 'pedido_compra', 'pedido_venda', 'ajuste_manual', etc
  origem_id UUID, -- ID do registro origem (pedido, compra, etc)
  lote VARCHAR(100),
  data_validade DATE,
  valor_unitario NUMERIC(12,2),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa ON public.movimentacoes_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON public.movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_variacao ON public.movimentacoes_estoque(variacao_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON public.movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON public.movimentacoes_estoque(created_at);

-- 8. LOTES (para produtos com controle de lote)
CREATE TABLE IF NOT EXISTS public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.atelie_products(id) ON DELETE CASCADE,
  variacao_id UUID REFERENCES public.produto_variacoes(id) ON DELETE CASCADE,
  numero_lote VARCHAR(100) NOT NULL,
  quantidade_inicial NUMERIC(12,2) NOT NULL,
  quantidade_atual NUMERIC(12,2) NOT NULL,
  data_fabricacao DATE,
  data_validade DATE,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, produto_id, variacao_id, numero_lote)
);

CREATE INDEX IF NOT EXISTS idx_lotes_empresa ON public.lotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lotes_produto ON public.lotes(produto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_validade ON public.lotes(data_validade);

-- RLS POLICIES

-- Produto Variações
ALTER TABLE public.produto_variacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view produto_variacoes from their empresa" ON public.produto_variacoes;
CREATE POLICY "Users can view produto_variacoes from their empresa" ON public.produto_variacoes
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert produto_variacoes for their empresa" ON public.produto_variacoes;
CREATE POLICY "Users can insert produto_variacoes for their empresa" ON public.produto_variacoes
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update produto_variacoes for their empresa" ON public.produto_variacoes;
CREATE POLICY "Users can update produto_variacoes for their empresa" ON public.produto_variacoes
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete produto_variacoes for their empresa" ON public.produto_variacoes;
CREATE POLICY "Users can delete produto_variacoes for their empresa" ON public.produto_variacoes
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fornecedores from their empresa" ON public.fornecedores;
CREATE POLICY "Users can view fornecedores from their empresa" ON public.fornecedores
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert fornecedores for their empresa" ON public.fornecedores;
CREATE POLICY "Users can insert fornecedores for their empresa" ON public.fornecedores
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update fornecedores for their empresa" ON public.fornecedores;
CREATE POLICY "Users can update fornecedores for their empresa" ON public.fornecedores
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete fornecedores for their empresa" ON public.fornecedores;
CREATE POLICY "Users can delete fornecedores for their empresa" ON public.fornecedores
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Contas a Pagar
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contas_pagar from their empresa" ON public.contas_pagar;
CREATE POLICY "Users can view contas_pagar from their empresa" ON public.contas_pagar
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert contas_pagar for their empresa" ON public.contas_pagar;
CREATE POLICY "Users can insert contas_pagar for their empresa" ON public.contas_pagar
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update contas_pagar for their empresa" ON public.contas_pagar;
CREATE POLICY "Users can update contas_pagar for their empresa" ON public.contas_pagar
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete contas_pagar for their empresa" ON public.contas_pagar;
CREATE POLICY "Users can delete contas_pagar for their empresa" ON public.contas_pagar
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Contas a Receber
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contas_receber from their empresa" ON public.contas_receber;
CREATE POLICY "Users can view contas_receber from their empresa" ON public.contas_receber
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert contas_receber for their empresa" ON public.contas_receber;
CREATE POLICY "Users can insert contas_receber for their empresa" ON public.contas_receber
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update contas_receber for their empresa" ON public.contas_receber;
CREATE POLICY "Users can update contas_receber for their empresa" ON public.contas_receber
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete contas_receber for their empresa" ON public.contas_receber;
CREATE POLICY "Users can delete contas_receber for their empresa" ON public.contas_receber
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Pedidos de Compra
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pedidos_compra from their empresa" ON public.pedidos_compra;
CREATE POLICY "Users can view pedidos_compra from their empresa" ON public.pedidos_compra
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert pedidos_compra for their empresa" ON public.pedidos_compra;
CREATE POLICY "Users can insert pedidos_compra for their empresa" ON public.pedidos_compra
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update pedidos_compra for their empresa" ON public.pedidos_compra;
CREATE POLICY "Users can update pedidos_compra for their empresa" ON public.pedidos_compra
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete pedidos_compra for their empresa" ON public.pedidos_compra;
CREATE POLICY "Users can delete pedidos_compra for their empresa" ON public.pedidos_compra
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Pedidos de Compra Itens
ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pedidos_compra_itens from their empresa" ON public.pedidos_compra_itens;
CREATE POLICY "Users can view pedidos_compra_itens from their empresa" ON public.pedidos_compra_itens
  FOR SELECT USING (
    pedido_compra_id IN (
      SELECT id FROM pedidos_compra 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens;
CREATE POLICY "Users can insert pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens
  FOR INSERT WITH CHECK (
    pedido_compra_id IN (
      SELECT id FROM pedidos_compra 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens;
CREATE POLICY "Users can update pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens
  FOR UPDATE USING (
    pedido_compra_id IN (
      SELECT id FROM pedidos_compra 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens;
CREATE POLICY "Users can delete pedidos_compra_itens for their empresa" ON public.pedidos_compra_itens
  FOR DELETE USING (
    pedido_compra_id IN (
      SELECT id FROM pedidos_compra 
      WHERE empresa_id IN (
        SELECT empresa_id FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Movimentações de Estoque
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view movimentacoes_estoque from their empresa" ON public.movimentacoes_estoque;
CREATE POLICY "Users can view movimentacoes_estoque from their empresa" ON public.movimentacoes_estoque
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert movimentacoes_estoque for their empresa" ON public.movimentacoes_estoque;
CREATE POLICY "Users can insert movimentacoes_estoque for their empresa" ON public.movimentacoes_estoque
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Lotes
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lotes from their empresa" ON public.lotes;
CREATE POLICY "Users can view lotes from their empresa" ON public.lotes
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert lotes for their empresa" ON public.lotes;
CREATE POLICY "Users can insert lotes for their empresa" ON public.lotes
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update lotes for their empresa" ON public.lotes;
CREATE POLICY "Users can update lotes for their empresa" ON public.lotes
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete lotes for their empresa" ON public.lotes;
CREATE POLICY "Users can delete lotes for their empresa" ON public.lotes
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

