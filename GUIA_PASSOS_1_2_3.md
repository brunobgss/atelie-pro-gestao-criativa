# 🚀 Guia Passo a Passo - Configuração Final

## 📋 Passo 1: Testar o Fluxo de Confirmação de Email

### 1.1 - Configurar URLs no Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**
4. Configure:
   - **Site URL**: `http://localhost:8080` (desenvolvimento) ou `https://app.ateliepro.online` (produção)
   - **Redirect URLs**: Adicione estas URLs (uma por linha):
     ```
     http://localhost:8080/confirmar-email
     http://localhost:8080/reset-password
     http://localhost:8080/assinatura-sucesso
     http://localhost:8080/login
     https://app.ateliepro.online/confirmar-email
     https://app.ateliepro.online/reset-password
     https://app.ateliepro.online/assinatura-sucesso
     https://app.ateliepro.online/login
     ```
5. Clique em **Save**

### 1.2 - Habilitar Confirmação de Email
1. No mesmo painel, vá em **Authentication** → **Settings**
2. Em **Auth Settings**, verifique:
   - ✅ **Enable email confirmations** deve estar marcado
   - ✅ **Enable email change confirmations** (opcional, mas recomendado)

### 1.3 - Testar o Cadastro
1. Abra seu app: `http://localhost:8080/cadastro`
2. Preencha os dados e cadastre uma nova conta
3. **IMPORTANTE**: Verifique seu email (caixa de entrada e spam)
4. Clique no link de confirmação no email
5. Você será redirecionado para `/confirmar-email` e depois para `/login`

### 1.4 - Testar o Reenvio (se necessário)
1. Se não recebeu o email, acesse: `http://localhost:8080/confirmar-email`
2. Digite seu email
3. Clique em "Reenviar Email"
4. Verifique sua caixa de entrada novamente

---

## 📋 Passo 2: Verificar/Criar Tabela Payments

### 2.1 - Abrir SQL Editor no Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**

### 2.2 - Executar o Script
1. Abra o arquivo: `supabase/verificar-criar-payments.sql`
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Verifique se apareceu a mensagem: "Success. No rows returned" ou similar

### 2.3 - Verificar se Funcionou
Execute esta query no SQL Editor para verificar:
```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;
```

Você deve ver as seguintes colunas:
- `id`
- `empresa_id`
- `asaas_subscription_id` ← **IMPORTANTE: Esta coluna deve existir**
- `status`
- `billing_type`
- `value`
- `cycle`
- etc.

### 2.4 - Verificar Políticas RLS
Execute esta query para verificar as políticas de segurança:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'payments';
```

Você deve ver 3 políticas:
- Users can view their own payments
- Users can insert their own payments
- Users can update their own payments

---

## 📋 Passo 3: Configurar URLs de Redirecionamento no Supabase Auth

### 3.1 - Configurar Site URL (se ainda não fez)
1. Acesse: https://supabase.com/dashboard
2. Vá em **Authentication** → **URL Configuration**
3. Configure:
   - **Site URL**: 
     - Desenvolvimento: `http://localhost:8080`
     - Produção: `https://app.ateliepro.online`

### 3.2 - Adicionar Redirect URLs
Na mesma página, adicione estas URLs na seção **Redirect URLs** (localhost + produção):
```
http://localhost:8080/confirmar-email
http://localhost:8080/reset-password
http://localhost:8080/assinatura-sucesso
http://localhost:8080/login
https://app.ateliepro.online/confirmar-email
https://app.ateliepro.online/reset-password
https://app.ateliepro.online/assinatura-sucesso
https://app.ateliepro.online/login
```

### 3.4 - Salvar Configurações
1. Clique em **Save** no final da página
2. Aguarde a confirmação de sucesso

---

## ✅ Verificação Final

### Teste 1: Confirmação de Email
- [ ] Cadastrei uma nova conta
- [ ] Recebi o email de confirmação
- [ ] Cliquei no link e fui redirecionado corretamente
- [ ] Consegui fazer login após confirmar

### Teste 2: Tabela Payments
- [ ] Executei o script SQL
- [ ] A tabela `payments` foi criada
- [ ] A coluna `asaas_subscription_id` existe
- [ ] As políticas RLS foram criadas

### Teste 3: URLs Configuradas
- [ ] Site URL está configurado
- [ ] Redirect URLs foram adicionadas
- [ ] As configurações foram salvas

---

## 🔧 Troubleshooting (Problemas Comuns)

### ❌ Email não está sendo enviado
**Solução:**
1. Verifique se o SMTP está configurado no Supabase
2. Vá em **Settings** → **Auth** → **SMTP Settings**
3. Configure um provedor SMTP (Gmail, SendGrid, etc.) ou use o SMTP padrão do Supabase

### ❌ Erro: "Tabela payments não existe"
**Solução:**
1. Execute novamente o script `supabase/verificar-criar-payments.sql`
2. Verifique se você está no projeto correto no Supabase
3. Verifique se há mensagens de erro no SQL Editor

### ❌ Erro: "Coluna asaas_subscription_id não existe"
**Solução:**
1. Execute esta query para adicionar a coluna:
```sql
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255);
```

### ❌ Link de confirmação não funciona
**Solução:**
1. Verifique se as Redirect URLs estão configuradas corretamente
2. Verifique se o Site URL está correto
3. Teste com um email real (não funciona com emails temporários/fake)

### ❌ Erro ao buscar assinatura ativa
**Solução:**
1. Verifique se a tabela `payments` existe
2. Verifique se há registros na tabela para sua empresa
3. Verifique os logs do console do navegador (F12)

---

## 📞 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do SQL Editor no Supabase
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Consulte a documentação do Supabase: https://supabase.com/docs

---

## 🎉 Pronto!

Após completar todos os passos, suas funcionalidades estarão funcionando:
- ✅ Confirmação de email
- ✅ Cancelamento de conta
- ✅ Trocar de plano
- ✅ Trocar forma de pagamento

