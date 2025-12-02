# 💬 Guia de Configuração - Suporte Proativo

**Status:** ✅ Implementado  
**Tempo de configuração:** 10-15 minutos  
**Impacto:** +60% de retenção esperada

---

## 🎯 O QUE FOI IMPLEMENTADO

### ✅ Componente ChatWidget
- **Arquivo:** `src/components/ChatWidget.tsx`
- **Status:** ✅ Criado e integrado no Dashboard
- **Funcionalidades:**
  - Suporte para Tawk.to (gratuito)
  - Suporte para Crisp (gratuito até 2 operadores)
  - Configuração automática de informações do usuário
  - Tags personalizadas (premium/trial, empresa_id)

### ✅ Email de Boas-Vindas Atualizado
- **Arquivo:** `supabase/functions/send-educational-emails/index.ts`
- **Status:** ✅ Atualizado com oferta de suporte
- **Funcionalidades:**
  - Email de boas-vindas (dia 1) inclui seção de suporte
  - Lista todas as formas de contato
  - Convite para usar chat ao vivo
  - Oferta de vídeo chamada gratuita

### ✅ Integração no Dashboard
- **Arquivo:** `src/pages/Dashboard.tsx`
- **Status:** ✅ ChatWidget adicionado
- **Funcionalidades:**
  - Widget carrega automaticamente
  - Aparece no canto inferior direito (ou conforme configuração do provedor)

---

## 🚀 COMO CONFIGURAR

### Opção 1: Tawk.to (Recomendado - Gratuito e Fácil)

#### Passo 1: Criar Conta no Tawk.to
1. Acesse: https://www.tawk.to/
2. Clique em **"Sign Up Free"**
3. Crie sua conta (gratuita para sempre)

#### Passo 2: Criar Widget
1. Após login, você será direcionado para o dashboard
2. Clique em **"Add Chat Widget"**
3. Configure:
   - Nome do widget: "Ateliê Pro - Suporte"
   - Selecione seu site (ou crie um novo)
4. Copie as credenciais:
   - **Property ID** (exemplo: `5f8a1b2c3d4e5f6a7b8c9d0e`)
   - **Widget ID** (exemplo: `1a2b3c4d5e6f7a8b9c0d1e2f`)

#### Passo 3: Configurar no App
1. No Supabase Dashboard, vá em **Settings** > **Edge Functions** > **Environment Variables**
2. Adicione as seguintes variáveis:

```env
VITE_CHAT_PROVIDER=tawk
VITE_TAWK_PROPERTY_ID=seu_property_id_aqui
VITE_TAWK_WIDGET_ID=seu_widget_id_aqui
```

**OU** se estiver usando Vercel/Netlify:
1. Vá em **Settings** > **Environment Variables**
2. Adicione as mesmas variáveis acima

#### Passo 4: Personalizar Widget (Opcional)
1. No Tawk.to Dashboard, vá em **Chat Widget** > **Settings**
2. Personalize:
   - Cores (use as cores do Ateliê Pro: roxo/rosa)
   - Posição do widget
   - Mensagem de boas-vindas
   - Horário de atendimento

#### Passo 5: Configurar Departamentos (Opcional)
1. No Tawk.to, vá em **Administration** > **Departments**
2. Crie departamentos:
   - Suporte Técnico
   - Vendas
   - Financeiro

---

### Opção 2: Crisp (Alternativa - Também Gratuito)

#### Passo 1: Criar Conta no Crisp
1. Acesse: https://crisp.chat/
2. Clique em **"Sign Up Free"**
3. Crie sua conta (gratuita até 2 operadores)

#### Passo 2: Obter Website ID
1. Após login, vá em **Settings** > **Website**
2. Copie o **Website ID** (exemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

#### Passo 3: Configurar no App
1. No Supabase Dashboard, vá em **Settings** > **Edge Functions** > **Environment Variables**
2. Adicione as seguintes variáveis:

```env
VITE_CHAT_PROVIDER=crisp
VITE_CRISP_WEBSITE_ID=seu_website_id_aqui
```

**OU** se estiver usando Vercel/Netlify:
1. Vá em **Settings** > **Environment Variables**
2. Adicione as mesmas variáveis acima

#### Passo 4: Personalizar Crisp (Opcional)
1. No Crisp Dashboard, vá em **Settings** > **Website Settings**
2. Personalize:
   - Cores e tema
   - Mensagem de boas-vindas
   - Horário de atendimento
   - Integrações (WhatsApp, etc.)

---

## 📧 CONFIGURAR EMAIL DE BOAS-VINDAS

O email de boas-vindas já está configurado automaticamente! Ele será enviado no **dia 1** após o cadastro e inclui:

- ✅ Lista de funcionalidades
- ✅ Primeiros passos
- ✅ **Seção destacada de suporte proativo**
- ✅ Todas as formas de contato

**Não precisa fazer nada!** A Edge Function `send-educational-emails` já está configurada.

---

## 🎨 PERSONALIZAÇÃO AVANÇADA

### Adicionar Informações Customizadas no Chat

O ChatWidget já envia automaticamente:
- ✅ Email do usuário
- ✅ Nome do usuário
- ✅ ID da empresa
- ✅ Tags: "premium" ou "trial"

### Exemplo de Mensagem de Boas-Vindas no Chat

Configure no Tawk.to/Crisp uma mensagem como:

```
Olá! 👋

Bem-vindo ao Ateliê Pro! 

Sou [Seu Nome], e estou aqui para ajudar você a ter sucesso com o app.

Como posso ajudar você hoje?
- Configurar seu primeiro pedido
- Entender funcionalidades
- Resolver dúvidas técnicas
- Agendar vídeo chamada gratuita

Estou online agora! 💬
```

---

## 📊 MONITORAMENTO

### Ver Conversas no Tawk.to
1. Acesse: https://dashboard.tawk.to/
2. Vá em **Chats** para ver todas as conversas
3. Configure notificações por email

### Ver Conversas no Crisp
1. Acesse: https://app.crisp.chat/
2. Vá em **Inbox** para ver todas as conversas
3. Configure notificações push

### Métricas Importantes
- **Taxa de resposta:** Quanto mais rápido, melhor
- **Tempo médio de resposta:** Ideal < 5 minutos
- **Satisfação do cliente:** Peça feedback após resolver problemas
- **Conversas por dia:** Acompanhe crescimento

---

## 🎯 BOAS PRÁTICAS

### 1. Resposta Rápida
- **Meta:** Responder em menos de 5 minutos
- Configure notificações no celular
- Use app mobile do Tawk.to/Crisp

### 2. Mensagens Proativas
- Envie mensagem para novos usuários após 1 hora de cadastro
- Ofereça ajuda para usuários inativos
- Parabenize quando usuário completa onboarding

### 3. Vídeo Chamadas
- Ofereça vídeo chamada gratuita para novos usuários
- Use Google Meet, Zoom ou mesmo WhatsApp
- Duração sugerida: 15-30 minutos

### 4. Base de Conhecimento
- Crie artigos/tutoriais no Tawk.to/Crisp
- Responda perguntas frequentes
- Compartilhe links úteis

### 5. Segmentação
- Trate premium diferente de trial
- Ofereça suporte prioritário para premium
- Para trial, foque em conversão

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

### Tawk.to:
- [ ] Conta criada
- [ ] Widget criado
- [ ] Property ID copiado
- [ ] Widget ID copiado
- [ ] Variáveis de ambiente configuradas
- [ ] Widget personalizado (cores, mensagem)
- [ ] Testado no app

### Crisp:
- [ ] Conta criada
- [ ] Website ID copiado
- [ ] Variáveis de ambiente configuradas
- [ ] Widget personalizado
- [ ] Testado no app

### Email:
- [ ] Email de boas-vindas já está funcionando (automático)
- [ ] Verificar se está sendo enviado corretamente

### Testes:
- [ ] Widget aparece no Dashboard
- [ ] Informações do usuário são enviadas corretamente
- [ ] Chat funciona e mensagens são recebidas
- [ ] Email de boas-vindas inclui seção de suporte

---

## 🚨 TROUBLESHOOTING

### Widget não aparece
1. Verifique se as variáveis de ambiente estão configuradas
2. Verifique se o nome está correto: `VITE_CHAT_PROVIDER`, `VITE_TAWK_PROPERTY_ID`, etc.
3. Limpe o cache do navegador
4. Verifique o console do navegador para erros

### Informações do usuário não aparecem
1. Verifique se o usuário está logado
2. Verifique se `empresa` e `user` estão disponíveis no AuthProvider
3. Verifique o console para erros

### Email não está sendo enviado
1. Verifique se a Edge Function `send-educational-emails` está deployada
2. Verifique se o cron job está configurado
3. Verifique logs da Edge Function no Supabase

---

## 📈 RESULTADOS ESPERADOS

### Após 1 Semana:
- ✅ Widget configurado e funcionando
- ✅ Primeiras conversas recebidas
- ✅ Email de boas-vindas sendo enviado

### Após 1 Mês:
- ✅ Taxa de resposta < 5 minutos
- ✅ +30-40% de retenção
- ✅ +20-30% de conversão trial → premium

### Após 3 Meses:
- ✅ +60% de retenção (meta)
- ✅ Base de conhecimento criada
- ✅ Processo de suporte otimizado

---

## 🎉 PRONTO!

Agora você tem suporte proativo configurado! 

**Próximos passos:**
1. Configure o widget (Tawk.to ou Crisp)
2. Teste no app
3. Configure mensagens de boas-vindas
4. Monitore conversas diariamente

**Dúvidas?** Entre em contato ou consulte a documentação do Tawk.to/Crisp.

---

**Última atualização:** 02/12/2025  
**Versão:** 1.0.0

