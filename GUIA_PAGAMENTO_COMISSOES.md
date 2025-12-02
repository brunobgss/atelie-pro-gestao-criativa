# 💰 GUIA: COMO PAGAR COMISSÕES DE AFILIADOS

## 📋 **SISTEMA IMPLEMENTADO**

### **1. Página Admin de Comissões**
- **Rota:** `/admin/comissoes`
- **Acesso:** Apenas para emails configurados como admin
- **Funcionalidades:**
  - Ver todas as comissões (pendentes e pagas)
  - Filtrar por status, tipo, afiliado
  - Marcar comissões como pagas
  - Exportar relatório CSV
  - Ver estatísticas (pendentes, pagas, recorrentes)

---

## 🔧 **COMO CONFIGURAR**

### **1. Configurar Email Admin**

No arquivo `.env.local` ou nas variáveis de ambiente do Vercel:

```env
VITE_ADMIN_EMAILS=seu-email@example.com
```

Para múltiplos admins:
```env
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### **2. Executar SQL no Supabase**

Execute os seguintes scripts na ordem:

1. **`supabase/whatsapp-templates.sql`** - Cria tabela de templates WhatsApp
2. **`supabase/admin-commissions-rls.sql`** (opcional) - Função para admins verem todas as comissões

---

## 💳 **COMO PAGAR COMISSÕES**

### **Processo Manual (Recomendado para começar):**

1. **Acesse a página admin:**
   - Faça login com email admin
   - Vá em "Gerenciar Comissões" no menu lateral

2. **Veja comissões pendentes:**
   - Filtre por status "Pendente"
   - Veja o total a pagar no card de estatísticas

3. **Pague manualmente:**
   - PIX, transferência bancária, etc.
   - Anote quais comissões foram pagas

4. **Marque como pago:**
   - Clique em "Marcar como Pago" na comissão
   - Confirme no diálogo
   - A comissão será atualizada automaticamente

5. **Exporte relatório (opcional):**
   - Clique em "Exportar CSV"
   - Use para controle financeiro/contabilidade

---

## 📊 **ESTRUTURA DE COMISSÕES**

### **Tipos de Comissão:**

1. **Comissão Única:**
   - Paga uma vez quando indicação converte
   - Status: `pending` → `paid`
   - Exemplo: R$ 3,90 (10% de R$ 39)

2. **Comissão Recorrente:**
   - Paga mensalmente enquanto indicado permanece premium
   - Status: `pending` → `paid` (renovado mensalmente)
   - Exemplo: R$ 3,90/mês (10% de R$ 39/mês)

### **Status das Comissões:**

- **`pending`**: Aguardando pagamento
- **`paid`**: Paga
- **`cancelled`**: Cancelada

---

## 🔄 **PROCESSO RECORRENTE**

### **Comissões Recorrentes:**

As comissões recorrentes precisam ser pagas mensalmente. Você pode:

1. **Processo Manual:**
   - Acesse `/admin/comissoes` todo mês
   - Filtre por tipo "Recorrente" e status "Pendente"
   - Marque como pago após pagar

2. **Automatizar (Futuro):**
   - Criar cron job que gera comissões recorrentes mensalmente
   - Integrar com API de PIX para pagamento automático

---

## 📈 **ESTATÍSTICAS DISPONÍVEIS**

Na página admin você vê:

- **Pendentes:** Quantidade e valor total
- **Pagas:** Quantidade e valor total
- **Recorrentes Ativas:** Quantidade e valor mensal
- **Total:** Soma de todas as comissões

---

## ⚠️ **IMPORTANTE**

1. **RLS (Row Level Security):**
   - Por padrão, usuários só veem suas próprias comissões
   - A página admin precisa de permissão especial
   - Se não conseguir ver todas as comissões, execute `supabase/admin-commissions-rls.sql`

2. **Service Role Key:**
   - Para ver todas as comissões, você pode precisar usar service role key
   - Ou ajustar políticas RLS para permitir admins

3. **Backup:**
   - Sempre exporte relatórios antes de fazer mudanças em massa
   - Mantenha controle financeiro separado

---

## 🚀 **PRÓXIMOS PASSOS (Opcional)**

1. **Automatizar Pagamentos:**
   - Integrar com API de PIX (ASAAS, Gerencianet)
   - Pagamento automático quando atinge valor mínimo

2. **Notificações:**
   - Email quando comissão é criada
   - Email quando comissão é paga

3. **Dashboard de Afiliados:**
   - Página para afiliados verem suas comissões
   - Histórico de pagamentos
   - Solicitar saque

---

## ✅ **PRONTO PARA USO!**

O sistema está implementado e pronto para gerenciar pagamentos de comissões!

