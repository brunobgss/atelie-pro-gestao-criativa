import { useQueryClient } from '@tanstack/react-query';
import { useSync } from '@/contexts/SyncContext';
import { toast } from 'sonner';

export function useSyncOperations() {
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();

  const syncAfterCreate = (resource: string, data?: unknown) => {
    console.log(`✅ ${resource} criado com sucesso, sincronizando...`);
    invalidateRelated(resource);
    queryClient.refetchQueries({ queryKey: [resource] });
    
    if (data) {
      // Adicionar o novo item ao cache imediatamente
      queryClient.setQueryData([resource], (oldData: unknown) => {
        if (Array.isArray(oldData)) {
          return [...oldData, data];
        }
        return oldData;
      });
    }
  };

  const syncAfterUpdate = (resource: string, id: string, data?: unknown) => {
    console.log(`✅ ${resource} atualizado com sucesso, sincronizando...`);
    invalidateRelated(resource);
    queryClient.refetchQueries({ queryKey: [resource] });
    
    if (data) {
      // Atualizar o item específico no cache
      queryClient.setQueryData([resource], (oldData: unknown) => {
        if (Array.isArray(oldData)) {
          return oldData.map((item: unknown) => 
            item.id === id ? { ...item, ...data } : item
          );
        }
        return oldData;
      });
    }
  };

  const syncAfterDelete = (resource: string, id: string) => {
    console.log(`✅ ${resource} excluído com sucesso, sincronizando...`);
    invalidateRelated(resource);
    queryClient.refetchQueries({ queryKey: [resource] });
    
    // Remover o item do cache imediatamente
    queryClient.setQueryData([resource], (oldData: unknown) => {
      if (Array.isArray(oldData)) {
        return oldData.filter((item: unknown) => item.id !== id);
      }
      return oldData;
    });
  };

  const syncWithToast = (operation: () => Promise<unknown>, successMessage: string, errorMessage: string = 'Erro na operação') => {
    return async () => {
      try {
        const result = await operation();
        if (result?.ok !== false) {
          toast.success(successMessage);
          return result;
        } else {
          toast.error(result?.error || errorMessage);
          return result;
        }
      } catch (error) {
        console.error('Erro na operação:', error);
        toast.error(errorMessage);
        return { ok: false, error: errorMessage };
      }
    };
  };

  return {
    syncAfterCreate,
    syncAfterUpdate,
    syncAfterDelete,
    syncWithToast
  };
}
