-- Focus NF - Tabelas e configurações para emissão de notas fiscais
-- Execute este arquivo no Supabase SQL Editor

-- 1. Adicionar coluna para identificar se o plano tem NF
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS tem_nota_fiscal BOOLEAN DEFAULT false;

-- 2. Tabela para configurações da Focus NF por empresa
CREATE TABLE IF NOT EXISTS public.focusnf_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  token_producao TEXT, -- Token de produção (criptografado)
  token_homologacao TEXT, -- Token de homologação (criptografado)
  ambiente VARCHAR(20) DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
  cnpj_emitente VARCHAR(18) NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  endereco_logradouro TEXT,
  endereco_numero VARCHAR(10),
  endereco_complemento TEXT,
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_uf VARCHAR(2),
  endereco_cep VARCHAR(10),
  telefone VARCHAR(20),
  email TEXT,
  certificado_arquivo TEXT, -- URL do certificado A1 (se necessário)
  certificado_senha TEXT, -- Senha do certificado (criptografada)
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id)
);

-- 3. Tabela para armazenar notas fiscais emitidas
CREATE TABLE IF NOT EXISTS public.focusnf_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.atelie_orders(id) ON DELETE SET NULL,
  order_code VARCHAR(50), -- Código do pedido relacionado
  ref VARCHAR(100) NOT NULL, -- Referência única da nota (usado na API)
  tipo_nota VARCHAR(10) DEFAULT 'NFe' CHECK (tipo_nota IN ('NFe', 'NFSe', 'NFCe', 'CTe', 'MDFe', 'NFCom', 'MDe')),
  status VARCHAR(50) DEFAULT 'processando_autorizacao', -- processando_autorizacao, autorizado, cancelado, erro
  numero VARCHAR(20), -- Número da nota fiscal
  serie VARCHAR(10), -- Série da nota
  chave_acesso TEXT, -- Chave de acesso da nota
  valor_total DECIMAL(10,2),
  xml_url TEXT, -- URL do XML da nota
  danfe_url TEXT, -- URL do DANFE (espelho)
  ambiente VARCHAR(20) DEFAULT 'homologacao',
  dados_enviados JSONB, -- Dados enviados para a API
  dados_retornados JSONB, -- Resposta completa da API
  erro_mensagem TEXT, -- Mensagem de erro (se houver)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_focusnf_config_empresa ON public.focusnf_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_focusnf_notas_empresa ON public.focusnf_notas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_focusnf_notas_order ON public.focusnf_notas(order_id);
CREATE INDEX IF NOT EXISTS idx_focusnf_notas_order_code ON public.focusnf_notas(order_code);
CREATE INDEX IF NOT EXISTS idx_focusnf_notas_ref ON public.focusnf_notas(ref);
CREATE INDEX IF NOT EXISTS idx_focusnf_notas_status ON public.focusnf_notas(status);

-- 5. Habilitar RLS
ALTER TABLE public.focusnf_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focusnf_notas ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para focusnf_config
DROP POLICY IF EXISTS "Usuários podem ver configuração da própria empresa" ON public.focusnf_config;
CREATE POLICY "Usuários podem ver configuração da própria empresa"
  ON public.focusnf_config FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem inserir configuração da própria empresa" ON public.focusnf_config;
CREATE POLICY "Usuários podem inserir configuração da própria empresa"
  ON public.focusnf_config FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem atualizar configuração da própria empresa" ON public.focusnf_config;
CREATE POLICY "Usuários podem atualizar configuração da própria empresa"
  ON public.focusnf_config FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem deletar configuração da própria empresa" ON public.focusnf_config;
CREATE POLICY "Usuários podem deletar configuração da própria empresa"
  ON public.focusnf_config FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- 7. Políticas RLS para focusnf_notas
DROP POLICY IF EXISTS "Usuários podem ver notas da própria empresa" ON public.focusnf_notas;
CREATE POLICY "Usuários podem ver notas da própria empresa"
  ON public.focusnf_notas FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem inserir notas da própria empresa" ON public.focusnf_notas;
CREATE POLICY "Usuários podem inserir notas da própria empresa"
  ON public.focusnf_notas FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem atualizar notas da própria empresa" ON public.focusnf_notas;
CREATE POLICY "Usuários podem atualizar notas da própria empresa"
  ON public.focusnf_notas FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem deletar notas da própria empresa" ON public.focusnf_notas;
CREATE POLICY "Usuários podem deletar notas da própria empresa"
  ON public.focusnf_notas FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.user_empresas 
      WHERE user_id = auth.uid()
    )
  );

