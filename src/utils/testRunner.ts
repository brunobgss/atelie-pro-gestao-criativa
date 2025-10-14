// Sistema de testes automatizados para funcionalidades críticas
export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'integration' | 'e2e' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  function: () => Promise<TestResult>;
  timeout?: number;
  retries?: number;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  duration: number;
  error?: string;
  metadata?: unknown;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  timeout?: number;
  parallel?: boolean;
}

export class TestRunner {
  private static instance: TestRunner;
  private tests: Map<string, TestCase> = new Map();
  private results: TestResult[] = [];
  private isRunning: boolean = false;

  static getInstance(): TestRunner {
    if (!TestRunner.instance) {
      TestRunner.instance = new TestRunner();
    }
    return TestRunner.instance;
  }

  // Registrar teste
  registerTest(test: TestCase): void {
    this.tests.set(test.id, test);
  }

  // Registrar suite de testes
  registerTestSuite(suite: TestSuite): void {
    suite.tests.forEach(test => {
      this.tests.set(test.id, test);
    });
  }

  // Executar teste individual
  async runTest(testId: string): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Teste ${testId} não encontrado`);
    }

    return await this.executeTest(test);
  }

  // Executar todos os testes
  async runAllTests(): Promise<TestResult[]> {
    if (this.isRunning) {
      throw new Error('Testes já estão em execução');
    }

    this.isRunning = true;
    this.results = [];

    try {
      const testPromises = Array.from(this.tests.values()).map(test => 
        this.executeTest(test)
      );

      const results = await Promise.all(testPromises);
      this.results = results;

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  // Executar testes por categoria
  async runTestsByCategory(category: TestCase['category']): Promise<TestResult[]> {
    const tests = Array.from(this.tests.values()).filter(test => test.category === category);
    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await this.executeTest(test);
      results.push(result);
    }

    return results;
  }

  // Executar testes críticos
  async runCriticalTests(): Promise<TestResult[]> {
    const criticalTests = Array.from(this.tests.values()).filter(test => test.priority === 'critical');
    const results: TestResult[] = [];

    for (const test of criticalTests) {
      const result = await this.executeTest(test);
      results.push(result);
    }

    return results;
  }

  // Executar teste
  private async executeTest(test: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const timeout = test.timeout || 5000;
    const retries = test.retries || 0;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          test.function(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);

        const duration = Date.now() - startTime;
        const testResult: TestResult = {
          id: test.id,
          name: test.name,
          status: 'passed',
          duration,
          timestamp: new Date().toISOString(),
          metadata: result
        };

        this.results.push(testResult);
        return testResult;

      } catch (error: unknown) {
        lastError = error;
        
        if (attempt < retries) {
          console.log(`Tentativa ${attempt + 1} falhou para ${test.name}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s antes de tentar novamente
        }
      }
    }

    const duration = Date.now() - startTime;
    const testResult: TestResult = {
      id: test.id,
      name: test.name,
      status: lastError?.message === 'Timeout' ? 'timeout' : 'failed',
      duration,
      error: lastError?.message,
      timestamp: new Date().toISOString()
    };

    this.results.push(testResult);
    return testResult;
  }

  // Obter resultados
  getResults(): TestResult[] {
    return [...this.results];
  }

  // Obter resultados por status
  getResultsByStatus(status: TestResult['status']): TestResult[] {
    return this.results.filter(result => result.status === status);
  }

  // Obter estatísticas
  getStats(): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timeout: number;
    successRate: number;
    averageDuration: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const timeout = this.results.filter(r => r.status === 'timeout').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    const averageDuration = total > 0 
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / total 
      : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      timeout,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration)
    };
  }

  // Limpar resultados
  clearResults(): void {
    this.results = [];
  }

  // Obter testes registrados
  getRegisteredTests(): TestCase[] {
    return Array.from(this.tests.values());
  }
}

// Instância global
export const testRunner = TestRunner.getInstance();

// Testes específicos do app
export const appTests: TestCase[] = [
  {
    id: 'validation-email',
    name: 'Validação de Email',
    description: 'Testa validação de emails válidos e inválidos',
    category: 'unit',
    priority: 'high',
    function: async () => {
      const { validateEmail } = await import('./validators');
      
      // Teste email válido
      const validResult = validateEmail('test@example.com');
      if (!validResult.isValid) {
        throw new Error('Email válido foi rejeitado');
      }

      // Teste email inválido
      const invalidResult = validateEmail('invalid-email');
      if (invalidResult.isValid) {
        throw new Error('Email inválido foi aceito');
      }

      return { message: 'Validação de email funcionando corretamente' };
    }
  },
  {
    id: 'validation-cpf',
    name: 'Validação de CPF',
    description: 'Testa validação de CPF válido e inválido',
    category: 'unit',
    priority: 'high',
    function: async () => {
      const { validateCpfCnpj } = await import('./validators');
      
      // Teste CPF válido
      const validResult = validateCpfCnpj('11144477735');
      if (!validResult.isValid) {
        throw new Error('CPF válido foi rejeitado');
      }

      // Teste CPF inválido
      const invalidResult = validateCpfCnpj('12345678901');
      if (invalidResult.isValid) {
        throw new Error('CPF inválido foi aceito');
      }

      return { message: 'Validação de CPF funcionando corretamente' };
    }
  },
  {
    id: 'validation-phone',
    name: 'Validação de Telefone',
    description: 'Testa validação de telefones válidos e inválidos',
    category: 'unit',
    priority: 'high',
    function: async () => {
      const { validatePhone } = await import('./validators');
      
      // Teste telefone válido
      const validResult = validatePhone('11999999999');
      if (!validResult.isValid) {
        throw new Error('Telefone válido foi rejeitado');
      }

      // Teste telefone inválido
      const invalidResult = validatePhone('123');
      if (invalidResult.isValid) {
        throw new Error('Telefone inválido foi aceito');
      }

      return { message: 'Validação de telefone funcionando corretamente' };
    }
  },
  {
    id: 'error-handler',
    name: 'Sistema de Tratamento de Erros',
    description: 'Testa o sistema de tratamento de erros',
    category: 'unit',
    priority: 'critical',
    function: async () => {
      const { errorHandler } = await import('./errorHandler');
      
      // Teste erro de Supabase
      const supabaseError = errorHandler.handleSupabaseError(
        { code: '23505', message: 'Duplicate key' },
        'test'
      );
      
      if (supabaseError.code !== 'DUPLICATE_KEY') {
        throw new Error('Erro de Supabase não foi categorizado corretamente');
      }

      return { message: 'Sistema de tratamento de erros funcionando' };
    }
  },
  {
    id: 'performance-monitor',
    name: 'Monitor de Performance',
    description: 'Testa o sistema de monitoramento de performance',
    category: 'unit',
    priority: 'medium',
    function: async () => {
      const { performanceMonitor } = await import('./performanceMonitor');
      
      // Teste medição de performance
      const result = await performanceMonitor.measure(
        'test-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
        'test'
      );

      if (!result.success) {
        throw new Error('Medição de performance falhou');
      }

      return { message: 'Monitor de performance funcionando' };
    }
  },
  {
    id: 'business-metrics',
    name: 'Métricas de Negócio',
    description: 'Testa o sistema de métricas de negócio',
    category: 'unit',
    priority: 'medium',
    function: async () => {
      const { businessMetrics } = await import('./businessMetrics');
      
      // Teste registro de métrica
      businessMetrics.recordMetric('test_metric', 100, 'count', 'test');
      
      const stats = businessMetrics.getBusinessStats();
      if (typeof stats.totalOrders !== 'number') {
        throw new Error('Métricas de negócio não estão funcionando');
      }

      return { message: 'Métricas de negócio funcionando' };
    }
  },
  {
    id: 'alert-system',
    name: 'Sistema de Alertas',
    description: 'Testa o sistema de alertas',
    category: 'unit',
    priority: 'medium',
    function: async () => {
      const { alertSystem } = await import('./alertSystem');
      
      // Teste criação de alerta
      alertSystem.createAlert('info', 'Teste', 'Mensagem de teste', 'test');
      
      const alerts = alertSystem.getAlerts();
      if (alerts.length === 0) {
        throw new Error('Sistema de alertas não está funcionando');
      }

      return { message: 'Sistema de alertas funcionando' };
    }
  },
  {
    id: 'backup-manager',
    name: 'Sistema de Backup',
    description: 'Testa o sistema de backup',
    category: 'unit',
    priority: 'low',
    function: async () => {
      const { backupManager } = await import('./backupManager');
      
      // Teste criação de backup
      const result = await backupManager.createFullBackup();
      
      if (!result.success) {
        throw new Error('Sistema de backup falhou');
      }

      return { message: 'Sistema de backup funcionando' };
    }
  }
];

// Registrar testes do app
appTests.forEach(test => {
  testRunner.registerTest(test);
});

// Função auxiliar para executar testes críticos
export const runCriticalTests = () => testRunner.runCriticalTests();

// Função auxiliar para executar todos os testes
export const runAllTests = () => testRunner.runAllTests();

// Função auxiliar para executar testes por categoria
export const runTestsByCategory = (category: TestCase['category']) => 
  testRunner.runTestsByCategory(category);
