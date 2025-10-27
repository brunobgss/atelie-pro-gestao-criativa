# Correção do Webhook Asaas

## 🐛 Problema Identificado

O usuário **abraaoelionai032@gmail.com** pagou R$ 39,00 no PIX pelo plano mensal, mas o acesso não foi liberado automaticamente.

### Logs do Asaas mostravam:
- **Status**: 400 Bad Request
- **Erro**: "Dados do webhook inválidos"
- **Evento**: SUBSCRIPTION_CREATED
- **Conteúdo enviado**: Dados completos da assinatura (value: 39, customer, nextDueDate, etc.)

### Causa Raiz:
O webhook estava configurado para aceitar apenas eventos com `payment`, mas o Asaas estava enviando eventos de `subscription` (assinatura) com a estrutura `subscription`.

## ✅ Solução Aplicada

### 1. Validação Corrigida
- Antes: Aceitava apenas `payment`
- Depois: Aceita `payment` OU `subscription`

### 2. Novos Handlers Adicionados
- `SUBSCRIPTION_CREATED`: Ativa premium quando assinatura é criada
- `SUBSCRIPTION_UPDATED`: Atualiza data de expiração
- `SUBSCRIPTION_DELETED`: Desativa premium

### 3. Funções Criadas
- `activatePremiumForSubscription()`: Ativa premium para assinaturas
- `updatePremiumForSubscription()`: Atualiza premium para assinaturas
- Melhor tratamento de erros e logs

### 4. Ajuste para Vercel Serverless
O arquivo foi ajustado para o formato correto de API Routes do Vercel:
```javascript
export async function POST(req) {
  const data = await req.json();
  return Response.json({ ... }, { status: 200 });
}
```

## 📝 Alterações no Código

**Arquivo**: `api/webhooks/asaas.js`

### Principais mudanças:
1. Validação flexível para payment OU subscription
2. Processamento de eventos SUBSCRIPTION_*
3. Busca correta pela empresa usando `externalReference`
4. Cálculo correto da data de expiração usando `nextDueDate`
5. Logs detalhados para debugging

## 🧪 Como Testar

1. No painel do Asaas, vá em **Integrações > Webhooks**
2. Clique em **Reenviar** nos webhooks que falharam
3. Verifique se recebe status 200 OK
4. Confirme que o usuário tem `is_premium: true` no banco

## 📊 Dados do Pagamento

- **Usuário**: abraaoelionai032@gmail.com
- **Empresa**: Ms uniformes Profissionais
- **Valor**: R$ 39,00
- **Plano**: Mensal
- **Próximo vencimento**: 26/12/2025
- **Status**: ✅ Liberado manualmente
- **Acesso**: Premium ativo até 26/11/2025

## ⚠️ Ações Necessárias

1. **Fazer deploy** das alterações no webhook
2. **Reenviar** os webhooks no painel do Asaas
3. **Monitorar** os logs para garantir que está funcionando
4. **Orientar** o usuário a fazer logout e login novamente

## 🔄 Próximos Passos

- Monitorar próximas assinaturas para confirmar que o webhook está funcionando
- Criar dashboard de monitoramento de webhooks
- Implementar retry automático para webhooks falhos

---
**Data**: 27/10/2025
**Status**: ✅ Corrigido e liberado manualmente
