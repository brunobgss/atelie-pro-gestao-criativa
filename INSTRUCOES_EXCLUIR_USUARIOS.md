# 🗑️ Instruções: Excluir Usuários de Teste

## ⚠️ ATENÇÃO: Cuidados Antes de Excluir

### O que acontece quando você exclui:

1. **Excluir pela tabela `empresas`**:
   - ✅ **Vantagem**: Exclui automaticamente tudo relacionado (clientes, pedidos, orçamentos) por causa de `ON DELETE CASCADE`
   - ✅ Mais seguro - uma única operação
   - ⚠️ **CUIDADO**: Se excluir a empresa errada, perde tudo!

2. **Excluir pela interface do Supabase**:
   - ✅ Visual e fácil
   - ⚠️ **CUIDADO**: Pode não excluir dados relacionados automaticamente
   - ⚠️ **CUIDADO**: Pode deixar dados órfãos

---

## ✅ Recomendação: Usar Script SQL

### Passo 1: Verificar o que será excluído

Execute no Supabase SQL Editor:
```
excluir-usuarios-teste-seguro.sql
```

**Execute APENAS as queries de verificação** (as primeiras 2 queries). Isso mostra:
- Quais usuários serão excluídos
- Quantos dados serão excluídos
- O que cada usuário tem (clientes, pedidos, etc.)

### Passo 2: Revisar e confirmar

Confirme que está tudo certo antes de excluir.

### Passo 3: Excluir

Descomente as queries de exclusão no script e execute.

---

## 🔧 Exclusão Manual pela Interface (Alternativa)

Se preferir excluir pela interface:

### Opção 1: Excluir pela tabela `empresas` (Recomendado)

1. Vá em **Table Editor** → **empresas**
2. Busque pelos emails de teste ou nomes com "Bruno"
3. Selecione as linhas (checkbox)
4. Clique em **"Delete X rows"**
5. Confirme

**Vantagem**: Exclui automaticamente tudo relacionado (cascade)

### Opção 2: Excluir pela tabela `auth.users` (Mais Complexo)

1. Vá em **Authentication** → **Users**
2. Busque pelos emails
3. Exclua manualmente

**Desvantagem**: Pode deixar dados órfãos na tabela `empresas`

---

## 📋 Lista de Usuários de Teste Identificados

- brunobgs1888@gmail.com
- brunobgstp01@gmail.com
- brunopix29@gmail.com
- bgsoftwares1@gmail.com
- ateliepro751@gmail.com
- brunobgs2004@gmail.com
- brunobgstp@gmail.com

**E também**: Qualquer empresa com "Bruno", "teste" ou "test" no nome

---

## ⚠️ CUIDADOS IMPORTANTES

1. **Backup**: Considere fazer backup antes de excluir
2. **Verifique 2x**: Confirme que são realmente contas de teste
3. **Premium users**: Se algum desses for premium (pago), NÃO exclua!
4. **Dados importantes**: Se houver dados importantes misturados, extraia antes

---

## ✅ Após Excluir

Execute a query de verificação final no script para confirmar que:
- Usuários de teste foram removidos
- Usuários reais ainda estão lá
- Dados relacionados foram limpos

---

## 🎯 Recomendação Final

**Use o script SQL** (`excluir-usuarios-teste-seguro.sql`) porque:
- ✅ Mais seguro
- ✅ Mostra o que será excluído antes
- ✅ Exclui tudo de uma vez (cascade)
- ✅ Menos chance de erro

**NÃO exclua pela interface** se não tiver certeza absoluta do que está fazendo!

