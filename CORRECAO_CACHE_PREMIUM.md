# Correção do Cache Premium

## 🐛 Problema

O usuário **abraaoelionai032@gmail.com** tem premium ativo no banco de dados, mas o frontend ainda mostra como trial expirado devido a cache.

### Dados no Banco de Dados
- ✅ **Empresa**: Ms uniformes Profissionais
- ✅ **is_premium**: true
- ✅ **status**: active
- ✅ **trial_end_date**: 2025-11-26T11:50:10.476+00:00
- ✅ **Válido até**: 26 de novembro de 2025

## 🔧 Soluções Implementadas

### 1. Correção na Validação de Premium
- Arquivo: `src/utils/premiumValidation.ts`
- Corrigido para usar `trial_end_date` como data de expiração do premium
- Adicionada opção de forçar refresh do cache

### 2. Correção no Webhook Asaas
- Arquivo: `api/webhooks/asaas.js`
- Adicionado suporte para eventos `subscription`
- Corrigido para aceitar payment OU subscription

## 📋 Instruções para o Usuário

### 📱 INSTRUÇÕES PARA CELULAR (RECOMENDADO)

#### Opção 1: Limpar Cache pelo App
1. **Feche completamente o app** (não apenas minimize)
2. **Abra o app novamente**
3. **Faça logout e login novamente**

#### Opção 2: Limpar Cache do Navegador no Celular

**Android (Chrome):**
1. Abra o Chrome
2. Toque nos **3 pontos** (⋮) no canto superior direito
3. Vá em **Configurações**
4. Vá em **Privacidade e segurança**
5. Toque em **Limpar dados de navegação**
6. Marque **Imagens e arquivos em cache**
7. Toque em **Limpar dados**
8. Feche e abra o app novamente

**iOS (Safari):**
1. Vá em **Configurações** do iPhone
2. Vá em **Safari**
3. Toque em **Limpar Histórico e Dados do Website**
4. Toque em **Limpar Histórico e Dados**
5. Feche e abra o app novamente

### 💻 INSTRUÇÕES PARA DESKTOP

#### Opção 1: Limpar Cache Manualmente (RECOMENDADO)

1. **Abra o console do navegador** (F12)
2. **Cole e execute** o seguinte código:

```javascript
// Limpar todos os caches
localStorage.clear();
sessionStorage.clear();

// Limpar cache do Supabase
const { createClient } = window.supabase || {};
if (createClient) {
  console.log('✅ Cache do Supabase limpo');
}

// Recarregar página sem cache
window.location.href = '/login';
```

3. **Faça login novamente**

### Opção 2: Forçar Atualização (Windows/Linux)
1. Pressione **Ctrl + Shift + R**
2. Ou **Ctrl + F5**

### Opção 3: Forçar Atualização (Mac)
1. Pressione **Cmd + Shift + R**

### Opção 4: Limpar Cache do Navegador

1. Chrome:
   - Settings > Privacy and Security > Clear browsing data
   - Selecione "Cached images and files"
   - Clique em "Clear data"

2. Firefox:
   - Settings > Privacy & Security
   - Clique em "Clear Data"
   - Selecione "Cached Web Content"

3. Edge:
   - Settings > Privacy, search, and services
   - Clique em "Clear browsing data"
   - Selecione "Cached images and files"

## 🔍 Verificar se Funcionou

Após fazer login novamente, verifique no console:

```javascript
console.log('Empresa:', window.location.pathname);
```

E procure por:
- ✅ `is_premium: true`
- ✅ `status: "active"`
- ✅ `trial_end_date` válido

## 🧪 Teste Adicional

Se ainda não funcionar, execute no console:

```javascript
// Forçar refresh dos dados da empresa
fetch('/api/refresh-empresa').then(r => r.json()).then(console.log);
```

## 📞 Suporte

Se o problema persistir após seguir todas as instruções:
1. Faça uma captura de tela do console do navegador
2. Envie um email com os detalhes

---
**Data**: 27/10/2025
**Status**: Aguardando teste do usuário
