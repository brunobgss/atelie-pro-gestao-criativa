-- Criar tabela atelie_products para salvar produtos da calculadora
CREATE TABLE IF NOT EXISTS public.atelie_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  materials JSONB,
  work_hours DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  profit_margin DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_atelie_products_type ON public.atelie_products(type);
CREATE INDEX IF NOT EXISTS idx_atelie_products_created_at ON public.atelie_products(created_at);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_atelie_products_updated_at 
    BEFORE UPDATE ON public.atelie_products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.atelie_products ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso a todos os usuários autenticados
CREATE POLICY "Allow all operations for authenticated users" ON public.atelie_products
    FOR ALL USING (auth.role() = 'authenticated');

-- Inserir alguns produtos de exemplo
INSERT INTO public.atelie_products (name, type, materials, work_hours, unit_price, profit_margin) VALUES
('Bordado Simples', 'bordado', '{"linha": 2, "tecido": 1}', 1.5, 25.00, 35.0),
('Camiseta Personalizada', 'camiseta', '{"camiseta": 1, "tinta": 0.1}', 0.5, 35.00, 50.0),
('Caneca Personalizada', 'caneca', '{"caneca": 1, "tinta": 0.05}', 0.3, 20.00, 40.0);
