import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SyncContextType {
  invalidateAll: () => void;
  invalidateResource: (resource: string) => void;
  invalidateRelated: (resource: string) => void;
  forceRefresh: (resource: string) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Refresh automático a cada 30 segundos para garantir dados atualizados
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Refresh automático dos dados...');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [queryClient]);

  const invalidateAll = () => {
    console.log('🔄 Invalidando todos os caches...');
    queryClient.invalidateQueries();
  };

  const invalidateResource = (resource: string) => {
    console.log(`🔄 Invalidando cache de: ${resource}`);
    queryClient.invalidateQueries({ queryKey: [resource] });
  };

  const invalidateRelated = (resource: string) => {
    console.log(`🔄 Invalidando recursos relacionados a: ${resource}`);
    
    // Mapeamento de recursos relacionados
    const relatedResources: Record<string, string[]> = {
      'customers': ['orders', 'quotes', 'receitas'],
      'orders': ['quotes', 'receitas', 'dashboard'],
      'quotes': ['orders', 'receitas', 'dashboard'],
      'inventory_items': ['quotes', 'orders'],
      'receitas': ['orders', 'dashboard'],
      'empresas': ['dashboard', 'minha-conta']
    };

    const related = relatedResources[resource] || [];
    
    // Invalidar o recurso principal
    queryClient.invalidateQueries({ queryKey: [resource] });
    
    // Invalidar recursos relacionados
    related.forEach(relatedResource => {
      queryClient.invalidateQueries({ queryKey: [relatedResource] });
    });
  };

  const forceRefresh = (resource: string) => {
    console.log(`🔄 Forçando refresh de: ${resource}`);
    queryClient.invalidateQueries({ queryKey: [resource] });
    queryClient.refetchQueries({ queryKey: [resource] });
  };

  return (
    <SyncContext.Provider value={{
      invalidateAll,
      invalidateResource,
      invalidateRelated,
      forceRefresh
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
