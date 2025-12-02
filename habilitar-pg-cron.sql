-- 🔧 HABILITAR EXTENSÃO pg_cron
-- Execute este script no Supabase SQL Editor para habilitar a extensão pg_cron

-- Habilitar a extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verificar se foi habilitada
SELECT 
    extname as extensao,
    extversion as versao
FROM pg_extension
WHERE extname = 'pg_cron';









