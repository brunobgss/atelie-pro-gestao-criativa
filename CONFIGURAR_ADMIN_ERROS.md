# 🔒 Configuração de Acesso Admin - Monitoramento de Erros

## ✅ **Proteção Implementada:**

A página de **Monitoramento de Erros** (`/admin/erros`) agora está protegida:

1. ✅ **Ocultada do menu** para usuários não admin
2. ✅ **Redirecionamento automático** se tentar acessar diretamente
3. ✅ **Verificação por email** do usuário

---

## 🔧 **Como Configurar:**

### **1. Criar arquivo `.env` (se não existir)**

Na raiz do projeto, crie ou edite o arquivo `.env`:

```env
# Lista de emails que podem acessar a página de monitoramento de erros
# Separe múltiplos emails por vírgula (sem espaços)
VITE_ADMIN_EMAILS=seu-email@example.com,outro-email@example.com
```

### **2. Exemplo:**

```env
# Apenas seu email pode acessar
VITE_ADMIN_EMAILS=brunobgs1888@gmail.com

# Ou múltiplos emails
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com,brunobgs1888@gmail.com
```

### **3. Reiniciar o servidor**

Após configurar, reinicie o servidor:

```bash
npm run dev
```

---

## 🔍 **Como Funciona:**

1. **Menu Lateral:**
   - Se o email do usuário estiver na lista `VITE_ADMIN_EMAILS` → Mostra o item "Monitoramento de Erros"
   - Se não estiver → Item oculto do menu

2. **Acesso Direto:**
   - Se tentar acessar `/admin/erros` diretamente:
     - Se for admin → Mostra a página
     - Se não for → Redireciona para `/` (dashboard)

---

## ⚠️ **Importante:**

- **Por padrão** (sem configurar), **NINGUÉM** pode ver a página
- Você **precisa** configurar o `.env` com seu email
- O email deve ser **exatamente** igual ao email do usuário logado

---

## 📝 **Exemplo Completo:**

1. Seu email no sistema: `brunobgs1888@gmail.com`
2. Configure no `.env`:
   ```env
   VITE_ADMIN_EMAILS=brunobgs1888@gmail.com
   ```
3. Reinicie o servidor
4. Faça login com esse email
5. Agora você verá "Monitoramento de Erros" no menu

---

## 🔒 **Segurança:**

- ✅ Verificação no frontend (oculta do menu)
- ✅ Verificação na página (redireciona se não for admin)
- ⚠️ Para produção, considere adicionar verificação no backend também

---

**Pronto!** 🎉 Agora a página só aparece para você (ou emails que você configurar).

