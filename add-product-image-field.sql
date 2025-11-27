-- Adicionar campo image_url na tabela atelie_products
ALTER TABLE public.atelie_products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.atelie_products.image_url IS 'URL da imagem do produto armazenada no Supabase Storage';

