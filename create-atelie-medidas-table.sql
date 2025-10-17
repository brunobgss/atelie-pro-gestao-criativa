-- Criar tabela de medidas de clientes
CREATE TABLE IF NOT EXISTS atelie_medidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  tipo_peca VARCHAR(50) NOT NULL CHECK (tipo_peca IN ('blusa', 'vestido', 'calca', 'bermuda', 'saia', 'outro')),
  
  -- Medidas superiores
  busto DECIMAL(5,2),
  cintura DECIMAL(5,2),
  quadril DECIMAL(5,2),
  ombro DECIMAL(5,2),
  largura_costas DECIMAL(5,2),
  cava_manga DECIMAL(5,2),
  grossura_braco DECIMAL(5,2),
  comprimento_manga DECIMAL(5,2),
  cana_braco DECIMAL(5,2),
  alca DECIMAL(5,2),
  pescoco DECIMAL(5,2),
  comprimento DECIMAL(5,2),
  
  -- Medidas inferiores
  coxa DECIMAL(5,2),
  tornozelo DECIMAL(5,2),
  comprimento_calca DECIMAL(5,2),
  
  -- Detalhes e observações
  detalhes_superior TEXT,
  detalhes_inferior TEXT,
  observacoes TEXT,
  
  -- Datas
  data_primeira_prova DATE,
  data_entrega DATE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atelie_medidas_cliente_id ON atelie_medidas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atelie_medidas_empresa_id ON atelie_medidas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atelie_medidas_tipo_peca ON atelie_medidas(tipo_peca);
CREATE INDEX IF NOT EXISTS idx_atelie_medidas_created_at ON atelie_medidas(created_at);

-- RLS (Row Level Security)
ALTER TABLE atelie_medidas ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas aos dados da empresa do usuário
CREATE POLICY "Users can only access medidas from their empresa" ON atelie_medidas
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_atelie_medidas_updated_at 
  BEFORE UPDATE ON atelie_medidas 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE atelie_medidas IS 'Tabela para armazenar medidas de clientes para costura';
COMMENT ON COLUMN atelie_medidas.cliente_id IS 'ID do cliente (referência para customers)';
COMMENT ON COLUMN atelie_medidas.cliente_nome IS 'Nome do cliente (duplicado para performance)';
COMMENT ON COLUMN atelie_medidas.tipo_peca IS 'Tipo de peça: blusa, vestido, calca, bermuda, saia, outro';
COMMENT ON COLUMN atelie_medidas.busto IS 'Medida do busto em cm';
COMMENT ON COLUMN atelie_medidas.cintura IS 'Medida da cintura em cm';
COMMENT ON COLUMN atelie_medidas.quadril IS 'Medida do quadril em cm';
COMMENT ON COLUMN atelie_medidas.ombro IS 'Medida do ombro em cm';
COMMENT ON COLUMN atelie_medidas.largura_costas IS 'Largura das costas em cm';
COMMENT ON COLUMN atelie_medidas.cava_manga IS 'Medida da cava da manga em cm';
COMMENT ON COLUMN atelie_medidas.grossura_braco IS 'Grossura do braço em cm';
COMMENT ON COLUMN atelie_medidas.comprimento_manga IS 'Comprimento da manga em cm';
COMMENT ON COLUMN atelie_medidas.cana_braco IS 'Cana do braço em cm';
COMMENT ON COLUMN atelie_medidas.alca IS 'Medida da alça em cm';
COMMENT ON COLUMN atelie_medidas.pescoco IS 'Medida do pescoço em cm';
COMMENT ON COLUMN atelie_medidas.comprimento IS 'Comprimento geral em cm';
COMMENT ON COLUMN atelie_medidas.coxa IS 'Medida da coxa em cm';
COMMENT ON COLUMN atelie_medidas.tornozelo IS 'Medida do tornozelo em cm';
COMMENT ON COLUMN atelie_medidas.comprimento_calca IS 'Comprimento da calça em cm';
COMMENT ON COLUMN atelie_medidas.detalhes_superior IS 'Detalhes específicos das medidas superiores';
COMMENT ON COLUMN atelie_medidas.detalhes_inferior IS 'Detalhes específicos das medidas inferiores';
COMMENT ON COLUMN atelie_medidas.observacoes IS 'Observações gerais sobre as medidas';
COMMENT ON COLUMN atelie_medidas.data_primeira_prova IS 'Data da primeira prova';
COMMENT ON COLUMN atelie_medidas.data_entrega IS 'Data de entrega prevista';
