// Sistema de monitoramento de performance
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  context: string;
  metadata?: unknown;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  slowOperations: PerformanceMetric[];
  fastOperations: PerformanceMetric[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private slowThreshold: number = 1000; // 1 segundo
  private fastThreshold: number = 100; // 100ms

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Medir performance de uma operação
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    context: string,
    metadata?: unknown 
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, context, { ...metadata, success: true });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, context, { 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  // Medir performance síncrona
  measureSync<T>(
    name: string,
    operation: () => T,
    context: string,
    metadata?: unknown 
  ): T {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, context, { ...metadata, success: true });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, context, { 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  // Registrar métrica
  private recordMetric(name: string, duration: number, context: string, metadata?: unknown): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      context,
      metadata
    };

    this.metrics.push(metric);

    // Manter apenas as métricas mais recentes
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log de performance
    if (duration > this.slowThreshold) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`, { context, metadata });
    } else if (duration < this.fastThreshold) {
      console.log(`⚡ Fast operation: ${name} took ${duration.toFixed(2)}ms`, { context, metadata });
    }
  }

  // Obter estatísticas por contexto
  getStatsByContext(context: string): PerformanceStats {
    const contextMetrics = this.metrics.filter(m => m.context === context);
    return this.calculateStats(contextMetrics);
  }

  // Obter estatísticas por operação
  getStatsByOperation(name: string): PerformanceStats {
    const operationMetrics = this.metrics.filter(m => m.name === name);
    return this.calculateStats(operationMetrics);
  }

  // Obter estatísticas gerais
  getOverallStats(): PerformanceStats {
    return this.calculateStats(this.metrics);
  }

  // Calcular estatísticas
  private calculateStats(metrics: PerformanceMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        slowOperations: [],
        fastOperations: []
      };
    }

    const durations = metrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const slowOperations = metrics
      .filter(m => m.duration > this.slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const fastOperations = metrics
      .filter(m => m.duration < this.fastThreshold)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 10);

    return {
      totalOperations: metrics.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      minDuration: Math.round(minDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
      slowOperations,
      fastOperations
    };
  }

  // Obter operações mais lentas
  getSlowestOperations(count: number = 10): PerformanceMetric[] {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  // Obter operações mais rápidas
  getFastestOperations(count: number = 10): PerformanceMetric[] {
    return this.metrics
      .sort((a, b) => a.duration - b.duration)
      .slice(0, count);
  }

  // Obter métricas por período
  getMetricsByPeriod(startDate: Date, endDate: Date): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= startDate && metricDate <= endDate;
    });
  }

  // Obter métricas recentes
  getRecentMetrics(count: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  // Detectar gargalos
  detectBottlenecks(): {
    slowContexts: Array<{ context: string; averageDuration: number; count: number }>;
    slowOperations: Array<{ name: string; averageDuration: number; count: number }>;
    recommendations: string[];
  } {
    const contextStats = new Map<string, { totalDuration: number; count: number }>();
    const operationStats = new Map<string, { totalDuration: number; count: number }>();

    this.metrics.forEach(metric => {
      // Context stats
      const contextData = contextStats.get(metric.context) || { totalDuration: 0, count: 0 };
      contextData.totalDuration += metric.duration;
      contextData.count += 1;
      contextStats.set(metric.context, contextData);

      // Operation stats
      const operationData = operationStats.get(metric.name) || { totalDuration: 0, count: 0 };
      operationData.totalDuration += metric.duration;
      operationData.count += 1;
      operationStats.set(metric.name, operationData);
    });

    const slowContexts = Array.from(contextStats.entries())
      .map(([context, data]) => ({
        context,
        averageDuration: data.totalDuration / data.count,
        count: data.count
      }))
      .filter(item => item.averageDuration > this.slowThreshold)
      .sort((a, b) => b.averageDuration - a.averageDuration);

    const slowOperations = Array.from(operationStats.entries())
      .map(([name, data]) => ({
        name,
        averageDuration: data.totalDuration / data.count,
        count: data.count
      }))
      .filter(item => item.averageDuration > this.slowThreshold)
      .sort((a, b) => b.averageDuration - a.averageDuration);

    const recommendations: string[] = [];
    
    if (slowContexts.length > 0) {
      recommendations.push(`Considerar otimização para contextos: ${slowContexts.map(c => c.context).join(', ')}`);
    }
    
    if (slowOperations.length > 0) {
      recommendations.push(`Considerar otimização para operações: ${slowOperations.map(o => o.name).join(', ')}`);
    }

    if (this.metrics.length > 100) {
      const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
      if (avgDuration > 500) {
        recommendations.push('Performance geral pode ser melhorada - considere otimizações globais');
      }
    }

    return {
      slowContexts,
      slowOperations,
      recommendations
    };
  }

  // Limpar métricas
  clearMetrics(): void {
    this.metrics = [];
  }

  // Exportar métricas
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  // Configurar thresholds
  setThresholds(slow: number, fast: number): void {
    this.slowThreshold = slow;
    this.fastThreshold = fast;
  }
}

// Instância global
export const performanceMonitor = PerformanceMonitor.getInstance();

// Decorator para medir performance automaticamente
export function measurePerformance(name: string, context: string, metadata?: unknown) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return performanceMonitor.measure(name, () => method.apply(this, args), context, metadata);
    };

    return descriptor;
  };
}

// Função auxiliar para medir performance
export async function measure<T>(
  name: string,
  operation: () => Promise<T>,
  context: string,
  metadata?: unknown 
): Promise<T> {
  return performanceMonitor.measure(name, operation, context, metadata);
}

// Função auxiliar para medir performance síncrona
export function measureSync<T>(
  name: string,
  operation: () => T,
  context: string,
  metadata?: unknown 
): T {
  return performanceMonitor.measureSync(name, operation, context, metadata);
}
