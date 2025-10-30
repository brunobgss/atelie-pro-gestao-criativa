# 🧪 Como Testar Recuperação de Senha

## ✅ Você já testou com sucesso!

1. ✅ Botão "Esqueci minha senha" na tela de login
2. ✅ Modal de recuperação funcionando
3. ✅ Email enviado e recebido
4. ⏳ Agora vamos testar o reset da senha

---

## 🎯 Próximo teste: Reset da senha

### Passo 1: Verificar o link no email

O link no email deve ser algo como:
```
http://localhost:8080/reset-password#type=recovery&token=ABC123...
```

**Formato esperado:** `#type=recovery&token=...`

---

### Passo 2: Verificar configuração no Supabase

O Supabase precisa saber para onde redirecionar APÓS o reset!

1. Acesse: **https://supabase.com/dashboard**
2. Vá em: **Authentication** → **URL Configuration**
3. Encontre: **Redirect URLs**
4. Verifique se está configurado:

**Para desenvolvimento local:**
```
http://localhost:8080/reset-password
http://localhost:8080/*
```

**Para produção:**
```
https://app.ateliepro.online/reset-password
https://app.ateliepro.online/*
```

---

### Passo 3: Testar o fluxo

1. **Clique no link do email** que você recebeu
2. **Deve abrir:** `localhost:8080/reset-password#type=recovery&token=...`
3. **Digite uma nova senha** (mínimo 6 caracteres)
4. **Confirme a senha**
5. **Clique em:** "Redefinir Senha"
6. **Aguarde** mensagem de sucesso
7. **Redireciona** para /login
8. **Faça login** com a nova senha

---

## 🔧 Se ainda não funcionar

### Problema 1: Vai para /login imediatamente

**Sintoma:** Ao clicar no link, já vai para login

**Causa:** Configuração de redirect no Supabase

**Solução:**
1. Vá em Supabase → Authentication → URL Configuration
2. Adicione: `http://localhost:8080/reset-password` nas redirect URLs
3. Salve
4. Solicite novo email

---

### Problema 2: Erro ao redefinir senha

**Sintoma:** Erro ao clicar em "Redefinir Senha"

**Verifique:**
- ✅ Senhas coincidem?
- ✅ Mínimo 6 caracteres?
- ✅ Token ainda válido? (links expiram após algumas horas)

**Teste:**
- Solicite novo email de recuperação
- Tente novamente

---

### Problema 3: Nada acontece ao clicar no link

**Sintoma:** Email clicado, mas não abre nada

**Solução:**
1. Copie o link do email manualmente
2. Cole no navegador
3. Verifique se tem `#type=recovery&token=...`

---

## ✅ Checklist de teste completo

- [ ] Email recebido ✅ (você já fez!)
- [ ] Link no email tem formato correto
- [ ] Clique no link abre página de reset
- [ ] URL contém `#type=recovery&token=...`
- [ ] Formulário aparece corretamente
- [ ] Validação de senhas funciona
- [ ] Erro se senhas não coincidem
- [ ] Erro se menos de 6 caracteres
- [ ] Sucesso ao redefinir
- [ ] Redireciona para login
- [ ] Login funciona com nova senha

---

## 📝 Debug: Ver URL no console

Abra o console do navegador (F12) e verifique:

```javascript
// Deve aparecer algo como:
📍 Reset password URL: /reset-password#type=recovery&token=ABC123...
```

Se aparecer:
```
📍 Reset password URL: /reset-password#
```

O token não está na URL = link inválido ou expirado.

---

## 🎯 Teste rápido

1. Solicite outro email de recuperação
2. Clique no link
3. Verifique a URL no navegador
4. Tente resetar a senha
5. Me diga o que aconteceu!

---

**Status atual:** Funcionando até o envio de email ✅  
**Próximo:** Testar reset da senha ⏳

