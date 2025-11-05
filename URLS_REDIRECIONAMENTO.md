# 🔗 URLs de Redirecionamento - Configuração Completa

## 📋 URLs para Adicionar no Supabase

### Para Desenvolvimento (Local)
Adicione estas URLs na seção **Redirect URLs** do Supabase:
```
http://localhost:8080/confirmar-email
http://localhost:8080/reset-password
http://localhost:8080/assinatura-sucesso
http://localhost:8080/login
```

### Para Produção
Adicione também estas URLs do seu domínio real:
```
https://app.ateliepro.online/confirmar-email
https://app.ateliepro.online/reset-password
https://app.ateliepro.online/assinatura-sucesso
https://app.ateliepro.online/login
```

### Exemplo Completo (Localhost + Produção)
Adicione todas estas URLs de uma vez no Supabase:
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

---

## 📝 Como Adicionar no Supabase

1. Acesse: https://supabase.com/dashboard → seu projeto
2. Vá em **Authentication** → **URL Configuration**
3. Na seção **Redirect URLs**, você verá um campo de texto
4. Cole todas as URLs (uma por linha, como mostrado acima)
5. Clique em **Save**

### Dica 💡
- O Supabase aceita múltiplas URLs
- Você pode adicionar localhost e produção ao mesmo tempo
- Não precisa escolher entre um ou outro

---

## 🔄 Configuração por Ambiente

### Opção 1: Adicionar Tudo de Uma Vez (Recomendado)
Adicione todas as URLs (localhost + produção) e o Supabase vai usar a correta automaticamente.

### Opção 2: Configurar Separadamente
Se preferir, você pode configurar:
- **Site URL**: `http://localhost:8080` (desenvolvimento) ou `https://app.ateliepro.online` (produção)
- **Redirect URLs**: Adicione todas as URLs de ambos os ambientes

---

## ⚠️ Importante

- **Desenvolvimento**: Use `http://localhost:8080` (ou a porta que você usa)
- **Produção**: Use `https://` (com SSL)
- **Wildcards**: Não são permitidos, precisa adicionar cada URL específica
- **Portas**: Se usar outra porta no desenvolvimento (ex: 3000, 5173), ajuste as URLs

---

## 🧪 Teste

Após adicionar as URLs:
1. Tente fazer um cadastro em localhost
2. Verifique se o link de confirmação funciona
3. Quando publicar, teste novamente na URL de produção

---

## 📞 Domínio Ainda Não Definido?

Se você ainda não tem o domínio de produção definido:
1. **Por enquanto**: Adicione apenas as URLs de localhost
2. **Depois**: Quando publicar, volte e adicione as URLs de produção

O Supabase permite adicionar/remover URLs a qualquer momento!

