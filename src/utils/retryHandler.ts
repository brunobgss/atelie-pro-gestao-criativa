// Sistema de retry e resiliência para operações críticas
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry em erros de rede, timeout e erros temporários do Supabase
    return (
      error?.message?.includes('timeout') ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.code === 'PGRST301' || // Supabase connection error
      error?.code === 'PGRST116' || // Row Level Security (temporário)
      error?.status >= 500 // Server errors
    );
  }
};

export class RetryHandler {
  private static instance: RetryHandler;
  private retryStats: Map<string, { attempts: number; successes: number; failures: number }> = new Map();

  static getInstance(): RetryHandler {
    if (!RetryHandler.instance) {
      RetryHandler.instance = new RetryHandler();
    }
    return RetryHandler.instance;
  }

  // Executar operação com retry
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    options: Partial<RetryOptions> = {}
  ): Promise<{ success: boolean; data?: T; error?: any; attempts: number }> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;
    let attempts = 0;

    // Inicializar estatísticas
    if (!this.retryStats.has(context)) {
      this.retryStats.set(context, { attempts: 0, successes: 0, failures: 0 });
    }

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      attempts = attempt;
      
      try {
        console.log(`🔄 [${context}] Tentativa ${attempt}/${config.maxAttempts}`);
        
        const data = await operation();
        
        // Sucesso
        const stats = this.retryStats.get(context)!;
        stats.attempts += attempt;
        stats.successes += 1;
        
        console.log(`✅ [${context}] Sucesso na tentativa ${attempt}`);
        return { success: true, data, attempts };
        
      } catch (error: any) {
        lastError = error;
        
        console.warn(`❌ [${context}] Falha na tentativa ${attempt}:`, error.message);
        
        // Verificar se deve tentar novamente
        if (attempt === config.maxAttempts || !config.retryCondition!(error)) {
          break;
        }
        
        // Calcular delay com backoff exponencial
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.log(`⏳ [${context}] Aguardando ${delay}ms antes da próxima tentativa...`);
        await this.sleep(delay);
      }
    }

    // Todas as tentativas falharam
    const stats = this.retryStats.get(context)!;
    stats.attempts += attempts;
    stats.failures += 1;
    
    console.error(`💥 [${context}] Falhou após ${attempts} tentativas`);
    return { success: false, error: lastError, attempts };
  }

  // Executar operação com retry e fallback
  async executeWithRetryAndFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    context: string,
    options: Partial<RetryOptions> = {}
  ): Promise<{ success: boolean; data?: T; error?: any; usedFallback: boolean }> {
    const result = await this.executeWithRetry(operation, context, options);
    
    if (result.success) {
      return { ...result, usedFallback: false };
    }

    // Tentar fallback
    try {
      console.log(`🔄 [${context}] Tentando fallback...`);
      const fallbackData = await fallback();
      console.log(`✅ [${context}] Fallback executado com sucesso`);
      return { success: true, data: fallbackData, usedFallback: true };
    } catch (fallbackError) {
      console.error(`💥 [${context}] Fallback também falhou:`, fallbackError);
      return { success: false, error: fallbackError, usedFallback: true };
    }
  }

  // Executar múltiplas operações em paralelo com retry
  async executeParallelWithRetry<T>(
    operations: Array<{ operation: () => Promise<T>; context: string }>,
    options: Partial<RetryOptions> = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: any; context: string }>> {
    const promises = operations.map(async ({ operation, context }) => {
      const result = await this.executeWithRetry(operation, context, options);
      return { ...result, context };
    });

    return Promise.all(promises);
  }

  // Executar operação com circuit breaker
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    context: string,
    failureThreshold: number = 5,
    timeout: number = 60000
  ): Promise<{ success: boolean; data?: T; error?: any; circuitOpen: boolean }> {
    const stats = this.retryStats.get(context) || { attempts: 0, successes: 0, failures: 0 };
    
    // Verificar se o circuit breaker está aberto
    if (stats.failures >= failureThreshold) {
      const lastFailureTime = Date.now() - (stats as any).lastFailureTime || 0;
      if (lastFailureTime < timeout) {
        console.warn(`🔴 [${context}] Circuit breaker aberto - operação bloqueada`);
        return { success: false, error: new Error('Circuit breaker open'), circuitOpen: true };
      } else {
        // Reset do circuit breaker
        stats.failures = 0;
        console.log(`🟢 [${context}] Circuit breaker resetado`);
      }
    }

    try {
      const data = await operation();
      stats.successes += 1;
      stats.failures = 0; // Reset failures on success
      return { success: true, data, circuitOpen: false };
    } catch (error) {
      stats.failures += 1;
      (stats as any).lastFailureTime = Date.now();
      return { success: false, error, circuitOpen: false };
    }
  }

  // Obter estatísticas de retry
  getRetryStats(): Record<string, { attempts: number; successes: number; failures: number; successRate: number }> {
    const result: Record<string, any> = {};
    
    this.retryStats.forEach((stats, context) => {
      result[context] = {
        ...stats,
        successRate: stats.attempts > 0 ? (stats.successes / stats.attempts) * 100 : 0
      };
    });
    
    return result;
  }

  // Limpar estatísticas
  clearStats(): void {
    this.retryStats.clear();
  }

  // Função auxiliar para sleep
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instância global
export const retryHandler = RetryHandler.getInstance();

// Função auxiliar para operações críticas
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  options?: Partial<RetryOptions>
): Promise<T> {
  const result = await retryHandler.executeWithRetry(operation, context, options);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}
