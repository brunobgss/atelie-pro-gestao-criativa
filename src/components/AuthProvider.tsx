import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTrialData, saveTrialData, createNewTrial, clearTrialData } from "@/utils/trialPersistence";

interface Empresa {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  responsavel?: string;
  cpf_cnpj?: string;
  trial_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

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
        if (!window.dataRestored) {
          console.log("🔄 Restaurando dados perdidos do localStorage");
          window.dataRestored = true;
        }
        setEmpresa(trialData.empresaData);
      }
    };

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmpresa(session.user.id);
        
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
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchEmpresa(session.user.id);
          
          // Reiniciar verificação periódica
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => {
            if (mounted && session?.user) {
              restoreDataIfNeeded(session.user.id);
            }
          }, 15000);
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
  }, [empresa, fetchEmpresa]);

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
            email,
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
        console.warn("⚠️ Erro ao buscar empresa do Supabase:", error.message);
        
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

      if (data?.empresas) {
        setEmpresa(data.empresas);
        // Salvar dados no localStorage para persistência
        saveTrialData({
          userId: userId,
          empresaData: data.empresas,
          trialEndDate: data.empresas.trial_end_date || ''
        });
        // Log apenas na primeira vez ou em caso de mudança
        if (!empresa || empresa.id !== data.empresas.id) {
          console.log("✅ Dados da empresa carregados:", data.empresas.nome);
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
      if (!window.authErrorLogged) {
        console.warn("Erro ao buscar empresa, usando dados persistidos:", error.message);
        window.authErrorLogged = true;
      }
      
      // Tentar recuperar dados persistidos
      const trialData = getTrialData();
      
      if (trialData && trialData.userId === userId && trialData.empresaData.nome !== "Empresa Temporária") {
        // Usar dados persistidos
        setEmpresa(trialData.empresaData);
        // Log apenas uma vez por sessão
        if (!window.localStorageUsed) {
          console.log("Usando dados persistidos do localStorage (catch)");
          window.localStorageUsed = true;
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
  }, [empresa]);

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
