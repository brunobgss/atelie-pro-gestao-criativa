// Sistema de segurança e proteção de dados
export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  enableDataEncryption: boolean;
  enableAuditLog: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutos
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
  passwordMinLength: 8,
  enableDataEncryption: true,
  enableAuditLog: true
};

export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private auditLog: Array<{
    timestamp: string;
    userId?: string;
    action: string;
    resource: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }> = [];

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  constructor() {
    this.config = { ...DEFAULT_SECURITY_CONFIG };
  }

  // Configurar segurança
  configure(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Validar senha
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length < this.config.passwordMinLength) {
      errors.push(`Senha deve ter pelo menos ${this.config.passwordMinLength} caracteres`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Verificar tentativas de login
  checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutTime?: number } {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    // Se passou do tempo de bloqueio, resetar tentativas
    if (timeSinceLastAttempt > this.config.lockoutDuration) {
      this.loginAttempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    const remainingAttempts = this.config.maxLoginAttempts - attempts.count;
    const lockoutTime = this.config.lockoutDuration - timeSinceLastAttempt;

    return {
      allowed: attempts.count < this.config.maxLoginAttempts,
      remainingAttempts: Math.max(0, remainingAttempts),
      lockoutTime: attempts.count >= this.config.maxLoginAttempts ? lockoutTime : undefined
    };
  }

  // Registrar tentativa de login
  recordLoginAttempt(identifier: string, success: boolean): void {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      // Reset em caso de sucesso
      this.loginAttempts.delete(identifier);
    } else {
      // Incrementar tentativas em caso de falha
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(identifier, attempts);
    }
  }

  // Sanitizar dados de entrada
  sanitizeInput(input: unknown): any {
    if (typeof input === 'string') {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remove caracteres HTML
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+=/gi, ''); // Remove event handlers
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: unknown = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  // Validar dados sensíveis
  validateSensitiveData(data: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verificar se contém dados sensíveis
    const sensitivePatterns = [
      /password/i,
      /senha/i,
      /token/i,
      /key/i,
      /secret/i,
      /private/i,
      /confidential/i
    ];

    const checkSensitiveData = (obj: unknown, path: string = ''): void => {
      if (typeof obj === 'string') {
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(obj)) {
            errors.push(`Dados sensíveis detectados em ${path}: ${obj.substring(0, 20)}...`);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          checkSensitiveData(value, `${path}.${key}`);
        });
      }
    };

    checkSensitiveData(data);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Criptografar dados sensíveis
  encryptSensitiveData(data: string): string {
    if (!this.config.enableDataEncryption) {
      return data;
    }

    // Implementação simples de criptografia (em produção, usar biblioteca robusta)
    const key = this.getEncryptionKey();
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return btoa(encrypted);
  }

  // Descriptografar dados sensíveis
  decryptSensitiveData(encryptedData: string): string {
    if (!this.config.enableDataEncryption) {
      return encryptedData;
    }

    try {
      const data = atob(encryptedData);
      const key = this.getEncryptionKey();
      let decrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      return encryptedData;
    }
  }

  // Registrar auditoria
  audit(action: string, resource: string, success: boolean, userId?: string, metadata?: unknown): void {
    if (!this.config.enableAuditLog) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      success,
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      ...metadata
    };

    this.auditLog.push(auditEntry);

    // Manter apenas os últimos 1000 registros
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    console.log(`🔍 Audit: ${action} on ${resource} - ${success ? 'SUCCESS' : 'FAILED'}`, auditEntry);
  }

  // Verificar permissões
  checkPermission(userId: string, resource: string, action: string): boolean {
    // Implementação básica - em produção, integrar com sistema de permissões
    const permissions = this.getUserPermissions(userId);
    return permissions.some(p => p.resource === resource && p.actions.includes(action));
  }

  // Validar sessão
  validateSession(): { isValid: boolean; userId?: string; expiresAt?: number } {
    try {
      const sessionData = localStorage.getItem('app-session');
      if (!sessionData) {
        return { isValid: false };
      }

      const session = JSON.parse(sessionData);
      const now = Date.now();

      if (session.expiresAt && now > session.expiresAt) {
        this.clearSession();
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: session.userId,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('Erro ao validar sessão:', error);
      return { isValid: false };
    }
  }

  // Criar sessão
  createSession(userId: string): void {
    const session = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTimeout
    };

    localStorage.setItem('app-session', JSON.stringify(session));
  }

  // Limpar sessão
  clearSession(): void {
    localStorage.removeItem('app-session');
  }

  // Obter logs de auditoria
  getAuditLogs(): Array<{
    timestamp: string;
    userId?: string;
    action: string;
    resource: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }> {
    return [...this.auditLog];
  }

  // Obter estatísticas de segurança
  getSecurityStats(): {
    totalLoginAttempts: number;
    failedAttempts: number;
    lockedAccounts: number;
    auditLogCount: number;
    securityScore: number;
  } {
    const totalAttempts = Array.from(this.loginAttempts.values())
      .reduce((sum, attempts) => sum + attempts.count, 0);
    
    const failedAttempts = Array.from(this.loginAttempts.values())
      .reduce((sum, attempts) => sum + attempts.count, 0);
    
    const lockedAccounts = Array.from(this.loginAttempts.values())
      .filter(attempts => attempts.count >= this.config.maxLoginAttempts).length;
    
    const auditLogCount = this.auditLog.length;
    
    // Calcular score de segurança (0-100)
    const securityScore = Math.max(0, 100 - (failedAttempts * 5) - (lockedAccounts * 10));

    return {
      totalLoginAttempts: totalAttempts,
      failedAttempts,
      lockedAccounts,
      auditLogCount,
      securityScore
    };
  }

  // Funções auxiliares privadas
  private getEncryptionKey(): string {
    // Em produção, usar chave segura do servidor
    return 'app-secret-key-2024';
  }

  private getClientIP(): string {
    // Implementação básica - em produção, obter IP real
    return 'unknown';
  }

  private getUserPermissions(userId: string): Array<{ resource: string; actions: string[] }> {
    // Implementação básica - em produção, integrar com sistema de permissões
    return [
      { resource: 'customers', actions: ['read', 'write', 'delete'] },
      { resource: 'orders', actions: ['read', 'write', 'delete'] },
      { resource: 'quotes', actions: ['read', 'write', 'delete'] },
      { resource: 'inventory', actions: ['read', 'write', 'delete'] },
      { resource: 'reports', actions: ['read'] }
    ];
  }
}

// Instância global
export const securityManager = SecurityManager.getInstance();

// Funções auxiliares
export const security = {
  validatePassword: (password: string) => securityManager.validatePassword(password),
  sanitizeInput: (input: unknown) => securityManager.sanitizeInput(input),
  validateSensitiveData: (data: unknown) => securityManager.validateSensitiveData(data),
  encryptSensitiveData: (data: string) => securityManager.encryptSensitiveData(data),
  decryptSensitiveData: (data: string) => securityManager.decryptSensitiveData(data),
  audit: (action: string, resource: string, success: boolean, userId?: string, metadata?: unknown) => 
    securityManager.audit(action, resource, success, userId, metadata),
  checkPermission: (userId: string, resource: string, action: string) => 
    securityManager.checkPermission(userId, resource, action),
  validateSession: () => securityManager.validateSession(),
  createSession: (userId: string) => securityManager.createSession(userId),
  clearSession: () => securityManager.clearSession()
};
