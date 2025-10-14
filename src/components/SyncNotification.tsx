import { useEffect, useState } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface SyncNotificationProps {
  resource: string;
  operation: 'create' | 'update' | 'delete';
  show?: boolean;
}

export function SyncNotification({ resource, operation, show = true }: SyncNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (show) {
      const messages = {
        create: `${resource} criado com sucesso`,
        update: `${resource} atualizado com sucesso`,
        delete: `${resource} excluído com sucesso`
      };

      setMessage(messages[operation]);
      setIsVisible(true);

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [resource, operation, show]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (operation) {
      case 'create':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getColor = () => {
    switch (operation) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
      <Badge className={`${getColor()} px-3 py-2 flex items-center gap-2`}>
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
      </Badge>
    </div>
  );
}
