import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConcurrencyManager } from '@/hooks/useConcurrencyManager';

export function ConcurrencyAlert() {
  const { conflicts, hasActiveConflicts, isResolving, resolveConflict, resolveAllConflicts } = useConcurrencyManager();

  if (!hasActiveConflicts) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Conflitos de Concorrência Detectados
              </span>
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                {conflicts.length}
              </Badge>
            </div>
            
            <div className="text-sm space-y-1">
              {conflicts.slice(0, 3).map((conflict, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-orange-700">
                    {conflict.resource} - {conflict.conflictType}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => resolveConflict(conflict.resource)}
                    disabled={isResolving}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {conflicts.length > 3 && (
                <div className="text-orange-600 text-xs">
                  +{conflicts.length - 3} mais conflitos...
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={resolveAllConflicts}
                disabled={isResolving}
                className="flex-1"
              >
                {isResolving ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Resolver Todos
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

