// Error boundary global para capturar erros não tratados
import React from 'react';
import { toast } from 'sonner';

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  
  private constructor() {
    this.setupGlobalErrorHandlers();
  }
  
  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }
  
  private setupGlobalErrorHandlers(): void {
    // Capturar erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      console.error('Erro JavaScript não tratado:', event.error);
      this.handleError(event.error, 'JavaScript Error');
    });
    
    // Capturar promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promise rejeitada não tratada:', event.reason);
      this.handleError(event.reason, 'Unhandled Promise Rejection');
    });
  }
  
  private handleError(error: any, type: string): void {
    // Não mostrar toast para erros de rede ou timeout
    if (this.isNetworkError(error)) {
      return;
    }
    
    // Mostrar toast apenas para erros críticos
    if (this.isCriticalError(error)) {
      toast.error('Ocorreu um erro inesperado. Recarregue a página se o problema persistir.');
    }
  }
  
  private isNetworkError(error: any): boolean {
    const networkErrors = [
      'NetworkError',
      'Failed to fetch',
      'timeout',
      'Connection refused',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ];
    
    const errorMessage = error?.message || error?.toString() || '';
    return networkErrors.some(networkError => 
      errorMessage.toLowerCase().includes(networkError.toLowerCase())
    );
  }
  
  private isCriticalError(error: any): boolean {
    const criticalErrors = [
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'RangeError'
    ];
    
    const errorName = error?.name || '';
    return criticalErrors.includes(errorName);
  }
}

// Inicializar o handler global
GlobalErrorHandler.getInstance();


