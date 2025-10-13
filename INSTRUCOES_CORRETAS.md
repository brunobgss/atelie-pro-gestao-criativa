# ✅ INSTRUÇÕES CORRETAS

## 🚨 ERRO COMUM
- ❌ **NÃO execute** arquivos `.md` (Markdown) no SQL Editor
- ✅ **Execute APENAS** arquivos `.sql` no SQL Editor

## 🎯 SOLUÇÃO CORRETA

### Passo 1: Abrir o Script SQL Correto
1. **Acesse**: Supabase Dashboard → SQL Editor
2. **Abra**: `supabase/corrigir-rls.sql` (arquivo SQL, não MD)
3. **Execute** o script

### Passo 2: Verificar Execução
- Deve aparecer uma mensagem de sucesso
- Deve mostrar as políticas criadas na tabela

### Passo 3: Testar Cadastro
1. **Volte para**: `localhost:8080/cadastro`
2. **Preencha** o formulário
3. **Clique**: "Criar Conta"
4. **Deve funcionar** agora!

## 📁 Arquivos Disponíveis

### ✅ Execute no SQL Editor:
- `supabase/corrigir-rls.sql` ← **USE ESTE**
- `supabase/fix-rls-simples.sql`
- `supabase/fix-rls-completo.sql`

### ❌ NÃO execute no SQL Editor:
- `CORRECAO_RLS.md` (arquivo de instruções)
- `SOLUCAO_LOGIN.md` (arquivo de instruções)

## 🔧 O que o Script Faz
1. Remove políticas RLS problemáticas
2. Cria políticas corretas para usuários autenticados
3. Permite criação de empresas e vinculação de usuários

**Execute o arquivo `.sql` correto!** 🚀


