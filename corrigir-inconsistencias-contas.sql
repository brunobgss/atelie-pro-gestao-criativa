-- ============================================
-- Script para corrigir inconsistências em contas
-- ============================================
-- 
-- Este script corrige contas que têm status "pago" ou "recebido"
-- mas não têm valor pago/recebido (valor = 0)
--
-- A correção muda o status para "pendente" já que não foram
-- realmente pagas/recebidas
--
-- ============================================

-- 1. VERIFICAR INCONSISTÊNCIAS (Execute primeiro para ver o que será corrigido)
-- ============================================

-- Contas a Pagar com status "pago" mas valor_pago = 0
SELECT 
  id,
  empresa_id,
  descricao,
  status,
  valor_total,
  valor_pago,
  data_vencimento,
  data_pagamento,
  'Será alterado para: pendente' as acao
FROM contas_pagar
WHERE status = 'pago' 
  AND (valor_pago IS NULL OR valor_pago = 0)
  AND valor_total > 0;

-- Contas a Receber com status "recebido" mas valor_recebido = 0
SELECT 
  id,
  empresa_id,
  descricao,
  status,
  valor_total,
  valor_recebido,
  data_vencimento,
  data_recebimento,
  'Será alterado para: pendente' as acao
FROM contas_receber
WHERE status = 'recebido' 
  AND (valor_recebido IS NULL OR valor_recebido = 0)
  AND valor_total > 0;

-- ============================================
-- 2. CORRIGIR INCONSISTÊNCIAS
-- ============================================
-- Execute apenas após verificar os resultados acima!

BEGIN;

-- Corrigir Contas a Pagar: status "pago" mas valor_pago = 0
UPDATE contas_pagar
SET 
  status = 'pendente',
  data_pagamento = NULL,
  updated_at = NOW()
WHERE status = 'pago' 
  AND (valor_pago IS NULL OR valor_pago = 0)
  AND valor_total > 0;

-- Corrigir Contas a Receber: status "recebido" mas valor_recebido = 0
UPDATE contas_receber
SET 
  status = 'pendente',
  data_recebimento = NULL,
  updated_at = NOW()
WHERE status = 'recebido' 
  AND (valor_recebido IS NULL OR valor_recebido = 0)
  AND valor_total > 0;

-- Verificar quantas contas foram corrigidas
SELECT 
  'Contas a Pagar corrigidas' as tipo,
  COUNT(*) as quantidade
FROM contas_pagar
WHERE status = 'pendente'
  AND updated_at >= NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 
  'Contas a Receber corrigidas' as tipo,
  COUNT(*) as quantidade
FROM contas_receber
WHERE status = 'pendente'
  AND updated_at >= NOW() - INTERVAL '1 minute';

-- Se estiver tudo certo, execute COMMIT
-- Se quiser desfazer, execute ROLLBACK
COMMIT;

-- ============================================
-- 3. VERIFICAR RESULTADO FINAL
-- ============================================

-- Verificar se ainda há inconsistências
SELECT 
  'Contas a Pagar ainda inconsistentes' as tipo,
  COUNT(*) as quantidade
FROM contas_pagar
WHERE status = 'pago' 
  AND (valor_pago IS NULL OR valor_pago = 0)
  AND valor_total > 0
UNION ALL
SELECT 
  'Contas a Receber ainda inconsistentes' as tipo,
  COUNT(*) as quantidade
FROM contas_receber
WHERE status = 'recebido' 
  AND (valor_recebido IS NULL OR valor_recebido = 0)
  AND valor_total > 0;
