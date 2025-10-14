// Sistema de alertas para erros críticos e eventos importantes
export interface AlertConfig {
  enableEmailAlerts: boolean;
  enableConsoleAlerts: boolean;
  enableToastAlerts: boolean;
  criticalErrorThreshold: number;
  alertCooldown: number; // em ms
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  context: string;
  timestamp: string;
  metadata?: unknown;
  resolved: boolean;
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enableEmailAlerts: false, // Em produção, configurar para true
  enableConsoleAlerts: true,
  enableToastAlerts: true,
  criticalErrorThreshold: 5, // 5 erros em 1 minuto
  alertCooldown: 30000 // 30 segundos entre alertas do mesmo tipo
};

export class AlertSystem {
  private static instance: AlertSystem;
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private errorCounts: Map<string, { count: number; lastAlert: number }> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  constructor() {
    this.config = { ...DEFAULT_ALERT_CONFIG };
    this.startErrorMonitoring();
  }

  // Configurar sistema de alertas
  configure(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Criar alerta
  createAlert(
    type: Alert['type'],
    title: string,
    message: string,
    context: string,
    metadata?: unknown 
  ): void {
    const alertId = `${context}-${type}-${Date.now()}`;
    
    // Verificar cooldown
    if (this.isOnCooldown(alertId)) {
      return;
    }

    const alert: Alert = {
      id: alertId,
      type,
      title,
      message,
      context,
      timestamp: new Date().toISOString(),
      metadata,
      resolved: false
    };

    this.alerts.push(alert);
    this.setCooldown(alertId);

    // Processar alerta
    this.processAlert(alert);

    // Manter apenas os últimos 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // Processar alerta
  private processAlert(alert: Alert): void {
    // Console alert
    if (this.config.enableConsoleAlerts) {
      const emoji = {
        error: '🚨',
        warning: '⚠️',
        info: 'ℹ️',
        success: '✅'
      };
      
      console.log(
        `${emoji[alert.type]} [${alert.context}] ${alert.title}: ${alert.message}`,
        alert.metadata || ''
      );
    }

    // Toast alert (se disponível)
    if (this.config.enableToastAlerts && typeof window !== 'undefined') {
      // Usar toast do sonner se disponível
      if (window.toast) {
        switch (alert.type) {
          case 'error':
            window.toast.error(alert.message);
            break;
          case 'warning':
            window.toast.warning(alert.message);
            break;
          case 'info':
            window.toast.info(alert.message);
            break;
          case 'success':
            window.toast.success(alert.message);
            break;
        }
      }
    }

    // Email alert (em produção)
    if (this.config.enableEmailAlerts && alert.type === 'error') {
      this.sendEmailAlert(alert);
    }
  }

  // Alertas específicos para diferentes tipos de erros
  alertDatabaseError(error: unknown, context: string, operation: string): void {
    this.createAlert(
      'error',
      'Erro de Banco de Dados',
      `Falha na operação ${operation}: ${error.message}`,
      context,
      { error, operation }
    );
  }

  alertNetworkError(error: unknown, context: string, endpoint: string): void {
    this.createAlert(
      'error',
      'Erro de Rede',
      `Falha na conexão com ${endpoint}: ${error.message}`,
      context,
      { error, endpoint }
    );
  }

  alertValidationError(errors: string[], context: string, form: string): void {
    this.createAlert(
      'warning',
      'Erro de Validação',
      `Formulário ${form} com dados inválidos: ${errors.join(', ')}`,
      context,
      { errors, form }
    );
  }

  alertPerformanceIssue(operation: string, duration: number, context: string): void {
    this.createAlert(
      'warning',
      'Problema de Performance',
      `Operação ${operation} demorou ${duration}ms (limite: 1000ms)`,
      context,
      { operation, duration }
    );
  }

  alertSecurityIssue(type: string, context: string, details: string): void {
    this.createAlert(
      'error',
      'Problema de Segurança',
      `${type}: ${details}`,
      context,
      { type, details }
    );
  }

  alertBusinessMetric(metric: string, value: number, context: string): void {
    this.createAlert(
      'info',
      'Métrica de Negócio',
      `${metric}: ${value}`,
      context,
      { metric, value }
    );
  }

  // Monitoramento de erros críticos
  private startErrorMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitorar erros JavaScript globais
    window.addEventListener('error', (event) => {
      this.createAlert(
        'error',
        'Erro JavaScript',
        `${event.message} em ${event.filename}:${event.lineno}`,
        'GLOBAL',
        { 
          error: event.error,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });

    // Monitorar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.createAlert(
        'error',
        'Promise Rejeitada',
        `Promise rejeitada: ${event.reason}`,
        'GLOBAL',
        { reason: event.reason }
      );
    });

    // Monitorar erros de rede
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.alertNetworkError(
            { message: `HTTP ${response.status}`, status: response.status },
            'NETWORK',
            args[0] as string
          );
        }
        
        return response;
      } catch (error) {
        this.alertNetworkError(error, 'NETWORK', args[0] as string);
        throw error;
      }
    };
  }

  // Verificar se está em cooldown
  private isOnCooldown(alertId: string): boolean {
    const lastAlert = this.alertCooldowns.get(alertId);
    if (!lastAlert) return false;
    
    return Date.now() - lastAlert < this.config.alertCooldown;
  }

  // Definir cooldown
  private setCooldown(alertId: string): void {
    this.alertCooldowns.set(alertId, Date.now());
  }

  // Enviar alerta por email (implementação básica)
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Em produção, integrar com serviço de email
    console.log('📧 Email Alert:', alert);
  }

  // Resolver alerta
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // Obter alertas
  getAlerts(): Alert[] {
    return [...this.alerts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Obter alertas por tipo
  getAlertsByType(type: Alert['type']): Alert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  // Obter alertas por contexto
  getAlertsByContext(context: string): Alert[] {
    return this.alerts.filter(alert => alert.context === context);
  }

  // Obter alertas não resolvidos
  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Obter estatísticas
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byContext: Record<string, number>;
    unresolved: number;
    last24Hours: number;
  } {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const byType: Record<string, number> = {};
    const byContext: Record<string, number> = {};
    let unresolved = 0;
    let last24HoursCount = 0;

    this.alerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      byContext[alert.context] = (byContext[alert.context] || 0) + 1;
      
      if (!alert.resolved) unresolved++;
      
      if (new Date(alert.timestamp).getTime() > last24Hours) {
        last24HoursCount++;
      }
    });

    return {
      total: this.alerts.length,
      byType,
      byContext,
      unresolved,
      last24Hours: last24HoursCount
    };
  }

  // Limpar alertas antigos
  clearOldAlerts(olderThanDays: number = 7): void {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoff
    );
  }

  // Exportar alertas
  exportAlerts(): string {
    return JSON.stringify(this.alerts, null, 2);
  }
}

// Instância global
export const alertSystem = AlertSystem.getInstance();

// Funções auxiliares
export const alert = {
  error: (title: string, message: string, context: string, metadata?: unknown) => 
    alertSystem.createAlert('error', title, message, context, metadata),
  warning: (title: string, message: string, context: string, metadata?: unknown) => 
    alertSystem.createAlert('warning', title, message, context, metadata),
  info: (title: string, message: string, context: string, metadata?: unknown) => 
    alertSystem.createAlert('info', title, message, context, metadata),
  success: (title: string, message: string, context: string, metadata?: unknown) => 
    alertSystem.createAlert('success', title, message, context, metadata),
  databaseError: (error: unknown, context: string, operation: string) => 
    alertSystem.alertDatabaseError(error, context, operation),
  networkError: (error: unknown, context: string, endpoint: string) => 
    alertSystem.alertNetworkError(error, context, endpoint),
  validationError: (errors: string[], context: string, form: string) => 
    alertSystem.alertValidationError(errors, context, form),
  performanceIssue: (operation: string, duration: number, context: string) => 
    alertSystem.alertPerformanceIssue(operation, duration, context),
  securityIssue: (type: string, context: string, details: string) => 
    alertSystem.alertSecurityIssue(type, context, details),
  businessMetric: (metric: string, value: number, context: string) => 
    alertSystem.alertBusinessMetric(metric, value, context)
};
