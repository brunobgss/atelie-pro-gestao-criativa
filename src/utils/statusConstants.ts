// Constantes centralizadas para status de pedidos e pagamentos
// Garantir consistência em todo o app

// Status válidos do banco de dados (constraint atelie_orders_status_check)
export const ORDER_STATUS = {
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  EM_PRODUCAO: 'Em produção',
  FINALIZANDO: 'Finalizando',
  PRONTO: 'Pronto',
  AGUARDANDO_RETIRADA: 'Aguardando retirada',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado'
} as const;

// Status de pagamento (usados na interface)
export const PAYMENT_STATUS = {
  PAGO: 'pago',
  PENDENTE: 'pendente',
  PARCIAL: 'parcial'
} as const;

// Mapeamento de status de pagamento para status de pedido
export const PAYMENT_TO_ORDER_STATUS = {
  [PAYMENT_STATUS.PAGO]: ORDER_STATUS.ENTREGUE,
  [PAYMENT_STATUS.PENDENTE]: ORDER_STATUS.AGUARDANDO_APROVACAO,
  [PAYMENT_STATUS.PARCIAL]: ORDER_STATUS.EM_PRODUCAO
} as const;

// Cores para status de pedidos
export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.AGUARDANDO_APROVACAO]: "bg-muted text-muted-foreground border-muted-foreground/30",
  [ORDER_STATUS.EM_PRODUCAO]: "bg-secondary/20 text-secondary border-secondary/30",
  [ORDER_STATUS.FINALIZANDO]: "bg-primary/10 text-primary border-primary/30",
  [ORDER_STATUS.PRONTO]: "bg-accent/20 text-accent border-accent/30",
  [ORDER_STATUS.AGUARDANDO_RETIRADA]: "bg-blue-100 text-blue-800 border-blue-200",
  [ORDER_STATUS.ENTREGUE]: "bg-green-100 text-green-800 border-green-200",
  [ORDER_STATUS.CANCELADO]: "bg-destructive/20 text-destructive border-destructive/30"
} as const;

// Cores para status de pagamento
export const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.PAGO]: "bg-green-100 text-green-800 border-green-200",
  [PAYMENT_STATUS.PENDENTE]: "bg-orange-100 text-orange-800 border-orange-200",
  [PAYMENT_STATUS.PARCIAL]: "bg-blue-100 text-blue-800 border-blue-200"
} as const;

// Lista de status de pedidos para selects
export const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.AGUARDANDO_APROVACAO, label: 'Aguardando aprovação' },
  { value: ORDER_STATUS.EM_PRODUCAO, label: 'Em produção' },
  { value: ORDER_STATUS.FINALIZANDO, label: 'Finalizando' },
  { value: ORDER_STATUS.PRONTO, label: 'Pronto' },
  { value: ORDER_STATUS.AGUARDANDO_RETIRADA, label: 'Aguardando retirada' },
  { value: ORDER_STATUS.ENTREGUE, label: 'Entregue' },
  { value: ORDER_STATUS.CANCELADO, label: 'Cancelado' }
];

// Lista de status de pagamento para selects
export const PAYMENT_STATUS_OPTIONS = [
  { value: PAYMENT_STATUS.PAGO, label: 'Pago' },
  { value: PAYMENT_STATUS.PENDENTE, label: 'Pendente' },
  { value: PAYMENT_STATUS.PARCIAL, label: 'Parcial' }
];

// Função para obter cor do status de pedido
export function getOrderStatusColor(status: string): string {
  return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 
         ORDER_STATUS_COLORS[ORDER_STATUS.AGUARDANDO_APROVACAO];
}

// Função para obter cor do status de pagamento
export function getPaymentStatusColor(status: string): string {
  return PAYMENT_STATUS_COLORS[status as keyof typeof PAYMENT_STATUS_COLORS] || 
         PAYMENT_STATUS_COLORS[PAYMENT_STATUS.PENDENTE];
}

// Função para mapear status de pagamento para status de pedido
export function mapPaymentToOrderStatus(paymentStatus: string): string {
  return PAYMENT_TO_ORDER_STATUS[paymentStatus as keyof typeof PAYMENT_TO_ORDER_STATUS] || 
         ORDER_STATUS.AGUARDANDO_APROVACAO;
}

export const DEFAULT_ORDER_STATUS_DETAILS = [
  {
    key: ORDER_STATUS.AGUARDANDO_APROVACAO,
    label: 'Aguardando Aprovação',
    description: 'Pedido recebido, aguardando confirmação do cliente',
  },
  {
    key: ORDER_STATUS.EM_PRODUCAO,
    label: 'Em Produção',
    description: 'Trabalho iniciado, produção em andamento',
  },
  {
    key: ORDER_STATUS.FINALIZANDO,
    label: 'Finalizando',
    description: 'Produto quase pronto, acabamentos finais',
  },
  {
    key: ORDER_STATUS.PRONTO,
    label: 'Pronto',
    description: 'Produto finalizado, pronto para entrega',
  },
  {
    key: ORDER_STATUS.AGUARDANDO_RETIRADA,
    label: 'Aguardando Retirada',
    description: 'Produto pronto, aguardando retirada pelo cliente',
  },
  {
    key: ORDER_STATUS.ENTREGUE,
    label: 'Entregue',
    description: 'Produto entregue ao cliente, pedido finalizado',
  },
] as const;
