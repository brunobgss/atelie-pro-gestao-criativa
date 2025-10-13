import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        console.warn("Erro ao buscar empresa, usando dados padrão:", error.message);
        
        // Verificar se já existe uma data de trial persistida no localStorage
        const STORAGE_KEY = 'atelie-pro-trial-end-date';
        const STORAGE_KEY_EMPRESA = 'atelie-pro-empresa-data';
        
        let trialEndDate: string;
        let empresaData: any = null;
        
        // Tentar recuperar dados persistidos
        const storedTrialDate = localStorage.getItem(STORAGE_KEY);
        const storedEmpresaData = localStorage.getItem(STORAGE_KEY_EMPRESA);
        
        if (storedTrialDate && storedEmpresaData) {
          // Usar dados persistidos
          trialEndDate = storedTrialDate;
          empresaData = JSON.parse(storedEmpresaData);
          // Usar dados persistidos do localStorage se disponível
        } else {
          // Primeira vez: criar trial de 7 dias e persistir
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          trialEndDate = trialEnd.toISOString();
          
          empresaData = {
            id: "temp-id",
            nome: "Empresa Temporária",
            email: "temp@empresa.com",
            telefone: "",
            responsavel: "Usuário",
            trial_end_date: trialEndDate
          };
          
          // Persistir no localStorage
          localStorage.setItem(STORAGE_KEY, trialEndDate);
          localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(empresaData));
          // Criar novo trial de 7 dias e persistir
        }
        
        setEmpresa(empresaData);
        return;
      }

      if (data?.empresas) {
        setEmpresa(data.empresas);
      } else {
        // Usar dados temporários em caso de erro
        const STORAGE_KEY = 'atelie-pro-trial-end-date';
        const STORAGE_KEY_EMPRESA = 'atelie-pro-empresa-data';
        
        let trialEndDate: string;
        let empresaData: any = null;
        
        // Tentar recuperar dados persistidos
        const storedTrialDate = localStorage.getItem(STORAGE_KEY);
        const storedEmpresaData = localStorage.getItem(STORAGE_KEY_EMPRESA);
        
        if (storedTrialDate && storedEmpresaData) {
          // Usar dados persistidos
          trialEndDate = storedTrialDate;
          empresaData = JSON.parse(storedEmpresaData);
          console.log("Usando dados persistidos do localStorage (sem empresa)");
        } else {
          // Primeira vez: criar trial de 7 dias e persistir
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          trialEndDate = trialEnd.toISOString();
          
          empresaData = {
            id: "temp-id",
            nome: "Empresa Temporária",
            email: "temp@empresa.com",
            telefone: "",
            responsavel: "Usuário",
            trial_end_date: trialEndDate
          };
          
          // Persistir no localStorage
          localStorage.setItem(STORAGE_KEY, trialEndDate);
          localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(empresaData));
          console.log("Criando novo trial de 7 dias e persistindo (sem empresa)");
        }
        
        setEmpresa(empresaData);
      }
    } catch (error: any) {
      console.warn("Erro ao buscar empresa, usando dados padrão:", error.message);
      
      // Usar dados temporários em caso de erro
      const STORAGE_KEY = 'atelie-pro-trial-end-date';
      const STORAGE_KEY_EMPRESA = 'atelie-pro-empresa-data';
      
      let trialEndDate: string;
      let empresaData: any = null;
      
      // Tentar recuperar dados persistidos
      const storedTrialDate = localStorage.getItem(STORAGE_KEY);
      const storedEmpresaData = localStorage.getItem(STORAGE_KEY_EMPRESA);
      
      if (storedTrialDate && storedEmpresaData) {
        // Usar dados persistidos
        trialEndDate = storedTrialDate;
        empresaData = JSON.parse(storedEmpresaData);
        // Usar dados persistidos do localStorage (catch)
      } else {
        // Primeira vez: criar trial de 7 dias e persistir
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        trialEndDate = trialEnd.toISOString();
        
        empresaData = {
          id: "temp-id",
          nome: "Empresa Temporária",
          email: "temp@empresa.com",
          telefone: "",
          responsavel: "Usuário",
          trial_end_date: trialEndDate
        };
        
        // Persistir no localStorage
        localStorage.setItem(STORAGE_KEY, trialEndDate);
        localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(empresaData));
        console.log("Criando novo trial de 7 dias e persistindo (catch)");
      }
      
      setEmpresa(empresaData);
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
