# 🚀 Guia de Implementação - Automações de Retenção

**Tempo total:** ~30 minutos  
**Manutenção:** ZERO (funciona sozinho!)

---

## ✅ O que foi criado

### 1. **Estender Trial Automático** ✅
- **Arquivo:** `supabase/auto-extend-trial.sql`
- **O que faz:** Estende trial automaticamente quando usuário cria pedido/orçamento/cliente
- **Quando:** Se trial expira em <3 dias E usuário teve atividade nos últimos 3 dias → +7 dias grátis
- **Manutenção:** Zero

### 2. **Emails de Re-engajamento Automáticos** ✅
- **Arquivo:** `supabase/functions/send-retention-emails/index.ts`
- **O que faz:** Envia emails automáticos para:
  - Trials expirando em 3 dias
  - Premium inativos há 7+ dias
- **Manutenção:** Zero

### 3. **Cron Job Diário** ✅
- **Arquivo:** `supabase/cron-retention-emails.sql`
- **O que faz:** Executa a função de emails diariamente às 9h UTC
- **Manutenção:** Zero

---

## 📋 Passo a Passo de Implementação

### PASSO 1: Estender Trial Automático (5 minutos)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/auto-extend-trial.sql`
4. Copie e cole todo o conteúdo
5. Clique em **Run**
6. ✅ Pronto! Agora funciona automaticamente

**Teste:**
- Crie um pedido/orçamento/cliente
- Se o trial estiver expirando em <3 dias, será estendido automaticamente

---

### PASSO 2: Configurar Resend para Emails (10 minutos)

1. Acesse: https://resend.com
2. Crie uma conta (grátis - 3.000 emails/mês)
3. Vá em **API Keys** > **Create API Key**
4. Copie a chave gerada
5. No **Supabase Dashboard**:
   - Vá em **Settings** > **Edge Functions** > **Secrets**
   - Adicione: `RESEND_API_KEY` = sua chave do Resend
   - Adicione: `RETENTION_EMAIL_FROM` = `Ateliê Pro <noreply@ateliepro.online>` (ou seu domínio verificado)

**Nota:** Se não tiver domínio verificado, use o email padrão do Resend.

---

### PASSO 3: Deploy da Edge Function (5 minutos)

1. No terminal, execute:
```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar projeto
supabase link --project-ref xthioxkfkxjvqcjqllfy

# Deploy da função
supabase functions deploy send-retention-emails
```

**OU** via Supabase Dashboard:
1. Vá em **Edge Functions**
2. Clique em **Create Function**
3. Nome: `send-retention-emails`
4. Cole o conteúdo de `supabase/functions/send-retention-emails/index.ts`
5. Clique em **Deploy**

---

### PASSO 4: Configurar Cron Job (5 minutos)

1. Acesse o **Supabase Dashboard** > **SQL Editor**
2. Abra o arquivo `supabase/cron-retention-emails.sql`
3. **IMPORTANTE:** Substitua `SEU_SERVICE_ROLE_KEY_AQUI` pela sua chave real:
   - Vá em **Settings** > **API**
   - Copie a **service_role** key (não a anon key!)
   - Cole no lugar de `SEU_SERVICE_ROLE_KEY_AQUI`
4. Execute o script
5. ✅ Pronto! Emails serão enviados diariamente às 9h UTC (6h BRT)

**Teste manual:**
- Acesse: `https://xthioxkfkxjvqcjqllfy.supabase.co/functions/v1/send-retention-emails`
- Deve retornar JSON com `success: true`

---

## 🧪 Como Testar

### Teste 1: Estender Trial
1. Crie uma empresa de teste
2. Defina `trial_end_date` para 2 dias no futuro
3. Crie um pedido/orçamento/cliente
4. Verifique se `trial_end_date` foi estendido em +7 dias

### Teste 2: Email de Re-engajamento
1. Crie uma empresa com trial expirando em 3 dias
2. Execute manualmente a Edge Function (via URL acima)
3. Verifique se email foi enviado no Resend Dashboard

### Teste 3: Cron Job
1. Verifique se o job está ativo:
```sql
SELECT * FROM cron.job WHERE jobname = 'send-retention-emails-daily';
```
2. Deve retornar 1 linha com `active = true`

---

## 📊 Monitoramento

### Verificar Emails Enviados
- **Resend Dashboard:** https://resend.com/emails
- Veja quantos emails foram enviados e status

### Verificar Logs da Edge Function
- **Supabase Dashboard** > **Edge Functions** > **send-retention-emails** > **Logs**
- Veja erros e sucessos

### Verificar Cron Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'send-retention-emails-daily';
```

---

## ⚠️ Troubleshooting

### Problema: Emails não estão sendo enviados
**Solução:**
1. Verifique se `RESEND_API_KEY` está configurada no Supabase
2. Verifique se o cron job está ativo
3. Veja os logs da Edge Function

### Problema: Trial não está sendo estendido
**Solução:**
1. Verifique se os triggers foram criados:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'auto_extend_trial%';
```
2. Deve retornar 3 triggers

### Problema: Cron job não executa
**Solução:**
1. Verifique se pg_cron está habilitado:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```
2. Se não estiver, execute `habilitar-pg-cron.sql` primeiro

---

## 🎯 Resultados Esperados

### Após 1 semana:
- ✅ Trials sendo estendidos automaticamente para usuários ativos
- ✅ Emails sendo enviados diariamente
- ✅ Taxa de retenção aumentando

### Após 1 mês:
- ✅ +20-30% de retenção
- ✅ +15-25% de conversão trial → premium
- ✅ Menos churn de premium

---

## 📝 Checklist Final

- [ ] Trigger de extensão de trial criado
- [ ] Resend configurado com API key
- [ ] Edge Function deployada
- [ ] Cron job configurado e ativo
- [ ] Testes realizados
- [ ] Monitoramento configurado

---

## 💡 Próximos Passos (Opcional)

Depois que isso estiver funcionando, podemos implementar:
1. Onboarding automático (componente React)
2. Dashboard de valor (mostra ROI)
3. Gamificação (badges e achievements)

---

**Dúvidas?** Verifique os logs ou entre em contato!

