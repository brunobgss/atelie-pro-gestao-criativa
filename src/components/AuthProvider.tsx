import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTrialData, saveTrialData, createNewTrial, clearTrialData } from "@/utils/trialPersistence";
import { Empresa } from "@/types/empresa";

interface AuthContextType {
  user: User | null;
  empresa: Empresa | null;
  loading: boolean;
  signOut: () => Promise<void>;
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
        const { data: userEmpresa, error } = await supabase
          .from("user_empresas")
          .select(`
            empresa_id,
            empresas (
              id,
              nome,
              telefone,
              responsavel,
              cpf_cnpj,
              trial_end_date,
              is_premium,
              status,
              created_at,
              updated_at
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Erro ao carregar empresa:", error);
          return;
        }

        if (userEmpresa?.empresas && mounted) {
          setEmpresa(userEmpresa.empresas as unknown as Empresa);
        }
      } catch (error) {
        console.error("Erro ao carregar empresa:", error);
      }
    };

    // Verificar sessão inicial - versão simplificada
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
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
        
        setUser(session?.user ?? null);
        if (session?.user) {
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

  const fetchEmpresa = useCallback(async (userId: string) => {
    try {
      // Timeout aumentado para 15 segundos para melhor conectividade
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      const fetchPromise = supabase
        .from("user_empresas")
        .select(`
          empresa_id,
          empresas (
            id,
            nome,
            telefone,
            responsavel,
            cpf_cnpj,
            trial_end_date,
            created_at
          )
        `)
        .eq("user_id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as { data: unknown; error: unknown };

      if (error) {
        console.warn("⚠️ Erro ao buscar empresa do Supabase:", (error as any).message);
        
        // Tentar recuperar dados persistidos
        const trialData = getTrialData();
        
        if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
          // Usar dados persistidos apenas se não for temporário
          setEmpresa(trialData.empresaData);
          console.log("📱 Usando dados persistidos do localStorage (timeout)");
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
          console.log("✅ Dados da empresa carregados:", (data as any).empresas.nome);
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
      // Log apenas uma vez por sessão para evitar spam
      if (!(window as any).authErrorLogged) {
        console.warn("Erro ao buscar empresa, usando dados persistidos:", (error as any).message);
        (window as any).authErrorLogged = true;
      }
      
      // Tentar recuperar dados persistidos
      const trialData = getTrialData();
      
      if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
        // Usar dados persistidos
        setEmpresa(trialData.empresaData);
        // Log apenas uma vez por sessão
        if (!(window as any).localStorageUsed) {
          console.log("Usando dados persistidos do localStorage (catch)");
          (window as any).localStorageUsed = true;
        }
      } else {
        // NÃO criar novo trial - manter estado atual
        if (!empresa) {
          setEmpresa(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = async () => {
    try {
      // Limpar dados locais IMEDIATAMENTE
      setUser(null);
      setEmpresa(null);
      clearTrialData();
      
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
