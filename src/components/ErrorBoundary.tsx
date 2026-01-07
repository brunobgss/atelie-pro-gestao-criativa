import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureError } from '@/utils/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ignorar erros de removeChild que são não-críticos e geralmente causados
    // por problemas de timing durante navegação/desmontagem de componentes
    if (error.message?.includes('removeChild') || 
        error.message?.includes('Failed to execute \'removeChild\'')) {
      console.warn('Erro de removeChild ignorado (não-crítico):', error.message);
      // Não capturar nem exibir erro para o usuário neste caso
      return;
    }
    
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Capturar erro no sistema de rastreamento
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });
    
    // Log do erro para monitoramento local (fallback)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const errorLog = {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        // Armazenar último erro (útil para debug)
        const existingErrors = JSON.parse(
          localStorage.getItem('app_errors') || '[]'
        );
        existingErrors.unshift(errorLog);
        
        // Manter apenas os últimos 5 erros
        if (existingErrors.length > 5) {
          existingErrors.pop();
        }
        
        localStorage.setItem('app_errors', JSON.stringify(existingErrors));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm border-red-200/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Ops! Algo deu errado
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Detalhes do erro:
              </p>
              <p className="text-sm text-red-700 font-mono break-all">
                {error.message || 'Erro desconhecido'}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onReset}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </Button>
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Voltar para o início
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && errorInfo && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                Detalhes técnicos (apenas em desenvolvimento)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

