# Instruções para Corrigir Inconsistências nas Contas

## Problema Identificado

Algumas contas têm status "pago" ou "recebido" mas não têm valor pago/recebido (valor = 0). Isso causa problemas no Fluxo de Caixa.

## Como Corrigir

### Passo 1: Verificar Inconsistências

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `corrigir-inconsistencias-contas.sql`
4. Execute **apenas a primeira parte** (seção "1. VERIFICAR INCONSISTÊNCIAS")
5. Veja quais contas serão afetadas

### Passo 2: Corrigir os Dados

1. Se estiver tudo certo com a verificação, execute a seção "2. CORRIGIR INCONSISTÊNCIAS"
2. O script irá:
   - Mudar o status de "pago" para "pendente" quando `valor_pago = 0`
   - Mudar o status de "recebido" para "pendente" quando `valor_recebido = 0`
   - Limpar as datas de pagamento/recebimento
3. Execute a seção "3. VERIFICAR RESULTADO FINAL" para confirmar que não há mais inconsistências

### Passo 3: Verificar no App

1. Recarregue a página do Fluxo de Caixa
2. As contas corrigidas agora devem aparecer corretamente
3. Os totais devem estar corretos

## O que o Script Faz

- **Contas a Pagar**: Se status = "pago" mas `valor_pago = 0` → muda para "pendente"
- **Contas a Receber**: Se status = "recebido" mas `valor_recebido = 0` → muda para "pendente"

## Importante

- O script usa `BEGIN` e `COMMIT` para garantir que todas as alterações sejam feitas juntas
- Se algo der errado, você pode executar `ROLLBACK` antes do `COMMIT` para desfazer
- O script só afeta contas com `valor_total > 0` para evitar problemas com contas zeradas
