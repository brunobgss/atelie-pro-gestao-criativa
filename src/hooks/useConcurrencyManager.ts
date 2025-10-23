import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ConcurrencyConflict {
  resource: string;
  lastModified: Date;
  conflictType: 'edit' | 'delete' | 'create';
  message: string;
}

export function useConcurrencyManager() {
  const queryClient = useQueryClient();
  const [conflicts, setConflicts] = useState<ConcurrencyConflict[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Detectar conflitos de concorrência
  const detectConflict = useCallback((
    resource: string,
    lastModified: Date,
    conflictType: 'edit' | 'delete' | 'create'
  ) => {
    const conflict: ConcurrencyConflict = {
      resource,
      lastModified,
      conflictType,
      message: `Conflito detectado em ${resource} - ${conflictType}`
    };

    setConflicts(prev => [...prev, conflict]);
    
    // Mostrar notificação para o usuário
    toast.warning(
      `Conflito detectado em ${resource}. Dados podem ter sido alterados por outro usuário.`,
      {
        duration: 5000,
        action: {
          label: 'Atualizar',
          onClick: () => resolveConflict(resource)
        }
      }
    );
  }, []);

  // Resolver conflito específico
  const resolveConflict = useCallback(async (resource: string) => {
    setIsResolving(true);
    
    try {
      console.log(`🔄 Resolvendo conflito em ${resource}...`);
      
      // Invalidar cache do recurso específico
      queryClient.invalidateQueries({ queryKey: [resource] });
      
      // Refetch dados frescos
      await queryClient.refetchQueries({ queryKey: [resource] });
      
      // Remover conflito da lista
      setConflicts(prev => prev.filter(c => c.resource !== resource));
      
      toast.success(`Conflito em ${resource} resolvido!`);
      
    } catch (error) {
      console.error('Erro ao resolver conflito:', error);
      toast.error('Erro ao resolver conflito');
    } finally {
      setIsResolving(false);
    }
  }, [queryClient]);

  // Resolver todos os conflitos
  const resolveAllConflicts = useCallback(async () => {
    setIsResolving(true);
    
    try {
      console.log('🔄 Resolvendo todos os conflitos...');
      
      // Invalidar todos os caches
      queryClient.invalidateQueries();
      
      // Refetch todos os dados
      await queryClient.refetchQueries();
      
      // Limpar lista de conflitos
      setConflicts([]);
      
      toast.success('Todos os conflitos foram resolvidos!');
      
    } catch (error) {
      console.error('Erro ao resolver conflitos:', error);
      toast.error('Erro ao resolver conflitos');
    } finally {
      setIsResolving(false);
    }
  }, [queryClient]);

  // Auto-resolver conflitos antigos (mais de 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const oldConflicts = conflicts.filter(
        conflict => now.getTime() - conflict.lastModified.getTime() > 5 * 60 * 1000
      );

      if (oldConflicts.length > 0) {
        console.log(`🔄 Auto-resolvendo ${oldConflicts.length} conflitos antigos...`);
        
        oldConflicts.forEach(conflict => {
          resolveConflict(conflict.resource);
        });
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [conflicts, resolveConflict]);

  // Verificar se há conflitos ativos
  const hasActiveConflicts = conflicts.length > 0;

  return {
    conflicts,
    hasActiveConflicts,
    isResolving,
    detectConflict,
    resolveConflict,
    resolveAllConflicts
  };
}

