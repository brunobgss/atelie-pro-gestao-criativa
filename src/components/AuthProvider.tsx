import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmpresa(session.user.id);
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
        } else {
          setEmpresa(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchEmpresa = async (userId: string) => {
    try {
      // Timeout reduzido para 3 segundos para melhor performance
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
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
            created_at
          )
        `)
        .eq("user_id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.warn("Erro ao buscar empresa, usando dados persistidos:", error.message);
        
        // Tentar recuperar dados persistidos
        const trialData = getTrialData();
        
        if (trialData && trialData.userId === userId) {
          // Usar dados persistidos
          setEmpresa(trialData.empresaData);
          console.log("Usando dados persistidos do localStorage");
        } else {
          // Criar novo trial
          const newTrialData = createNewTrial(userId);
          setEmpresa(newTrialData.empresaData);
          console.log("Criando novo trial de 7 dias");
        }
        return;
      }

      if (data?.empresas) {
        setEmpresa(data.empresas);
      } else {
        // Tentar recuperar dados persistidos
        const trialData = getTrialData();
        
        if (trialData && trialData.userId === userId) {
          // Usar dados persistidos
          setEmpresa(trialData.empresaData);
          console.log("Usando dados persistidos do localStorage (sem empresa)");
        } else {
          // Criar novo trial
          const newTrialData = createNewTrial(userId);
          setEmpresa(newTrialData.empresaData);
          console.log("Criando novo trial de 7 dias (sem empresa)");
        }
      }
    } catch (error: any) {
      console.warn("Erro ao buscar empresa, usando dados persistidos:", error.message);
      
      // Tentar recuperar dados persistidos
      const trialData = getTrialData();
      
      if (trialData && trialData.userId === userId) {
        // Usar dados persistidos
        setEmpresa(trialData.empresaData);
        console.log("Usando dados persistidos do localStorage (catch)");
      } else {
        // Criar novo trial
        const newTrialData = createNewTrial(userId);
        setEmpresa(newTrialData.empresaData);
        console.log("Criando novo trial de 7 dias (catch)");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setEmpresa(null);
      toast.success("Logout realizado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
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
