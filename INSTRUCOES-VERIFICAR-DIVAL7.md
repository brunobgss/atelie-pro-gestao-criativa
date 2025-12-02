# 🔍 Como Verificar e Corrigir Usuário dival7@gmail.com

## ⚠️ IMPORTANTE
**NÃO copie arquivos `.ts` ou `.tsx` no SQL Editor!** 
Apenas arquivos `.sql` devem ser executados no SQL Editor do Supabase.

---

## 📋 Passo 1: Verificar o Usuário

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. **Copie e cole APENAS o conteúdo do arquivo `verificar-dival7-simples.sql`**
5. Clique em **Run** ou pressione `Ctrl+Enter`

Este script vai mostrar:
- Se o usuário existe
- Se tem empresa associada
- Dados da empresa (se houver)

---

## 🔧 Passo 2: Corrigir (se necessário)

Se o passo 1 mostrar que o usuário **NÃO tem empresa associada**:

1. No SQL Editor, crie uma nova query
2. **Copie e cole APENAS o conteúdo do arquivo `CORRIGIR-USUARIO-DIVAL7.sql`**
3. Clique em **Run**

Este script vai:
- Verificar se o usuário existe
- Verificar se já tem empresa associada
- Criar a associação automaticamente (se necessário)
- Mostrar o resultado final

---

## 📝 Arquivos SQL Disponíveis

1. **`verificar-dival7-simples.sql`** - Apenas verifica (não altera nada)
2. **`CORRIGIR-USUARIO-DIVAL7.sql`** - Verifica e corrige automaticamente

---

## ❌ Erro Comum

Se você ver este erro:
```
ERROR: 42601: syntax error at or near "{"
```

Significa que você copiou um arquivo **TypeScript** (`.ts`) em vez de um arquivo **SQL** (`.sql`).

**Solução:** Use apenas os arquivos `.sql` listados acima!

---

## ✅ Após Corrigir

Depois de executar o script de correção, peça para a usuária:
1. Fazer **logout** do sistema
2. Fazer **login** novamente
3. Tentar criar um orçamento ou produto novamente

Se ainda der erro, verifique o console do navegador (F12) para ver a mensagem de erro específica.

