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

  // Refresh automático inteligente - apenas quando necessário
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Função para refresh inteligente
    const smartRefresh = () => {
      // Verificar se há usuários ativos (evitar refresh desnecessário)
      const isUserActive = document.visibilityState === 'visible' && 
                          document.hasFocus();
      
      if (!isUserActive) {
        console.log('🔄 Usuário inativo - pulando refresh automático');
        return;
      }
      
      console.log('🔄 Refresh automático inteligente dos dados...');
      
      // Invalidar apenas queries críticas
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['receitas'] });
      queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas_receber'] });
      
      // Refetch apenas se necessário (não forçar sempre)
      const staleQueries = queryClient.getQueriesData({ stale: true });
      if (staleQueries.length > 0) {
        console.log(`🔄 Refazendo ${staleQueries.length} queries obsoletas`);
        queryClient.refetchQueries({ stale: true });
      }
    };
    
    // Refresh a cada 30 segundos (reduzido de 10s)
    intervalId = setInterval(smartRefresh, 30000);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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
      'empresas': ['dashboard', 'minha-conta'],
      'products': ['quotes', 'orders', 'catalogo'],
      'medidas': ['customers', 'orders', 'quotes'],
      // Novas páginas - Fase 1
      'fornecedores': ['contas_pagar', 'pedidos_compra'],
      'contas_pagar': ['dashboard'], // Fluxo de caixa será atualizado automaticamente via queryKey ["contas_pagar", "fluxo", ...]
      'contas_receber': ['dashboard'], // Fluxo de caixa será atualizado automaticamente via queryKey ["contas_receber", "fluxo", ...]
      'pedidos_compra': ['fornecedores', 'products', 'inventory_items'],
      'movimentacoes_estoque': ['products', 'variacoes', 'inventory_items'],
      'variacoes': ['products', 'movimentacoes_estoque'],
      'fluxo_caixa': [] // Fluxo de caixa é apenas leitura, não precisa invalidar outros
    };

    const related = relatedResources[resource] || [];
    
    // Invalidar o recurso principal (incluindo queries que começam com ele)
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === resource;
      }
    });
    
    // Invalidar recursos relacionados (incluindo queries que começam com eles)
    related.forEach(relatedResource => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === relatedResource;
        }
      });
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
