# 🔍 Diagnóstico do Webhook ASAAS

## Problema Identificado

O usuário `ateliepro751@gmail.com` pagou o plano mensal (R$ 39,00), mas o sistema não atualizou automaticamente como premium. A atualização foi feita manualmente.

## Configuração Necessária

### 1. Variáveis de Ambiente no Vercel

Você precisa configurar as seguintes variáveis no painel do Vercel:

```
SUPABASE_URL=https://xthioxkfkxjvqcjqllfy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Como configurar:**
1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables
2. Adicione as variáveis acima
3. Clique em "Save"
4. Faça um novo deploy (ou aguarde alguns minutos para o deploy automático)

### 2. Webhook no Asaas

**URL do Webhook:**
```
https://app.ateliepro.online/api/webhooks/asaas
```

**Eventos que devem estar ativados:**
- ✅ PAYMENT_CREATED
- ✅ PAYMENT_RECEIVED
- ✅ PAYMENT_CONFIRMED
- ✅ SUBSCRIPTION_CREATED
- ✅ SUBSCRIPTION_UPDATED
- ✅ SUBSCRIPTION_DELETED

**Como configurar:**
1. Acesse: https://www.asaas.com/ (sua conta)
2. Vá em: Configurações → API → Webhooks
3. Adicione a URL acima
4. Selecione os eventos listados acima
5. Salve

### 3. Verificar Logs do Webhook

**No Vercel:**
1. Acesse: https://vercel.com/seu-projeto
2. Vá em: Deployments → [último deploy] → Functions
3. Clique em: `api/webhooks/asaas`
4. Veja os logs em tempo real

**O que procurar:**
- ✅ `🔔 Webhook ASAAS recebido (POST)`
- ❌ `❌ Dados do webhook inválidos`
- ✅ `💰 Pagamento recebido:`
- ✅ `✅ Premium ativado com sucesso`

## Teste Manual do Webhook

Você pode testar o webhook manualmente enviando um payload de teste:

```bash
curl -X POST https://app.ateliepro.online/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_123456",
      "value": 39.00,
      "externalReference": "ID_DA_EMPRESA_AQUI"
    }
  }'
```

## Problemas Comuns

### 1. Webhook não está recebendo requisições
**Sintoma:** Não há logs no Vercel
**Solução:** 
- Verifique se a URL está correta no Asaas
- Verifique se o domínio está funcionando

### 2. Webhook recebe mas retorna erro 400
**Sintoma:** Logs mostram `❌ Dados do webhook inválidos`
**Solução:** Verifique o formato do payload enviado pelo Asaas

### 3. Webhook recebe mas não atualiza o banco
**Sintoma:** Logs mostram sucesso mas o banco não muda
**Solução:**
- Verifique se as variáveis de ambiente estão configuradas no Vercel
- Verifique se `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão corretas

### 4. Empresa não encontrada
**Sintoma:** Logs mostram `❌ Empresa não encontrada`
**Solução:** Verifique se o `externalReference` na criação do pagamento corresponde ao ID da empresa no banco

## Código do Webhook

O webhook está em: `api/webhooks/asaas.js`

**Eventos tratados:**
- `PAYMENT_RECEIVED` → Ativa premium imediatamente
- `PAYMENT_CONFIRMED` → Ativa premium (backup)
- `SUBSCRIPTION_CREATED` → Ativa premium
- `SUBSCRIPTION_UPDATED` → Atualiza data de expiração
- `PAYMENT_OVERDUE` → Desativa premium
- `PAYMENT_DELETED` → Desativa premium
- `SUBSCRIPTION_DELETED` → Desativa premium

## Monitoramento

Para monitorar webhooks em tempo real:

1. **Vercel Logs:** Acesse os logs em tempo real
2. **Asaas Dashboard:** Verifique os webhooks enviados em Configurações → API → Webhooks
3. **Supabase Logs:** Verifique as mudanças na tabela `empresas`

## Próximos Passos

1. ✅ Configure as variáveis de ambiente no Vercel
2. ✅ Verifique a URL do webhook no Asaas
3. ✅ Teste com um pagamento novo
4. ✅ Monitore os logs em tempo real
5. ✅ Documente qualquer erro encontrado

## Suporte

Se o problema persistir:
- Envie os logs do Vercel
- Envie os logs do Asaas (webhook delivery)
- Verifique se as variáveis de ambiente estão corretas
