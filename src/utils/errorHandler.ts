// Sistema centralizado de tratamento de erros
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
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
  createError(code: string, message: string, details?: unknown): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  // Tratar erro de Supabase
  handleSupabaseError(error: unknown, context: string): AppError {
    let code = 'SUPABASE_ERROR';
    let message = 'Erro no banco de dados';
    let errorObj: { code: string; message?: string } | undefined;

    if (error && typeof error === 'object' && 'code' in error) {
      errorObj = error as { code: string; message?: string };
      switch (errorObj.code) {
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
          code = `SUPABASE_${errorObj.code}`;
          message = errorObj.message || 'Erro desconhecido no banco de dados';
      }
    }

    const appError = this.createError(code, message, {
      context,
      originalError: error,
      supabaseCode: errorObj?.code,
      supabaseMessage: errorObj?.message
    });

    this.logError(appError);
    return appError;
  }

  // Tratar erro de rede
  handleNetworkError(error: unknown, context: string): AppError {
    let code = 'NETWORK_ERROR';
    let message = 'Erro de conexão';

    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string; status?: number };
      if (errorObj.message?.includes('timeout')) {
        code = 'TIMEOUT_ERROR';
        message = 'Tempo limite excedido';
      } else if (errorObj.message?.includes('Failed to fetch')) {
        code = 'CONNECTION_ERROR';
        message = 'Falha na conexão com o servidor';
      }
    }

    if (error && typeof error === 'object' && 'status' in error) {
      const errorObj = error as { status: number };
      code = `HTTP_${errorObj.status}`;
      message = `Erro HTTP ${errorObj.status}`;
    }

    const appError = this.createError(code, message, {
      context,
      originalError: error,
      status: error && typeof error === 'object' && 'status' in error ? (error as { status: number }).status : undefined
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
  handleAuthError(error: unknown, context: string): AppError {
    let code = 'AUTH_ERROR';
    let message = 'Erro de autenticação';

    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string };
      if (errorObj.message?.includes('Invalid login credentials')) {
        code = 'INVALID_CREDENTIALS';
        message = 'Credenciais inválidas';
      } else if (errorObj.message?.includes('Email not confirmed')) {
        code = 'EMAIL_NOT_CONFIRMED';
        message = 'Email não confirmado';
      } else if (errorObj.message?.includes('User not found')) {
        code = 'USER_NOT_FOUND';
        message = 'Usuário não encontrado';
      }
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
  } catch (error: unknown) {
    let appError: AppError;

    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      // Erro do Supabase
      appError = errorHandler.handleSupabaseError(error, context);
    } else if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string };
      if (errorObj.message?.includes('fetch') || errorObj.message?.includes('network')) {
        // Erro de rede
        appError = errorHandler.handleNetworkError(error, context);
      } else {
        // Erro genérico
        appError = errorHandler.createError('UNKNOWN_ERROR', errorObj.message || 'Erro desconhecido', {
          context,
          originalError: error
        });
      }
    } else {
      // Erro genérico
      appError = errorHandler.createError('UNKNOWN_ERROR', 'Erro desconhecido', {
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