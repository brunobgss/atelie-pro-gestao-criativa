# 🔧 Configurar Variáveis do Tawk.to

## ✅ SEUS IDs DO TAWK.TO:

```
Property ID: 692e37b24c7529197e44473d
Widget ID: 1jbe8j4jh
```

---

## 🚀 COMO CONFIGURAR NO VERCEL:

### Passo 1: Acessar Vercel Dashboard
1. Acesse: https://vercel.com/dashboard
2. Faça login na sua conta
3. Encontre o projeto **"atelie-pro-gestao-criativa"** (ou o nome do seu projeto)

### Passo 2: Adicionar Variáveis de Ambiente
1. Clique no projeto
2. Vá em **Settings** (Configurações)
3. No menu lateral, clique em **Environment Variables** (Variáveis de Ambiente)
4. Clique em **Add New** (Adicionar Nova)

### Passo 3: Adicionar as 3 Variáveis

**Variável 1:**
- **Key (Nome):** `VITE_CHAT_PROVIDER`
- **Value (Valor):** `tawk`
- **Environment:** Selecione todas (Production, Preview, Development)
- Clique em **Save**

**Variável 2:**
- **Key (Nome):** `VITE_TAWK_PROPERTY_ID`
- **Value (Valor):** `692e37b24c7529197e44473d`
- **Environment:** Selecione todas (Production, Preview, Development)
- Clique em **Save**

**Variável 3:**
- **Key (Nome):** `VITE_TAWK_WIDGET_ID`
- **Value (Valor):** `1jbe8j4jh`
- **Environment:** Selecione todas (Production, Preview, Development)
- Clique em **Save**

### Passo 4: Fazer Redeploy
1. Após adicionar as variáveis, vá em **Deployments**
2. Clique nos 3 pontinhos (⋯) do último deploy
3. Clique em **Redeploy**
4. Ou faça um novo commit e push (deploy automático)

---

## ✅ VERIFICAR SE FUNCIONOU:

1. Aguarde o deploy terminar (2-3 minutos)
2. Acesse: https://app.ateliepro.online (ou sua URL)
3. Faça login
4. Vá para o Dashboard
5. **O widget do Tawk.to deve aparecer no canto inferior direito!** 💬

---

## 🎯 RESUMO RÁPIDO:

Adicione estas 3 variáveis no Vercel:

```
VITE_CHAT_PROVIDER = tawk
VITE_TAWK_PROPERTY_ID = 692e37b24c7529197e44473d
VITE_TAWK_WIDGET_ID = 1jbe8j4jh
```

Depois faça redeploy e teste!

---

**Pronto!** 🎉 Depois de configurar, me avise se o widget apareceu!

