import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTrialData, saveTrialData, createNewTrial, clearTrialData } from "@/utils/trialPersistence";
import { Empresa } from "@/types/empresa";
import { setUserContext, clearUserContext } from "@/utils/errorTracking";

interface AuthContextType {
  user: User | null;
  empresa: Empresa | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshEmpresa: (forceClearCache?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    // Função para restaurar dados se necessário
    const restoreDataIfNeeded = (userId: string) => {
      if (!mounted) return;
      
      const trialData = getTrialData();
      if (!empresa && trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
        // Log apenas uma vez por sessão
        if (!(window as any).dataRestored) {
          console.log("🔄 Restaurando dados perdidos do localStorage");
          (window as any).dataRestored = true;
        }
        setEmpresa(trialData.empresaData);
      }
    };

    // Função otimizada para carregar empresa
    const loadEmpresa = async (userId: string) => {
      try {
        console.log("🔄 Carregando dados da empresa para usuário:", userId);
        
      const { data: userEmpresa, error } = await supabase
          .from("user_empresas")
          .select(`
            empresa_id,
            empresas (
              id,
              nome,
              email,
              telefone,
              responsavel,
              cpf_cnpj,
              country,
              trial_end_date,
              is_premium,
              tem_nota_fiscal,
              status,
              created_at,
              updated_at
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

        if (error) {
        console.error("❌ Erro ao carregar empresa:", error);
          return;
        }

      if (userEmpresa?.empresas && mounted) {
          console.log("✅ Dados da empresa carregados:", {
            nome: userEmpresa.empresas.nome,
            is_premium: userEmpresa.empresas.is_premium,
            tem_nota_fiscal: userEmpresa.empresas.tem_nota_fiscal,
            status: userEmpresa.empresas.status,
            trial_end_date: userEmpresa.empresas.trial_end_date
          });
          setEmpresa(userEmpresa.empresas as unknown as Empresa);
      } else {
        console.log("⚠️ Nenhuma empresa encontrada para o usuário");
      }
      } catch (error) {
        console.error("❌ Erro ao carregar empresa:", error);
      }
    };

    // Verificar sessão inicial - versão simplificada
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        // Configurar contexto do usuário no sistema de rastreamento
        setUserContext({
          id: session.user.id,
          email: session.user.email || undefined,
          username: session.user.email?.split('@')[0] || undefined,
        });
        
        // Carregar empresa de forma assíncrona
        loadEmpresa(session.user.id).finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
        restoreDataIfNeeded(session.user.id);
        
        // Verificar dados a cada 5 minutos para evitar perda
        intervalId = setInterval(() => {
          if (mounted && session?.user) {
            restoreDataIfNeeded(session.user.id);
          }
        }, 300000); // 5 minutos
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("🔄 Auth state change:", event, session?.user?.id);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Configurar contexto do usuário no sistema de rastreamento
          setUserContext({
            id: session.user.id,
            email: session.user.email || undefined,
            username: session.user.email?.split('@')[0] || undefined,
          });
          
          // Carregar empresa de forma assíncrona
          loadEmpresa(session.user.id).finally(() => {
            if (mounted) {
              setLoading(false);
            }
          });
          
          // Reiniciar verificação periódica
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => {
            if (mounted && session?.user) {
              restoreDataIfNeeded(session.user.id);
            }
          }, 300000); // 5 minutos
        } else {
          // Limpar contexto do usuário no sistema de rastreamento
          clearUserContext();
          
          setEmpresa(null);
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const fetchEmpresa = useCallback(async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 20000; // 20 segundos
    
    try {
      console.log("🔍 Buscando dados da empresa para usuário:", userId, retryCount > 0 ? `(tentativa ${retryCount + 1})` : "");
      
      // Criar promise com timeout
      const fetchPromise = supabase
        .from("user_empresas")
        .select(`
          empresa_id,
          empresas (
            id,
            nome,
            email,
            telefone,
            responsavel,
            cpf_cnpj,
            country,
            trial_end_date,
            is_premium,
            tem_nota_fiscal,
            status,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", userId)
        .maybeSingle();

      // Promise com timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: A requisição demorou mais de 20 segundos')), TIMEOUT_MS)
      );

      let result;
      try {
        result = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (timeoutError: any) {
        // Se for timeout e ainda houver tentativas, tentar novamente
        if (timeoutError.message?.includes('Timeout') && retryCount < MAX_RETRIES) {
          console.warn(`⏱️ Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo antes de retry
          return fetchEmpresa(userId, retryCount + 1);
        }
        throw timeoutError;
      }

      const { data, error } = result;

      if (error) {
        console.warn("⚠️ Erro ao buscar empresa do Supabase:", (error as any).message);
        
        // Se não for timeout e ainda houver tentativas, tentar novamente
        if (retryCount < MAX_RETRIES && !(error as any).message?.includes('Timeout')) {
          console.log(`🔄 Tentando novamente (tentativa ${retryCount + 2})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchEmpresa(userId, retryCount + 1);
        }
        
        // Tentar recuperar dados persistidos
        const trialData = getTrialData();
        
        if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
          // Usar dados persistidos apenas se não for temporário
          setEmpresa(trialData.empresaData);
          console.log("📱 Usando dados persistidos do localStorage (erro/timeout)");
          toast.info("Usando dados em cache devido a problemas de conexão. Clique em 'Atualizar Dados' para sincronizar.");
        } else {
          // Não criar dados temporários, manter estado atual
          console.log("⏳ Aguardando dados reais do Supabase...");
          // Não alterar o estado se já temos dados válidos
          if (!empresa) {
            setEmpresa(null);
          }
        }
        return;
      }

      if ((data as any)?.empresas) {
        setEmpresa((data as any).empresas as unknown as Empresa);
        // Salvar dados no localStorage para persistência
        saveTrialData({
          userId: userId,
          empresaData: (data as any).empresas as unknown as Empresa,
          trialEndDate: (data as any).empresas.trial_end_date || ''
        });
        // Log apenas na primeira vez ou em caso de mudança
        if (!empresa || empresa.id !== (data as any).empresas.id) {
          console.log("✅ Dados da empresa carregados:", (data as any).empresas.nome, "Trial end date:", (data as any).empresas.trial_end_date);
        }
      } else {
        // Tentar recuperar dados persistidos
        const trialData = getTrialData();
        
        if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
          // Usar dados persistidos
          setEmpresa(trialData.empresaData);
          console.log("Usando dados persistidos do localStorage (sem empresa)");
        } else {
          // NÃO criar novo trial - aguardar dados reais
          console.log("❌ Nenhum dado persistido válido - aguardando dados reais do Supabase");
          setEmpresa(null);
        }
      }
    } catch (error: unknown) {
      const errorMessage = (error as any)?.message || 'Erro desconhecido';
      
      // Log apenas uma vez por sessão para evitar spam
      if (!(window as any).authErrorLogged) {
        console.warn("❌ Erro ao buscar empresa:", errorMessage);
        (window as any).authErrorLogged = true;
      }
      
      // Se for timeout e ainda houver tentativas, tentar novamente
      if (errorMessage.includes('Timeout') && retryCount < MAX_RETRIES) {
        console.log(`⏱️ Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchEmpresa(userId, retryCount + 1);
      }
      
      // Tentar recuperar dados persistidos
      const trialData = getTrialData();
      
      if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
        // Usar dados persistidos
        setEmpresa(trialData.empresaData);
        // Log apenas uma vez por sessão
        if (!(window as any).localStorageUsed) {
          console.log("📱 Usando dados persistidos do localStorage (catch)");
          (window as any).localStorageUsed = true;
          if (errorMessage.includes('Timeout')) {
            toast.warning("Conexão lenta detectada. Usando dados em cache. Clique em 'Atualizar Dados' para sincronizar.");
          }
        }
      } else {
        // NÃO criar novo trial - manter estado atual
        if (!empresa) {
          setEmpresa(null);
        }
        if (errorMessage.includes('Timeout')) {
          toast.error("Timeout ao carregar dados. Verifique sua conexão e tente novamente.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  const refreshEmpresa = useCallback(async (forceClearCache = false) => {
    if (user?.id) {
      console.log("🔄 Recarregando dados da empresa...", forceClearCache ? "(forçando limpeza de cache)" : "");
      
      // Limpar cache local se solicitado
      if (forceClearCache) {
        clearTrialData();
        console.log("🧹 Cache local limpo");
      }
      
      const TIMEOUT_MS = 20000; // 20 segundos
      
      try {
        // Buscar dados atualizados do Supabase com timeout
        const fetchPromise = supabase
          .from("user_empresas")
          .select(`
            empresa_id,
            empresas (
              id,
              nome,
              email,
              telefone,
              responsavel,
              cpf_cnpj,
              country,
              trial_end_date,
              is_premium,
              tem_nota_fiscal,
              status,
              created_at,
              updated_at
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: A requisição demorou mais de 20 segundos')), TIMEOUT_MS)
        );

        let result;
        try {
          result = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (timeoutError: any) {
          if (timeoutError.message?.includes('Timeout')) {
            console.error("⏱️ Timeout ao recarregar empresa");
            toast.error("Timeout ao atualizar dados. Verifique sua conexão e tente novamente.");
            // Tentar usar dados persistidos se houver erro de timeout
            const trialData = getTrialData();
            if (trialData && trialData.userId === user.id) {
              console.log("⚠️ Usando dados persistidos devido ao timeout");
              setEmpresa(trialData.empresaData);
            }
            return;
          }
          throw timeoutError;
        }

        const { data: userEmpresa, error } = result;

        if (error) {
          console.error("❌ Erro ao recarregar empresa:", error);
          toast.error("Erro ao atualizar dados. Tente novamente.");
          // Tentar usar dados persistidos se houver erro
          const trialData = getTrialData();
          if (trialData && trialData.userId === user.id) {
            console.log("⚠️ Usando dados persistidos devido ao erro");
            setEmpresa(trialData.empresaData);
          }
          return;
        }

        if (userEmpresa?.empresas) {
          const empresaData = userEmpresa.empresas as unknown as Empresa;
          console.log("✅ Dados da empresa recarregados:", {
            nome: empresaData.nome,
            is_premium: empresaData.is_premium,
            tem_nota_fiscal: empresaData.tem_nota_fiscal,
            status: empresaData.status
          });
          
          // Atualizar estado
          setEmpresa(empresaData);
          
          // Salvar dados atualizados no localStorage
          saveTrialData({
            userId: user.id,
            empresaData: empresaData,
            trialEndDate: empresaData.trial_end_date || ''
          });
        } else {
          console.warn("⚠️ Nenhuma empresa encontrada para o usuário");
          setEmpresa(null);
        }
      } catch (error: any) {
        console.error("❌ Erro ao recarregar empresa:", error);
        const errorMessage = error?.message || 'Erro desconhecido';
        
        if (errorMessage.includes('Timeout')) {
          toast.error("Timeout ao atualizar dados. Verifique sua conexão e tente novamente.");
        } else {
          toast.error("Erro ao atualizar dados. Tente novamente.");
        }
        
        // Tentar usar dados persistidos se houver erro
        const trialData = getTrialData();
        if (trialData && trialData.userId === user.id) {
          console.log("⚠️ Usando dados persistidos devido ao erro");
          setEmpresa(trialData.empresaData);
        }
      }
    }
  }, [user?.id]);

  const signOut = async () => {
    try {
      // Limpar dados locais IMEDIATAMENTE
      setUser(null);
      setEmpresa(null);
      clearTrialData();
      
      // Limpar contexto do usuário no sistema de rastreamento
      clearUserContext();
      
      // Tentar logout no Supabase (sem aguardar)
      supabase.auth.signOut().catch(() => {
        // Ignorar erros de conectividade
        console.log("Logout no Supabase falhou, mas dados locais foram limpos");
      });
      
      toast.success("Logout realizado com sucesso");
      
      // Redirecionar para login após 1 segundo
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      
    } catch (error: unknown) {
      console.error("Erro inesperado no logout:", error);
      // Mesmo com erro, dados já foram limpos
      toast.success("Logout realizado");
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    empresa,
    loading,
    signOut,
    refreshEmpresa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
