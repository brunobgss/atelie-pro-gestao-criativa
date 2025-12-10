-- 💼 CRIAR TABELA DE SERVIÇOS PARA ATELIÊ PRO
-- Esta tabela permite cadastrar serviços comuns para seleção rápida ao criar pedidos

-- 1. Criar tabela de serviços
CREATE TABLE IF NOT EXISTS atelie_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor_padrao NUMERIC(10,2),
    tempo_estimado INTEGER, -- em minutos
    categoria VARCHAR(100), -- ex: "Conserto", "Ajuste", "Personalização"
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE atelie_servicos ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS
DROP POLICY IF EXISTS "Users can view servicos from their empresa" ON atelie_servicos;
CREATE POLICY "Users can view servicos from their empresa" ON atelie_servicos
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert servicos for their empresa" ON atelie_servicos;
CREATE POLICY "Users can insert servicos for their empresa" ON atelie_servicos
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update servicos for their empresa" ON atelie_servicos;
CREATE POLICY "Users can update servicos for their empresa" ON atelie_servicos
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete servicos from their empresa" ON atelie_servicos;
CREATE POLICY "Users can delete servicos from their empresa" ON atelie_servicos
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM user_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_servicos_empresa ON atelie_servicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON atelie_servicos(ativo);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON atelie_servicos(categoria);

-- 5. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_atelie_servicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_atelie_servicos_updated_at ON atelie_servicos;
CREATE TRIGGER trigger_update_atelie_servicos_updated_at
    BEFORE UPDATE ON atelie_servicos
    FOR EACH ROW
    EXECUTE FUNCTION update_atelie_servicos_updated_at();

-- 6. Inserir alguns serviços padrão para ateliê de conserto (exemplo)
-- NOTA: Estes serão inseridos apenas se não existirem
INSERT INTO atelie_servicos (empresa_id, nome, descricao, valor_padrao, tempo_estimado, categoria, ativo)
SELECT 
    e.id,
    'Conserto de Zíper',
    'Conserto ou substituição de zíper',
    25.00,
    30,
    'Conserto',
    true
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM atelie_servicos s 
    WHERE s.empresa_id = e.id AND s.nome = 'Conserto de Zíper'
)
ON CONFLICT DO NOTHING;

INSERT INTO atelie_servicos (empresa_id, nome, descricao, valor_padrao, tempo_estimado, categoria, ativo)
SELECT 
    e.id,
    'Ajuste de Barra',
    'Ajuste de barra de calça',
    20.00,
    20,
    'Ajuste',
    true
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM atelie_servicos s 
    WHERE s.empresa_id = e.id AND s.nome = 'Ajuste de Barra'
)
ON CONFLICT DO NOTHING;

INSERT INTO atelie_servicos (empresa_id, nome, descricao, valor_padrao, tempo_estimado, categoria, ativo)
SELECT 
    e.id,
    'Ajuste de Manga',
    'Ajuste de comprimento de manga',
    15.00,
    15,
    'Ajuste',
    true
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM atelie_servicos s 
    WHERE s.empresa_id = e.id AND s.nome = 'Ajuste de Manga'
)
ON CONFLICT DO NOTHING;

INSERT INTO atelie_servicos (empresa_id, nome, descricao, valor_padrao, tempo_estimado, categoria, ativo)
SELECT 
    e.id,
    'Bainha',
    'Fazer bainha em calça ou saia',
    18.00,
    25,
    'Ajuste',
    true
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM atelie_servicos s 
    WHERE s.empresa_id = e.id AND s.nome = 'Bainha'
)
ON CONFLICT DO NOTHING;

-- 7. Verificar se foi criado corretamente
SELECT 'Tabela atelie_servicos criada com sucesso!' as status;

-- 8. Listar serviços criados (se houver)
SELECT 
    nome,
    categoria,
    valor_padrao,
    tempo_estimado,
    ativo
FROM atelie_servicos
ORDER BY categoria, nome;

