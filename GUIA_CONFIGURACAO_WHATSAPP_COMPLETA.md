# 📱 Guia Completo - Configuração WhatsApp

## 🎯 O que foi implementado?

Sistema completo de personalização de mensagens WhatsApp para o Ateliê Pro, permitindo que cada empresa configure:

1. **5 tipos de templates personalizados:**
   - Introdução (Dashboard)
   - Orçamentos
   - Cobranças
   - Entregas
   - Alertas de Estoque

2. **Configurações gerais:**
   - Número do WhatsApp
   - Assinatura padrão
   - Horários de envio
   - Preferências de emojis

---

## 📋 Passo a Passo

### 1. Executar Scripts SQL no Supabase

Execute o arquivo `supabase/whatsapp-templates.sql` no SQL Editor do Supabase:

```sql
-- Este script cria:
-- 1. Tabela whatsapp_templates (expandida)
-- 2. Tabela whatsapp_settings (nova)
-- 3. Políticas RLS
-- 4. Triggers
```

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o conteúdo de `supabase/whatsapp-templates.sql`
4. Clique em "Run"

---

### 2. Acessar a Página de Configuração

1. Faça login no Ateliê Pro
2. No menu lateral, clique em **"Config. WhatsApp"**
3. Você verá:
   - **Aba "Configurações Gerais"** - no topo
   - **5 abas de templates** - abaixo

---

### 3. Configurar Número e Assinatura

Na seção **"Configurações Gerais"**:

- **Número do WhatsApp:** 
  - Formato: `5511999999999` (código país + DDD + número)
  - Sem espaços ou caracteres especiais
  
- **Assinatura Padrão:**
  - Será adicionada automaticamente em todas as mensagens
  - Exemplo: `Ateliê Pro - Qualidade em cada peça`

- **Horários de Envio:**
  - Início: 8h (padrão)
  - Fim: 20h (padrão)
  - *Nota: Funcionalidade de validação automática será implementada no futuro*

- **Usar Emojis:**
  - Ative/desative emojis nas mensagens

Clique em **"Salvar Configurações"** quando terminar.

---

### 4. Personalizar Templates

#### Aba 1: Introdução (Dashboard)
- **Onde é usado:** Botão "Template WhatsApp" no Dashboard
- **Variáveis disponíveis:**
  - `${empresa?.nome}` - Nome da empresa

#### Aba 2: Orçamentos
- **Onde é usado:** Ao compartilhar orçamento na página de Orçamentos
- **Variáveis disponíveis:**
  - `{cliente}` - Nome do cliente
  - `{produtos}` - Lista de produtos
  - `{valor_total}` - Valor total do orçamento

#### Aba 3: Cobranças
- **Onde é usado:** Lembrete de pagamento no Controle Financeiro
- **Variáveis disponíveis:**
  - `{cliente}` - Nome do cliente
  - `{codigo_pedido}` - Código do pedido
  - `{valor_total}` - Valor total
  - `{valor_pago}` - Valor já pago
  - `{valor_restante}` - Valor restante
  - `{aviso_atraso}` - Aviso se está em atraso

#### Aba 4: Entregas
- **Onde é usado:** Lembrete de entrega na Agenda
- **Variáveis disponíveis:**
  - `{cliente}` - Nome do cliente
  - `{codigo_pedido}` - Código do pedido
  - `{data_entrega}` - Data prevista de entrega
  - `{tipo}` - Tipo do pedido
  - `{status}` - Status atual
  - `{dias_restantes}` - Dias até a entrega

#### Aba 5: Alertas de Estoque
- **Onde é usado:** Alertas de estoque baixo
- **Variáveis disponíveis:**
  - `{itens_estoque}` - Lista de itens com estoque baixo

---

### 5. Formatação de Mensagens

Use formatação do WhatsApp:

- **Negrito:** `*texto*` → **texto**
- **Itálico:** `_texto_` → _texto_
- **Listas:** Use `•` para criar listas

**Exemplo:**
```
*TÍTULO EM NEGRITO*

Texto normal com _itálico_

• Item 1
• Item 2
```

---

### 6. Testar Templates

Para cada template, você pode:

1. **Salvar Template** - Salva apenas o template atual
2. **Testar no WhatsApp** - Abre o WhatsApp com a mensagem (substitui variáveis com exemplos)
3. **Restaurar Padrão** - Volta ao template padrão
4. **Salvar Todos** - Salva todos os templates de uma vez

---

## 🔧 Integração Automática

Os templates personalizados são **automaticamente usados** nas seguintes páginas:

### ✅ Dashboard
- Botão "Template WhatsApp" usa o template de **Introdução**

### ✅ Orçamentos
- Ao clicar em "Enviar WhatsApp" em um orçamento, usa o template de **Orçamentos**
- Variáveis são preenchidas automaticamente com dados reais

### ✅ Controle Financeiro
- Ao enviar lembrete de pagamento, usa o template de **Cobranças**
- Variáveis são preenchidas automaticamente

### ✅ Agenda
- Ao enviar lembrete de entrega, usa o template de **Entregas**
- Variáveis são preenchidas automaticamente

---

## 📝 Exemplo Prático

### Template de Orçamento Personalizado:

```
*🎉 ORÇAMENTO ${empresa?.nome}*

Olá *{cliente}*! 👋

Seu orçamento está pronto! 🎨

*📦 PRODUTOS:*
{produtos}

*💰 VALOR TOTAL: {valor_total}*

*✅ PRÓXIMOS PASSOS:*
1️⃣ Confirme se está de acordo
2️⃣ Informe a forma de pagamento
3️⃣ Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

_${empresa?.nome} - Qualidade e criatividade em cada peça_ ✨
```

**Resultado quando usado:**
```
*🎉 ORÇAMENTO ATELIÊ PRO*

Olá *João Silva*! 👋

Seu orçamento está pronto! 🎨

*📦 PRODUTOS:*
• Camiseta personalizada - Qtd: 5 - R$ 250,00

*💰 VALOR TOTAL: R$ 250,00*

*✅ PRÓXIMOS PASSOS:*
1️⃣ Confirme se está de acordo
2️⃣ Informe a forma de pagamento
3️⃣ Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

_ATELIÊ PRO - Qualidade e criatividade em cada peça_ ✨
```

---

## 🎨 Dicas de Personalização

1. **Use emojis moderadamente** - Facilita a leitura, mas não exagere
2. **Mantenha mensagens objetivas** - Clientes preferem mensagens diretas
3. **Inclua call-to-action** - Sempre peça uma ação (responder, confirmar, etc.)
4. **Teste antes de usar** - Use o botão "Testar no WhatsApp" para ver como fica
5. **Personalize por tipo** - Cada template pode ter um tom diferente

---

## 🔄 Atualizações Futuras

Funcionalidades planejadas:

- ✅ Templates personalizados (implementado)
- ✅ Configurações gerais (implementado)
- ⏳ Validação de horários de envio
- ⏳ Envio automático de mensagens
- ⏳ Histórico de mensagens enviadas
- ⏳ Templates por cliente

---

## ❓ FAQ

### Posso usar HTML nas mensagens?
Não, apenas formatação do WhatsApp (negrito, itálico, emojis).

### As variáveis são obrigatórias?
Não, mas recomendamos usar para personalizar as mensagens.

### Posso ter templates diferentes por cliente?
Ainda não, mas está planejado para o futuro.

### O número do WhatsApp é obrigatório?
Não, mas se configurado, as mensagens abrirão direto para esse número.

### Como restaurar todos os templates?
Você precisa restaurar cada template individualmente usando o botão "Restaurar Padrão".

---

## 🆘 Suporte

Se tiver dúvidas ou problemas:

1. Verifique se executou o script SQL corretamente
2. Verifique se está logado com uma empresa válida
3. Tente restaurar o template padrão e personalizar novamente
4. Entre em contato com o suporte

---

**Última atualização:** Janeiro 2025

