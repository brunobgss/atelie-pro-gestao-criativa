# 🚀 Passo a Passo: Configurar Email Hostinger no Supabase

## ⏱️ Tempo: 5 minutos

---

## 📋 O que você precisa

- ✅ Email na Hostinger: `suporte@ateliepro.online`
- ✅ Senha desse email
- ✅ Acesso ao painel Supabase

---

## 🎯 Passo 1: Abrir Supabase

1. Acesse: **https://supabase.com/dashboard**
2. Selecione seu projeto: `atelie-pro`
3. Aguarde carregar

---

## 🎯 Passo 2: Ir para SMTP Settings

**Caminho completo:**

```
Menu lateral ESQUERDA:
  👉 Clique em: "Authentication"
  
Menu superior:
  👉 Clique em: "Email Templates"
  
Botão no topo:
  👉 Clique em: "SMTP Settings" (ou "Configure SMTP")
```

**Link direto (troque [project-id]):**
```
https://supabase.com/dashboard/project/[project-id]/auth/email-templates
```

---

## 🎯 Passo 3: Preencher dados

**Ativar:**
- ✅ Marque: **"Enable custom SMTP"** ou **"Use custom SMTP"**

**Preencher campos:**

| Campo | Valor |
|-------|-------|
| **Email sender** | `suporte@ateliepro.online` |
| **Sender name** | `Ateliê Pro Suporte` |
| **Host** | `smtp.hostinger.com` |
| **Port** | `587` |
| **Username** | `suporte@ateliepro.online` |
| **Password** | `[sua senha do email]` |

**Configurações extras (importante!):**
- ⬜ **Use SSL/TLS**: DESMARCADO
- ✅ **Use STARTTLS**: MARCADO (se tiver opção)

---

## 🎯 Passo 4: Salvar

1. Clique no botão: **"Save"** ou **"Save changes"**
2. Aguarde confirmação de sucesso

---

## 🎯 Passo 5: Testar

**Método 1 - Teste rápido:**
1. Na mesma página, procure: **"Send test email"**
2. Digite um email de teste
3. Clique em enviar
4. Verifique se chegou

**Método 2 - Teste no app:**
1. Servidor local rodando: http://localhost:8080
2. Acesse: http://localhost:8080/login
3. Clique: **"Esqueci minha senha"**
4. Digite: `suporte@ateliepro.online`
5. Clique: **"Enviar Email"**
6. Verifique sua caixa de entrada

---

## ❌ Se não funcionar

### Problema: Porta 587 não funciona

**Tente porta 465:**

```
Port:      465
SSL/TLS:   ✅ MARCADO
STARTTLS:  ❌ DESMARCADO
```

### Problema: Erro de autenticação

- Verifique se a senha está correta
- Use a senha COMPLETA do email
- Não use a senha do painel Hostinger

### Problema: Timeout

1. Verifique sua internet
2. Verifique se Hostinger não está bloqueando
3. Tente alternar entre porta 587 e 465

---

## ✅ Checklist rápido

Antes de testar, confirme:

- [ ] Supabase aberto
- [ ] SMTP Settings encontrado
- [ ] Custom SMTP habilitado
- [ ] Todos os campos preenchidos corretamente
- [ ] Salvo com sucesso
- [ ] Email de teste enviado
- [ ] Email recebido

---

## 📸 Visual (o que esperar)

Você vai ver algo assim:

```
┌─────────────────────────────────────────┐
│ Email Templates                        │
├─────────────────────────────────────────┤
│                                         │
│  [ ] Use custom SMTP                   │ ← MARQUE ESSE
│                                         │
│  Email sender: suporte@ateliepro.online│
│  Sender name:  Ateliê Pro Suporte      │
│                                         │
│  Host: smtp.hostinger.com              │
│  Port: 587                             │
│  Username: suporte@ateliepro.online    │
│  Password: *****************           │
│                                         │
│         [Save]                          │ ← CLIQUE AQUI
└─────────────────────────────────────────┘
```

---

## 🎉 Pronto!

Se conseguiu salvar e recebeu o email de teste:

**✅ CONFIGURAÇÃO FUNCIONANDO!**

Agora é só usar normalmente! 🚀

---

## 📞 Precisa de ajuda extra?

Veja arquivo completo: `CONFIGURAR_HOSTINGER_SMTP.md`

