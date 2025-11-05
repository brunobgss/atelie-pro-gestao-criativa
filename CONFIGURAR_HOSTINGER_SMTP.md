# 📧 Configurar Hostinger SMTP no Supabase

## 🎯 Email: suporte@ateliepro.online

---

## 📋 Credenciais SMTP da Hostinger

Use estas configurações no Supabase:

```
Host SMTP:     smtp.hostinger.com
Porta SMTP:    587 (recomendado) ou 465
Usuário SMTP:  suporte@ateliepro.online
Senha SMTP:    [senha do email da Hostinger]
From Email:    suporte@ateliepro.online
From Name:     Ateliê Pro Suporte
```

---

## 🚀 Passo a passo: Configurar no Supabase

### 1️⃣ Acesse o painel do Supabase

- Vá para: https://supabase.com/dashboard
- Selecione seu projeto: `atelie-pro`

### 2️⃣ Navegue até SMTP Settings

1. Menu lateral → **Authentication**
2. Clique em **Email Templates**
3. Vá em **SMTP Settings** (botão no topo)
4. Ou acesse diretamente:
   ```
   https://supabase.com/dashboard/project/[seu-project-id]/auth/email-templates
   ```

### 3️⃣ Ative e configure SMTP

1. Ative **"Enable custom SMTP"**

2. Preencha os campos:

   ```
   Email sender:              suporte@ateliepro.online
   Sender name:               Ateliê Pro Suporte
   Host:                      smtp.hostinger.com
   Port:                      587
   Username:                  suporte@ateliepro.online
   Password:                  [sua senha do email]
   ```

3. **IMPORTANTE:**
   - ✅ Desmarque "Use SSL/TLS" se estiver marcado
   - ✅ Marque "Use STARTTLS" (se disponível)
   - Se não funcionar com porta 587, tente porta 465 com SSL

4. Clique em **"Save"**

### 4️⃣ Teste a configuração

1. Vá em **Authentication** → **Users**
2. Clique em **"Invite user"**
3. Digite um email de teste
4. Envie o convite
5. Verifique se o email chegou

---

## 🧪 Testar recuperação de senha

1. Acesse: http://localhost:8080/login
2. Clique em "Esqueci minha senha"
3. Digite seu email: `suporte@ateliepro.online`
4. Clique em "Enviar Email"
5. Verifique a caixa de entrada
6. Clique no link
7. Redefina a senha

---

## ⚠️ Troubleshooting

### Email não chega?

**Problema 1: Timeout**
- Verifique se a porta está correta (587 ou 465)
- Teste alternando entre SSL/TLS e STARTTLS

**Problema 2: Erro de autenticação**
- Verifique se a senha está correta
- Use a senha completa do email (não admin)

**Problema 3: Emails vão para spam**
- Configure SPF no DNS do domínio
- Configure DKIM no DNS do domínio
- Configure DMARC no DNS do domínio

### Configurações DNS recomendadas (Hostinger)

Acesse painel da Hostinger → Domínios → DNS

**1. Registro SPF:**
```
Tipo: TXT
Nome: @
Valor: v=spf1 include:_spf.mx.cloudflare.net include:smtp.hostinger.com ~all
TTL: 3600
```

**2. Registro DKIM:**
```
Tipo: TXT
Nome: default._domainkey
Valor: [Hostinger deve ter no painel de email]
TTL: 3600
```

**3. Registro DMARC (opcional):**
```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:suporte@ateliepro.online
TTL: 3600
```

---

## 🔍 Verificar configuração

### Teste rápido no navegador:

Depois de configurar, clique no botão de teste no Supabase:

```
Authentication → Email Templates → "Send test email"
```

Ou teste via API:

```bash
curl -X POST \
  'https://api.supabase.com/v1/projects/[project-id]/auth/recover' \
  -H 'apikey: [your-api-key]' \
  -H 'Content-Type: application/json' \
  -d '{"email": "seu-email@teste.com"}'
```

---

## 📊 Configuração alternativa: Porta 465

Se a porta 587 não funcionar, use:

```
Host:      smtp.hostinger.com
Port:      465
SSL/TLS:   ✅ Sim (marcado)
STARTTLS:  ❌ Não (desmarcado)
```

---

## 🎯 Checklist final

- [ ] Hostinger email criado: `suporte@ateliepro.online`
- [ ] Senha do email anotada
- [ ] Supabase → Authentication → SMTP Settings acessado
- [ ] Custom SMTP habilitado
- [ ] Todas as credenciais preenchidas
- [ ] Teste de email enviado
- [ ] Email recebido na caixa de entrada
- [ ] Recuperação de senha testada localmente
- [ ] DNS (SPF/DKIM) configurado (opcional, mas recomendado)

---

## 💡 Dica extra

**Para produção, considere:**

1. **SendGrid** (recomendado): Melhor deliverabilidade
2. **Mailgun**: Boa integração
3. **Amazon SES**: Mais barato em escala

Mas para agora, **Hostinger funciona perfeitamente!** ✅

---

## 📞 Precisa de ajuda?

Se não funcionar:
1. Verifique senha do email na Hostinger
2. Teste com porta 465 (SSL)
3. Verifique logs do Supabase
4. Consulte: https://support.hostinger.com/pt/articles/4305847

---

**Próximo passo:** Configure e teste! 🚀


