# 🔧 CONFIGURAÇÃO ASAAS - ATELIÊ PRO

## 📋 Configuração Necessária

Para integrar o sistema de assinaturas com o ASAAS, você precisa configurar as seguintes variáveis de ambiente:

### 1. Criar arquivo `.env.local` na raiz do projeto:

```bash
# ASAAS API Configuration
VITE_ASAAS_API_URL=https://sandbox.asaas.com/api/v3
VITE_ASAAS_API_KEY=your_asaas_api_key_here

# Para produção, use:
# VITE_ASAAS_API_URL=https://www.asaas.com/api/v3
# VITE_ASAAS_API_KEY=your_production_api_key_here
```

### 2. Obter credenciais do ASAAS:

1. **Acesse**: https://www.asaas.com/
2. **Crie uma conta** ou faça login
3. **Vá em**: Configurações > API
4. **Copie sua API Key**
5. **Cole no arquivo** `.env.local`

### 3. Configurar Webhooks (Opcional):

Para receber notificações de pagamento em tempo real:

1. **No painel ASAAS**: Configurações > Webhooks
2. **URL do Webhook**: `https://seu-dominio.com/api/webhooks/asaas`
3. **Eventos**: Payment, Subscription

## 🚀 Planos Configurados

### Plano Mensal - R$ 39,00
- **Ciclo**: Mensal
- **Valor**: R$ 39,00
- **Formas de Pagamento**: Cartão de Crédito, PIX, Boleto

### Plano Anual - R$ 390,00
- **Ciclo**: Anual  
- **Valor**: R$ 390,00 (2 meses grátis)
- **Formas de Pagamento**: Cartão de Crédito, PIX, Boleto

## 📱 Funcionalidades Implementadas

✅ **Banner de Trial**: Contagem regressiva de 7 dias  
✅ **Página de Assinatura**: Planos mensal e anual  
✅ **Integração ASAAS**: Criação de clientes e assinaturas  
✅ **Checkout Seguro**: Redirecionamento para ASAAS  
✅ **Menu de Assinatura**: Acesso fácil no sidebar  

## 🔄 Fluxo de Assinatura

1. **Usuário acessa** `/assinatura`
2. **Escolhe um plano** (Mensal ou Anual)
3. **Clica em "Assinar Agora"**
4. **Sistema cria cliente** no ASAAS
5. **Cria assinatura** recorrente
6. **Redireciona para checkout** ASAAS
7. **Usuário paga** no ASAAS
8. **ASAAS notifica** o sistema (via webhook)

## 🛠️ Desenvolvimento

### Testando Localmente:

1. **Configure o ASAAS** em modo sandbox
2. **Use cartões de teste**:
   - **Visa**: 4000000000000002
   - **Mastercard**: 5555666677778884
   - **CVV**: 123
   - **Data**: Qualquer data futura

### Produção:

1. **Configure ASAAS** em modo produção
2. **Configure webhooks** para notificações
3. **Teste com valores reais** baixos
4. **Monitore logs** de pagamento

## 📞 Suporte

- **ASAAS**: https://docs.asaas.com/
- **Documentação**: https://docs.asaas.com/reference
- **Suporte**: suporte@asaas.com

---

**⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` com suas credenciais reais!


