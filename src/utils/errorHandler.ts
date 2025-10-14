// Sistema centralizado de tratamento de erros
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class AppErrorHandler {
  private static instance: AppErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler();
    }
    return AppErrorHandler.instance;
  }

  // Registrar erro
  logError(error: AppError): void {
    this.errorLog.push(error);
    console.error(`🚨 [${error.code}] ${error.message}`, error.details);
  }

  // Criar erro padronizado
  createError(code: string, message: string, details?: any): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  // Tratar erro de Supabase
  handleSupabaseError(error: any, context: string): AppError {
    let code = 'SUPABASE_ERROR';
    let message = 'Erro no banco de dados';

    if (error?.code) {
      switch (error.code) {
        case '23505':
          code = 'DUPLICATE_KEY';
          message = 'Registro já existe';
          break;
        case '23503':
          code = 'FOREIGN_KEY_VIOLATION';
          message = 'Referência inválida';
          break;
        case '23502':
          code = 'NOT_NULL_VIOLATION';
          message = 'Campo obrigatório não preenchido';
          break;
        case '42501':
          code = 'INSUFFICIENT_PRIVILEGE';
          message = 'Permissão insuficiente';
          break;
        case 'PGRST116':
          code = 'ROW_LEVEL_SECURITY';
          message = 'Política de segurança bloqueou a operação';
          break;
        default:
          code = `SUPABASE_${error.code}`;
          message = error.message || 'Erro desconhecido no banco de dados';
      }
    }

    const appError = this.createError(code, message, {
      context,
      originalError: error,
      supabaseCode: error?.code,
      supabaseMessage: error?.message
    });

    this.logError(appError);
    return appError;
  }

  // Tratar erro de rede
  handleNetworkError(error: any, context: string): AppError {
    let code = 'NETWORK_ERROR';
    let message = 'Erro de conexão';

    if (error?.message?.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
      message = 'Tempo limite excedido';
    } else if (error?.message?.includes('Failed to fetch')) {
      code = 'CONNECTION_ERROR';
      message = 'Falha na conexão com o servidor';
    } else if (error?.status) {
      code = `HTTP_${error.status}`;
      message = `Erro HTTP ${error.status}`;
    }

    const appError = this.createError(code, message, {
      context,
      originalError: error,
      status: error?.status
    });

    this.logError(appError);
    return appError;
  }

  // Tratar erro de validação
  handleValidationError(errors: string[], context: string): AppError {
    const appError = this.createError('VALIDATION_ERROR', 'Dados inválidos', {
      context,
      validationErrors: errors
    });

    this.logError(appError);
    return appError;
  }

  // Tratar erro de autenticação
  handleAuthError(error: any, context: string): AppError {
    let code = 'AUTH_ERROR';
    let message = 'Erro de autenticação';

    if (error?.message?.includes('Invalid login credentials')) {
      code = 'INVALID_CREDENTIALS';
      message = 'Credenciais inválidas';
    } else if (error?.message?.includes('Email not confirmed')) {
      code = 'EMAIL_NOT_CONFIRMED';
      message = 'Email não confirmado';
    } else if (error?.message?.includes('User not found')) {
      code = 'USER_NOT_FOUND';
      message = 'Usuário não encontrado';
    }

    const appError = this.createError(code, message, {
      context,
      originalError: error
    });

    this.logError(appError);
    return appError;
  }

  // Obter erros por contexto
  getErrorsByContext(context: string): AppError[] {
    return this.errorLog.filter(error => 
      error.details?.context === context
    );
  }

  // Limpar log de erros
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Obter estatísticas de erros
  getErrorStats(): { total: number; byCode: Record<string, number> } {
    const byCode: Record<string, number> = {};
    
    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      byCode
    };
  }
}

// Instância global
export const errorHandler = AppErrorHandler.getInstance();

// Função auxiliar para tratar erros em operações async
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    let appError: AppError;

    if (error?.code && error?.message) {
      // Erro do Supabase
      appError = errorHandler.handleSupabaseError(error, context);
    } else if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      // Erro de rede
      appError = errorHandler.handleNetworkError(error, context);
    } else {
      // Erro genérico
      appError = errorHandler.createError('UNKNOWN_ERROR', error?.message || 'Erro desconhecido', {
        context,
        originalError: error
      });
    }

    return { 
      success: false, 
      error: appError,
      data: fallback
    };
  }
}