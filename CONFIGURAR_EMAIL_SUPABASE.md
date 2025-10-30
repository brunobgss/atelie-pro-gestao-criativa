# 📧 Configurar Email no Supabase para Recuperação de Senha

## ✅ O que já foi implementado

1. ✅ Botão "Esqueci minha senha" na tela de login
2. ✅ Modal de recuperação de senha
3. ✅ Página de reset de senha (`/reset-password`)
4. ✅ Integração com Supabase Auth
5. ✅ Fluxo completo de recuperação

## ⚙️ Próximo passo: Configurar SMTP no Supabase

Para que os emails de recuperação funcionem, você precisa configurar o SMTP no painel do Supabase.

### ✅ Opção 1: Usar Email Hostinger (Você já tem!)

Seu email: `suporte@ateliepro.online` na Hostinger

**👉 CONFIGURAÇÃO RÁPIDA - Veja: `CONFIGURAR_HOSTINGER_SMTP.md`**

Configuração resumida:
```
Host: smtp.hostinger.com
Porta: 587
Usuário: suporte@ateliepro.online
Senha: [senha do email]
```

### Opção 2: Usar Email SMTP Genérico

1. **Acesse o painel do Supabase:**
   - Vá em: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Configure o SMTP:**
   - Vá em: **Authentication** → **Email Templates**
   - Role até **"SMTP Settings"**
   - Clique em **"Configure SMTP Provider"**

3. **Configure com seu provedor de email:**

   Para usar `suporte@ateliepro.online`, você precisa configurar:

   **Opção A - Google Workspace (Gmail):**
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: suporte@ateliepro.online
   Password: [senha do app do Gmail]
   From Email: suporte@ateliepro.online
   From Name: Ateliê Pro Suporte
   ```

   **Opção B - SendGrid (Recomendado para produção):**
   - Crie conta em: https://sendgrid.com
   - Configure domínio ateliepro.online
   - Use as credenciais da API

   **Opção C - Mailgun:**
   - Crie conta em: https://www.mailgun.com
   - Configure domínio ateliepro.online
   - Use credenciais SMTP

4. **Salve as configurações**

5. **Teste o envio:**
   - Vá em **Authentication** → **Email Templates**
   - Clique em "Test Email" para verificar

### Opção 2: Testar localmente com Mailtrap

Para testar localmente SEM configurar SMTP real:

1. **Crie conta no Mailtrap:** https://mailtrap.io (gratuito)

2. **Configure no Supabase:**
   ```
   Host: smtp.mailtrap.io
   Port: 2525
   Username: [do mailtrap]
   Password: [do mailtrap]
   From Email: suporte@ateliepro.online
   From Name: Ateliê Pro Suporte
   ```

3. **Todos os emails vão para o Mailtrap** - perfeito para testes!

### 🧪 Como testar

1. Inicie o servidor local:
   ```bash
   npm run dev
   ```

2. Acesse: http://localhost:5173/login

3. Clique em "Esqueci minha senha"

4. Digite um email válido da sua conta

5. Verifique:
   - Se usar Mailtrap: vá em https://mailtrap.io/inboxes
   - Se usar SMTP real: verifique a caixa de entrada

6. Clique no link do email

7. Redefina a senha na página `/reset-password`

8. Faça login com a nova senha

## 📝 Email Templates no Supabase

Você pode personalizar os templates dos emails:

**Localização:** Authentication → Email Templates

**Templates disponíveis:**
- ✅ Reset Password (já implementado)
- ✅ Email Confirmation (pode ativar depois)
- ✅ Magic Link (opcional)
- ✅ Email Change Confirmation (opcional)

## 🚀 Próximos passos

1. ✅ Configurar SMTP
2. ✅ Testar recuperação localmente
3. ✅ Fazer deploy para produção
4. ⏳ Configurar confirmação de email (depois)

## 📧 Verificar configuração de email

Para saber qual domínio de email está configurado:

```bash
# Acesse: https://supabase.com/dashboard/project/[seu-project-id]/auth/emails
```

## ⚠️ Importante

- O email `suporte@ateliepro.online` deve estar configurado no seu provedor
- Se usar Gmail, precisa habilitar "App Passwords"
- Para produção, use SendGrid ou similar
- Não use o SMTP padrão do Supabase em produção

