import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className = "" }: SyncIndicatorProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Monitorar mudanças no cache
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') {
        setLastSync(new Date());
        setSyncStatus('success');
        
        // Resetar status após 2 segundos
        setTimeout(() => {
          setSyncStatus('idle');
        }, 2000);
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Detectar quando está sincronizando
  useEffect(() => {
    const interval = setInterval(() => {
      const isFetching = queryClient.isFetching() > 0;
      setIsSyncing(isFetching);
      
      if (isFetching) {
        setSyncStatus('syncing');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <CheckCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return 'Atualizado';
      case 'error':
        return 'Erro';
      default:
        return lastSync ? `Atualizado ${formatTime(lastSync)}` : 'Pronto';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}s atrás`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}min atrás`;
    } else {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1 text-xs ${className}`}
    >
      {getStatusIcon()}
      <span className="hidden sm:inline">{getStatusText()}</span>
    </Badge>
  );
}

