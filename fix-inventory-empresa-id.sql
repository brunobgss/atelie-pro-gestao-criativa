-- Script para corrigir itens do estoque sem empresa_id
-- Este script associa itens órfãos à primeira empresa do usuário

-- 1. Verificar itens sem empresa_id
SELECT 
    id, 
    name, 
    quantity, 
    empresa_id,
    created_at
FROM inventory_items 
WHERE empresa_id IS NULL 
ORDER BY created_at;

-- 2. Atualizar itens sem empresa_id para associar à primeira empresa
-- (Assumindo que existe pelo menos uma empresa no sistema)
UPDATE inventory_items 
SET empresa_id = (
    SELECT id 
    FROM empresas 
    ORDER BY created_at 
    LIMIT 1
)
WHERE empresa_id IS NULL;

-- 3. Verificar se a correção funcionou
SELECT 
    COUNT(*) as total_items,
    COUNT(empresa_id) as items_with_empresa,
    COUNT(*) - COUNT(empresa_id) as items_without_empresa
FROM inventory_items;

-- 4. Mostrar itens corrigidos
SELECT 
    id, 
    name, 
    quantity, 
    empresa_id,
    created_at
FROM inventory_items 
WHERE empresa_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
