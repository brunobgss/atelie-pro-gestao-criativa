# 📋 Guia de Configuração - Próximos Passos

Este guia explica como configurar as funcionalidades recém-implementadas.

## ✅ Passo 1: Testar o Fluxo de Confirmação de Email

### 1.1 - Configurar Email no Supabase
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** > **Email Templates**
4. Configure os templates de email se necessário (geralmente já vem configurado)
5. Vá em **Authentication** > **URL Configuration**
6. Adicione a URL de redirecionamento:
   ```
   http://localhost:8080/confirmar-email
   ```
   (Para produção, adicione também: `https://seudominio.com/confirmar-email`)

### 1.2 - Testar o Cadastro
1. Acesse a página de cadastro: `http://localhost:8080/cadastro`
2. Preencha os dados e cadastre uma nova conta
3. Verifique seu email (caixa de entrada e spam)
4. Clique no link de confirmação no email
5. Você deve ser redirecionado para `/confirmar-email` e depois para `/login`

### 1.3 - Testar o Reenvio
1. Se não recebeu o email, acesse `/confirmar-email`
2. Digite seu email e clique em "Reenviar Email"
3. Verifique sua caixa de entrada novamente

---

## ✅ Passo 2: Verificar/Criar Tabela Payments

### 2.1 - Executar Script SQL
1. Acesse o [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copie e cole o conteúdo do arquivo `supabase/verificar-criar-payments.sql`
3. Clique em **Run** para executar
4. Verifique se a tabela foi criada com sucesso

### 2.2 - Verificar Estrutura
O script irá:
- ✅ Verificar se a tabela `payments` existe
- ✅ Criar a tabela se não existir
- ✅ Adicionar o campo `asaas_subscription_id`
- ✅ Criar índices para performance
- ✅ Configurar RLS (Row Level Security)

### 2.3 - Verificar Dados Existentes
Se você já tem pagamentos no ASAAS, você pode precisar migrar os dados:
```sql
-- Verificar se há dados na tabela asaas_payments que precisam ser migrados
SELECT * FROM public.asaas_payments 
WHERE empresa_id IS NOT NULL 
LIMIT 10;
```

---

## ✅ Passo 3: Configurar URLs de Redirecionamento no Supabase Auth

### 3.1 - Configurar Site URL
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** > **URL Configuration**
4. Configure:
   - **Site URL**: `http://localhost:8080` (desenvolvimento) ou `https://seudominio.com` (produção)
   - **Redirect URLs**: Adicione:
     ```
     http://localhost:8080/confirmar-email
     http://localhost:8080/reset-password
     http://localhost:8080/assinatura-sucesso
     ```

### 3.2 - Configurar Email Templates (Opcional)
1. Vá em **Authentication** > **Email Templates**
2. Personalize os templates se desejar:
   - **Confirm signup**: Template de confirmação de email
   - **Magic Link**: Template de link mágico
   - **Change Email Address**: Template de mudança de email
   - **Reset Password**: Template de recuperação de senha

### 3.3 - Habilitar Confirmação de Email
1. Vá em **Authentication** > **Settings**
2. Em **Auth Settings**, verifique:
   - ✅ **Enable email confirmations**: Deve estar habilitado
   - ✅ **Enable email change confirmations**: Recomendado habilitar

---

## 🧪 Testes Adicionais

### Testar Cancelamento de Conta
1. Acesse `/minha-conta`
2. Clique em "Cancelar Conta"
3. Digite "cancelar" para confirmar
4. Verifique se a empresa foi marcada como deletada no Supabase

### Testar Trocar Plano
1. Acesse `/assinatura` (precisa estar com assinatura ativa)
2. Clique em "Trocar de Plano"
3. Selecione um novo plano
4. Verifique se a atualização foi aplicada no ASAAS

### Testar Trocar Forma de Pagamento
1. Acesse `/assinatura` (precisa estar com assinatura ativa)
2. Clique em "Trocar Forma de Pagamento"
3. Selecione uma nova forma de pagamento
4. Verifique se a atualização foi aplicada no ASAAS

---

## ⚠️ Troubleshooting

### Email não está sendo enviado
- Verifique se o SMTP está configurado no Supabase
- Verifique se a confirmação de email está habilitada
- Verifique a caixa de spam

### Erro ao buscar assinatura
- Verifique se a tabela `payments` existe
- Verifique se o campo `asaas_subscription_id` existe
- Verifique se há uma assinatura ativa no ASAAS

### Erro ao atualizar plano/pagamento
- Verifique se a API Key do ASAAS está configurada
- Verifique se o `subscriptionId` está correto
- Verifique os logs do console do navegador

---

## 📝 Notas Importantes

1. **Desenvolvimento vs Produção**: Certifique-se de configurar as URLs corretas para cada ambiente
2. **RLS Policies**: As políticas de segurança foram criadas automaticamente pelo script SQL
3. **ASAAS Integration**: Certifique-se de que as variáveis de ambiente do ASAAS estão configuradas
4. **Email Confirmation**: Em desenvolvimento, você pode desabilitar a confirmação de email temporariamente para testes mais rápidos

---

## 🔗 Links Úteis

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentação ASAAS API](https://docs.asaas.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [ASAAS Dashboard](https://www.asaas.com/)

