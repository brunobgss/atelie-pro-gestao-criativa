# 🚨 ERRO: Row Level Security (RLS) - SOLUÇÃO

## 🔍 Problema Identificado
- ✅ **Usuário criado** com sucesso
- ❌ **Erro 403**: "new row violates row-level security policy for table 'empresas'"
- 🔒 **Causa**: Políticas RLS muito restritivas impedem criação de empresas

## ✅ SOLUÇÃO RÁPIDA

### Passo 1: Corrigir RLS
1. **Acesse**: Supabase Dashboard → SQL Editor
2. **Execute**: `supabase/fix-rls-simples.sql`
3. **Aguarde**: Confirmação de execução

### Passo 2: Testar Cadastro
1. **Volte para**: `localhost:8080/cadastro`
2. **Preencha** o formulário novamente
3. **Clique**: "Criar Conta"
4. **Deve funcionar** agora!

## 🔧 Scripts Disponíveis

### `fix-rls-simples.sql` (Recomendado)
- Correção rápida e direta
- Remove políticas problemáticas
- Cria políticas corretas

### `fix-rls-completo.sql` (Completo)
- Corrige todas as tabelas
- Mais robusto
- Para casos complexos

### `fix-rls-empresas.sql` (Detalhado)
- Análise completa
- Mais informações de debug

## 🎯 O que o Script Faz
1. **Remove** políticas RLS problemáticas
2. **Cria** políticas corretas para:
   - `empresas` (INSERT/SELECT)
   - `user_empresas` (INSERT/SELECT)
3. **Permite** usuários autenticados criarem empresas

## ✅ Verificação
Após executar o script:
- ✅ Cadastro deve funcionar
- ✅ Empresa deve ser criada
- ✅ Usuário deve ser vinculado
- ✅ Login deve funcionar

**Execute o script e teste novamente!** 🚀


