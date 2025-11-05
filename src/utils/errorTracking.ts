// Sistema próprio de rastreamento de erros (100% gratuito)
// Pode enviar para um endpoint próprio ou apenas armazenar localmente

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  email?: string;
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
  context?: Record<string, unknown>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorLog[] = [];
  private maxErrors = 100; // Manter apenas os últimos 100 erros
  private endpoint: string | null = null; // Opcional: endpoint para enviar erros

  private constructor() {
    this.loadFromStorage();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // Configurar endpoint opcional (se você criar um endpoint próprio)
  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Capturar erros globais
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
      });
    });

    // Capturar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack || String(event.reason),
        url: window.location.href,
      });
    });
  }

  // Capturar erro
  captureError(error: {
    message: string;
    stack?: string;
    componentStack?: string;
    url?: string;
    line?: number;
    column?: number;
    context?: Record<string, unknown>;
    severity?: 'error' | 'warning' | 'info';
  }) {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      componentStack: error.componentStack,
      url: error.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
      severity: error.severity || 'error',
      context: error.context,
    };

    // Adicionar informações do usuário se disponível
    try {
      const userData = localStorage.getItem('app_user_context');
      if (userData) {
        const user = JSON.parse(userData);
        errorLog.userId = user.id;
        errorLog.email = user.email;
      }
    } catch (e) {
      // Ignorar
    }

    // Adicionar à lista
    this.errors.unshift(errorLog);

    // Manter apenas os últimos N erros
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Salvar no localStorage
    this.saveToStorage();

    // Enviar para endpoint se configurado
    if (this.endpoint) {
      this.sendToEndpoint(errorLog).catch(() => {
        // Ignorar erros de envio
      });
    }

    // Log no console (apenas em desenvolvimento)
    if (import.meta.env.DEV) {
      console.error('🔴 Erro capturado:', errorLog);
    }
  }

  // Capturar mensagem
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.captureError({
      message,
      severity: level,
    });
  }

  // Definir contexto do usuário
  setUser(user: { id: string; email?: string; username?: string }) {
    try {
      localStorage.setItem('app_user_context', JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
      }));
    } catch (e) {
      // Ignorar
    }
  }

  // Limpar contexto do usuário
  clearUser() {
    try {
      localStorage.removeItem('app_user_context');
    } catch (e) {
      // Ignorar
    }
  }

  // Obter todos os erros
  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  // Obter erros recentes (últimas N horas)
  getRecentErrors(hours: number = 24): ErrorLog[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.errors.filter(error => new Date(error.timestamp) > cutoff);
  }

  // Limpar erros
  clearErrors() {
    this.errors = [];
    this.saveToStorage();
  }

  // Salvar no localStorage
  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('app_errors', JSON.stringify(this.errors));
      }
    } catch (e) {
      // Ignorar
    }
  }

  // Carregar do localStorage
  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('app_errors');
        if (stored) {
          this.errors = JSON.parse(stored);
        }
      }
    } catch (e) {
      // Ignorar
    }
  }

  // Enviar para endpoint (opcional)
  private async sendToEndpoint(errorLog: ErrorLog) {
    if (!this.endpoint) return;

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorLog),
      });
    } catch (e) {
      // Ignorar erros de envio
    }
  }

  // Exportar erros (para download/debug)
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

// Instância global
export const errorTracker = ErrorTracker.getInstance();

// Funções auxiliares
export function captureError(error: Error, context?: Record<string, unknown>) {
  errorTracker.captureError({
    message: error.message,
    stack: error.stack,
    context,
  });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  errorTracker.captureMessage(message, level);
}

export function setUserContext(user: { id: string; email?: string; username?: string }) {
  errorTracker.setUser(user);
}

export function clearUserContext() {
  errorTracker.clearUser();
}

export function getErrors() {
  return errorTracker.getErrors();
}

export function getRecentErrors(hours: number = 24) {
  return errorTracker.getRecentErrors(hours);
}

