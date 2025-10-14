// Sistema de métricas de negócio e analytics
export interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  type: 'count' | 'revenue' | 'conversion' | 'performance' | 'user_behavior';
  context: string;
  timestamp: string;
  metadata?: unknown;
}

export interface MetricConfig {
  enableTracking: boolean;
  enableRealTime: boolean;
  enableAggregation: boolean;
  retentionDays: number;
}

export const DEFAULT_METRIC_CONFIG: MetricConfig = {
  enableTracking: true,
  enableRealTime: true,
  enableAggregation: true,
  retentionDays: 30
};

export class BusinessMetrics {
  private static instance: BusinessMetrics;
  private config: MetricConfig;
  private metrics: BusinessMetric[] = [];
  private aggregations: Map<string, any> = new Map();

  static getInstance(): BusinessMetrics {
    if (!BusinessMetrics.instance) {
      BusinessMetrics.instance = new BusinessMetrics();
    }
    return BusinessMetrics.instance;
  }

  constructor() {
    this.config = { ...DEFAULT_METRIC_CONFIG };
    this.startRealTimeTracking();
  }

  // Configurar métricas
  configure(config: Partial<MetricConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Registrar métrica
  recordMetric(
    name: string,
    value: number,
    type: BusinessMetric['type'],
    context: string,
    metadata?: unknown 
  ): void {
    if (!this.config.enableTracking) return;

    const metric: BusinessMetric = {
      id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      type,
      context,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.metrics.push(metric);

    // Agregação em tempo real
    if (this.config.enableRealTime) {
      this.updateAggregation(metric);
    }

    // Manter apenas métricas recentes
    this.cleanupOldMetrics();
  }

  // Métricas específicas de negócio
  recordOrderCreated(orderValue: number, customerType: string, context: string): void {
    this.recordMetric('orders_created', 1, 'count', context, { customerType });
    this.recordMetric('revenue_generated', orderValue, 'revenue', context, { customerType });
  }

  recordQuoteCreated(quoteValue: number, itemsCount: number, context: string): void {
    this.recordMetric('quotes_created', 1, 'count', context, { itemsCount });
    this.recordMetric('quote_value', quoteValue, 'revenue', context, { itemsCount });
  }

  recordQuoteApproved(quoteValue: number, context: string): void {
    this.recordMetric('quotes_approved', 1, 'count', context);
    this.recordMetric('conversion_revenue', quoteValue, 'revenue', context);
  }

  recordCustomerCreated(customerType: string, context: string): void {
    this.recordMetric('customers_created', 1, 'count', context, { customerType });
  }

  recordInventoryItemCreated(itemType: string, context: string): void {
    this.recordMetric('inventory_items_created', 1, 'count', context, { itemType });
  }

  recordUserAction(action: string, context: string, metadata?: unknown): void {
    this.recordMetric('user_actions', 1, 'user_behavior', context, { action, ...metadata });
  }

  recordPageView(page: string, context: string): void {
    this.recordMetric('page_views', 1, 'user_behavior', context, { page });
  }

  recordPerformanceMetric(operation: string, duration: number, context: string): void {
    this.recordMetric('operation_duration', duration, 'performance', context, { operation });
  }

  recordErrorMetric(errorType: string, context: string, metadata?: unknown): void {
    this.recordMetric('errors', 1, 'count', context, { errorType, ...metadata });
  }

  recordTrialEvent(eventType: 'started' | 'extended' | 'expired', context: string): void {
    this.recordMetric('trial_events', 1, 'count', context, { eventType });
  }

  recordSubscriptionEvent(eventType: 'created' | 'renewed' | 'cancelled', planType: string, context: string): void {
    this.recordMetric('subscription_events', 1, 'count', context, { eventType, planType });
  }

  // Agregações em tempo real
  private updateAggregation(metric: BusinessMetric): void {
    const key = `${metric.name}-${metric.type}`;
    const existing = this.aggregations.get(key) || {
      count: 0,
      total: 0,
      average: 0,
      min: Infinity,
      max: -Infinity,
      lastUpdated: new Date().toISOString()
    };

    existing.count += 1;
    existing.total += metric.value;
    existing.average = existing.total / existing.count;
    existing.min = Math.min(existing.min, metric.value);
    existing.max = Math.max(existing.max, metric.value);
    existing.lastUpdated = new Date().toISOString();

    this.aggregations.set(key, existing);
  }

  // Obter métricas por período
  getMetricsByPeriod(startDate: Date, endDate: Date): BusinessMetric[] {
    return this.metrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= startDate && metricDate <= endDate;
    });
  }

  // Obter métricas por tipo
  getMetricsByType(type: BusinessMetric['type']): BusinessMetric[] {
    return this.metrics.filter(metric => metric.type === type);
  }

  // Obter métricas por contexto
  getMetricsByContext(context: string): BusinessMetric[] {
    return this.metrics.filter(metric => metric.context === context);
  }

  // Obter métricas por nome
  getMetricsByName(name: string): BusinessMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  // Obter agregações
  getAggregations(): Map<string, any> {
    return new Map(this.aggregations);
  }

  // Obter agregação específica
  getAggregation(name: string, type: BusinessMetric['type']): any {
    return this.aggregations.get(`${name}-${type}`);
  }

  // Obter estatísticas de negócio
  getBusinessStats(): {
    totalOrders: number;
    totalRevenue: number;
    totalQuotes: number;
    totalCustomers: number;
    conversionRate: number;
    averageOrderValue: number;
    averageQuoteValue: number;
    topPages: Array<{ page: string; views: number }>;
    errorRate: number;
    performanceScore: number;
  } {
    const orders = this.getMetricsByName('orders_created');
    const revenue = this.getMetricsByName('revenue_generated');
    const quotes = this.getMetricsByName('quotes_created');
    const customers = this.getMetricsByName('customers_created');
    const pageViews = this.getMetricsByName('page_views');
    const errors = this.getMetricsByName('errors');
    const performance = this.getMetricsByName('operation_duration');

    const totalOrders = orders.reduce((sum, m) => sum + m.value, 0);
    const totalRevenue = revenue.reduce((sum, m) => sum + m.value, 0);
    const totalQuotes = quotes.reduce((sum, m) => sum + m.value, 0);
    const totalCustomers = customers.reduce((sum, m) => sum + m.value, 0);
    const totalPageViews = pageViews.reduce((sum, m) => sum + m.value, 0);
    const totalErrors = errors.reduce((sum, m) => sum + m.value, 0);

    // Calcular conversão (quotes aprovados / quotes criados)
    const approvedQuotes = this.getMetricsByName('quotes_approved');
    const conversionRate = totalQuotes > 0 ? (approvedQuotes.reduce((sum, m) => sum + m.value, 0) / totalQuotes) * 100 : 0;

    // Calcular valores médios
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageQuoteValue = totalQuotes > 0 ? this.getMetricsByName('quote_value').reduce((sum, m) => sum + m.value, 0) / totalQuotes : 0;

    // Top páginas
    const pageStats = new Map<string, number>();
    pageViews.forEach(metric => {
      const page = metric.metadata?.page || 'unknown';
      pageStats.set(page, (pageStats.get(page) || 0) + metric.value);
    });
    const topPages = Array.from(pageStats.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Taxa de erro
    const errorRate = totalPageViews > 0 ? (totalErrors / totalPageViews) * 100 : 0;

    // Score de performance (baseado na duração média das operações)
    const avgDuration = performance.length > 0 
      ? performance.reduce((sum, m) => sum + m.value, 0) / performance.length 
      : 0;
    const performanceScore = Math.max(0, 100 - (avgDuration / 10)); // 100 - (ms/10)

    return {
      totalOrders,
      totalRevenue,
      totalQuotes,
      totalCustomers,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      averageQuoteValue: Math.round(averageQuoteValue * 100) / 100,
      topPages,
      errorRate: Math.round(errorRate * 100) / 100,
      performanceScore: Math.round(performanceScore)
    };
  }

  // Obter métricas de hoje
  getTodayMetrics(): BusinessMetric[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getMetricsByPeriod(today, tomorrow);
  }

  // Obter métricas da semana
  getWeekMetrics(): BusinessMetric[] {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.getMetricsByPeriod(weekAgo, today);
  }

  // Obter métricas do mês
  getMonthMetrics(): BusinessMetric[] {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return this.getMetricsByPeriod(monthAgo, today);
  }

  // Iniciar tracking em tempo real
  private startRealTimeTracking(): void {
    if (!this.config.enableRealTime || typeof window === 'undefined') return;

    // Track page views
    this.recordPageView(window.location.pathname, 'NAVIGATION');

    // Track performance
    if (window.performance && window.performance.timing) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      this.recordPerformanceMetric('page_load', loadTime, 'PERFORMANCE');
    }

    // Track user interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.recordUserAction('click', 'USER_INTERACTION', {
          element: target.tagName,
          className: target.className,
          id: target.id
        });
      }
    });
  }

  // Limpar métricas antigas
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoff
    );
  }

  // Exportar métricas
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      aggregations: Object.fromEntries(this.aggregations),
      stats: this.getBusinessStats(),
      config: this.config
    }, null, 2);
  }

  // Limpar todas as métricas
  clearMetrics(): void {
    this.metrics = [];
    this.aggregations.clear();
  }
}

// Instância global
export const businessMetrics = BusinessMetrics.getInstance();

// Funções auxiliares
export const metrics = {
  record: (name: string, value: number, type: BusinessMetric['type'], context: string, metadata?: unknown) => 
    businessMetrics.recordMetric(name, value, type, context, metadata),
  orderCreated: (orderValue: number, customerType: string, context: string) => 
    businessMetrics.recordOrderCreated(orderValue, customerType, context),
  quoteCreated: (quoteValue: number, itemsCount: number, context: string) => 
    businessMetrics.recordQuoteCreated(quoteValue, itemsCount, context),
  quoteApproved: (quoteValue: number, context: string) => 
    businessMetrics.recordQuoteApproved(quoteValue, context),
  customerCreated: (customerType: string, context: string) => 
    businessMetrics.recordCustomerCreated(customerType, context),
  inventoryItemCreated: (itemType: string, context: string) => 
    businessMetrics.recordInventoryItemCreated(itemType, context),
  userAction: (action: string, context: string, metadata?: unknown) => 
    businessMetrics.recordUserAction(action, context, metadata),
  pageView: (page: string, context: string) => 
    businessMetrics.recordPageView(page, context),
  performance: (operation: string, duration: number, context: string) => 
    businessMetrics.recordPerformanceMetric(operation, duration, context),
  error: (errorType: string, context: string, metadata?: unknown) => 
    businessMetrics.recordErrorMetric(errorType, context, metadata),
  trialEvent: (eventType: 'started' | 'extended' | 'expired', context: string) => 
    businessMetrics.recordTrialEvent(eventType, context),
  subscriptionEvent: (eventType: 'created' | 'renewed' | 'cancelled', planType: string, context: string) => 
    businessMetrics.recordSubscriptionEvent(eventType, planType, context)
};
