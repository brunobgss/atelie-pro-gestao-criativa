// Sistema de logging centralizado
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  timestamp: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private currentLevel: LogLevel = LogLevel.INFO;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Configurar nível de log
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  // Adicionar log
  private addLog(level: LogLevel, message: string, context: string, data?: any): void {
    if (level < this.currentLevel) return;

    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      data,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    this.logs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log no console com cores
    this.logToConsole(logEntry);
  }

  // Debug
  debug(message: string, context: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, message, context, data);
  }

  // Info
  info(message: string, context: string, data?: any): void {
    this.addLog(LogLevel.INFO, message, context, data);
  }

  // Warning
  warn(message: string, context: string, data?: any): void {
    this.addLog(LogLevel.WARN, message, context, data);
  }

  // Error
  error(message: string, context: string, data?: any): void {
    this.addLog(LogLevel.ERROR, message, context, data);
  }

  // Critical
  critical(message: string, context: string, data?: any): void {
    this.addLog(LogLevel.CRITICAL, message, context, data);
  }

  // Log de performance
  performance(operation: string, duration: number, context: string, data?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, context, { ...data, duration });
  }

  // Log de operação do usuário
  userAction(action: string, context: string, data?: any): void {
    this.info(`User Action: ${action}`, context, data);
  }

  // Log de operação do sistema
  systemEvent(event: string, context: string, data?: any): void {
    this.info(`System Event: ${event}`, context, data);
  }

  // Log de sincronização
  sync(operation: string, resource: string, success: boolean, data?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Sync: ${operation} ${resource} ${success ? 'successful' : 'failed'}`;
    this.addLog(level, message, 'SYNC', { operation, resource, success, ...data });
  }

  // Log de cache
  cache(operation: string, key: string, success: boolean, data?: any): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = `Cache: ${operation} ${key} ${success ? 'successful' : 'failed'}`;
    this.addLog(level, message, 'CACHE', { operation, key, success, ...data });
  }

  // Log de API
  api(method: string, endpoint: string, status: number, duration?: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API: ${method} ${endpoint} ${status}${duration ? ` (${duration}ms)` : ''}`;
    this.addLog(level, message, 'API', { method, endpoint, status, duration, ...data });
  }

  // Obter logs por nível
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Obter logs por contexto
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  // Obter logs por usuário
  getLogsByUser(userId: string): LogEntry[] {
    return this.logs.filter(log => log.userId === userId);
  }

  // Obter logs recentes
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Obter estatísticas
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byContext: Record<string, number>;
    errors: number;
    warnings: number;
  } {
    const byLevel: Record<string, number> = {};
    const byContext: Record<string, number> = {};
    let errors = 0;
    let warnings = 0;

    this.logs.forEach(log => {
      byLevel[LogLevel[log.level]] = (byLevel[LogLevel[log.level]] || 0) + 1;
      byContext[log.context] = (byContext[log.context] || 0) + 1;
      
      if (log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL) {
        errors++;
      }
      if (log.level === LogLevel.WARN) {
        warnings++;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      byContext,
      errors,
      warnings
    };
  }

  // Exportar logs
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Limpar logs
  clearLogs(): void {
    this.logs = [];
  }

  // Log no console com cores
  private logToConsole(log: LogEntry): void {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${log.context}]`;
    
    const styles = {
      [LogLevel.DEBUG]: 'color: #666; font-style: italic;',
      [LogLevel.INFO]: 'color: #2196F3;',
      [LogLevel.WARN]: 'color: #FF9800; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #F44336; font-weight: bold;',
      [LogLevel.CRITICAL]: 'color: #E91E63; font-weight: bold; background: #FFEBEE;'
    };

    const emoji = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🚨'
    };

    console.log(
      `%c${emoji[log.level]} ${prefix} ${log.message}`,
      styles[log.level],
      log.data || ''
    );
  }

  // Obter ID do usuário atual
  private getCurrentUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('supabase.auth.token');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed?.user?.id;
      }
    } catch (error) {
      // Ignorar erro
    }
    return undefined;
  }

  // Obter ID da sessão
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('app-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('app-session-id', sessionId);
    }
    return sessionId;
  }
}

// Instância global
export const logger = Logger.getInstance();

// Funções auxiliares para logging rápido
export const log = {
  debug: (message: string, context: string, data?: any) => logger.debug(message, context, data),
  info: (message: string, context: string, data?: any) => logger.info(message, context, data),
  warn: (message: string, context: string, data?: any) => logger.warn(message, context, data),
  error: (message: string, context: string, data?: any) => logger.error(message, context, data),
  critical: (message: string, context: string, data?: any) => logger.critical(message, context, data),
  performance: (operation: string, duration: number, context: string, data?: any) => 
    logger.performance(operation, duration, context, data),
  userAction: (action: string, context: string, data?: any) => 
    logger.userAction(action, context, data),
  systemEvent: (event: string, context: string, data?: any) => 
    logger.systemEvent(event, context, data),
  sync: (operation: string, resource: string, success: boolean, data?: any) => 
    logger.sync(operation, resource, success, data),
  cache: (operation: string, key: string, success: boolean, data?: any) => 
    logger.cache(operation, key, success, data),
  api: (method: string, endpoint: string, status: number, duration?: number, data?: any) => 
    logger.api(method, endpoint, status, duration, data)
};
