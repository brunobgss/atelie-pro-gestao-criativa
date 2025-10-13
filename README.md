# Ateliê Pro - Sistema de Gestão para Ateliês

Sistema completo de gestão para ateliês de costura, bordado e confecção, desenvolvido com React, TypeScript e Supabase.

## 🚀 Funcionalidades

### 📋 Gestão de Pedidos
- Criação e edição de pedidos
- Controle de status (Aguardando aprovação, Em produção, Pronto, Entregue, Cancelado)
- Controle de pagamentos (Pendente, Parcial, Pago)
- Geração de ordens de produção em PDF

### 💰 Orçamentos
- Criação de orçamentos detalhados
- Lista de itens com quantidades e valores
- Geração de PDFs para impressão
- Compartilhamento público de orçamentos
- Envio via WhatsApp

### 💳 Controle Financeiro
- Registro de receitas e pagamentos
- Controle de valores pagos por pedido
- Relatórios financeiros
- Lembretes de pagamento via WhatsApp

### 📅 Agenda
- Visualização de entregas por data
- Lembretes automáticos via WhatsApp
- Controle de prazos

### 📦 Estoque
- Controle de inventário
- Alertas de estoque baixo
- Movimentações de entrada e saída

### 👥 Clientes
- Cadastro completo de clientes
- Histórico de pedidos
- Contatos e informações

### 🛍️ Catálogo de Produtos
- Cadastro de produtos e serviços
- Preços e descrições
- Categorização

### 📊 Dashboard Inteligente
- Centro de alertas inteligentes
- Estatísticas em tempo real
- Pedidos atrasados
- Pagamentos pendentes
- Estoque crítico

## 🛠️ Tecnologias

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estado**: TanStack Query (React Query)
- **Roteamento**: React Router DOM
- **Notificações**: Sonner (Toast)

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd atelie-pro-gestao-criativa
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Crie um arquivo .env.local com suas credenciais do Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Execute o projeto:
```bash
npm run dev
```

## 📱 Sistema Multi-Loja

O Ateliê Pro suporta múltiplas empresas/lojas com:
- Isolamento completo de dados por empresa
- Controle de acesso por usuário
- Trial gratuito de 7 dias por empresa
- Sistema de assinatura premium

## 🔐 Autenticação

- Login/Cadastro seguro via Supabase Auth
- Controle de sessão automático
- Proteção de rotas
- Sistema de recuperação de senha

## 📄 Licença

Este projeto é proprietário e destinado ao uso comercial.

## 👨‍💻 Desenvolvido por

Sistema desenvolvido especialmente para ateliês de costura e confecção, com foco na experiência do usuário e funcionalidades essenciais para o negócio.

---

**Ateliê Pro** - Transformando a gestão do seu ateliê! 🧵✨