// Utilitário para validação de premium no frontend e backend
import { supabase } from "@/integrations/supabase/client";

export interface PremiumStatus {
  isPremium: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  planType?: 'monthly' | 'yearly';
  expirationDate?: string;
}

// Cache para evitar consultas repetidas
let premiumCache: { data: PremiumStatus; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 segundos

// Verificar status de premium no frontend
export async function checkPremiumStatus(forceRefresh = false): Promise<PremiumStatus> {
  // Verificar cache primeiro (a menos que forceRefresh seja true)
  if (!forceRefresh && premiumCache && (Date.now() - premiumCache.timestamp) < CACHE_DURATION) {
    return premiumCache.data;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        isPremium: false,
        isTrialExpired: true,
        daysRemaining: 0
      };
    }

    // Primeiro buscar o empresa_id do usuário
    const { data: userEmpresa, error: userEmpresaError } = await supabase
      .from('user_empresas')
      .select('empresa_id')
      .eq('user_id', user.id)
      .single();

    if (userEmpresaError || !userEmpresa?.empresa_id) {
      const result = {
        isPremium: false,
        isTrialExpired: true,
        daysRemaining: 0
      };
      premiumCache = { data: result, timestamp: Date.now() };
      return result;
    }

    // Agora buscar os dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('is_premium, trial_end_date, id')
      .eq('id', userEmpresa.empresa_id)
      .single();

    if (empresaError || !empresa) {
      const result = {
        isPremium: false,
        isTrialExpired: true,
        daysRemaining: 0
      };
      premiumCache = { data: result, timestamp: Date.now() };
      return result;
    }

    // Se é premium, verificar se não expirou
    if (empresa.is_premium) {
      // Se tem trial_end_date, usar ele como data de expiração do premium
      // Caso contrário, calcular 30 dias a partir da data atual (fallback)
      let expirationDate: Date;
      
      if (empresa.trial_end_date) {
        expirationDate = new Date(empresa.trial_end_date);
      } else {
        // Fallback: calcular 30 dias a partir de agora
        expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
      }
      
      const now = new Date();
      const isExpired = now > expirationDate;
      
      if (isExpired) {
        // Premium expirado, desativar
        await supabase
          .from('empresas')
          .update({ is_premium: false, status: 'expired' })
          .eq('id', empresa.id);
        
        const result = {
          isPremium: false,
          isTrialExpired: true,
          daysRemaining: 0
        };
        premiumCache = { data: result, timestamp: Date.now() };
        return result;
      }

      const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const result = {
        isPremium: true,
        isTrialExpired: false,
        daysRemaining,
        planType: 'monthly', // Default para premium
        expirationDate: expirationDate.toISOString()
      };
      premiumCache = { data: result, timestamp: Date.now() };
      return result;
    }

    // Se não é premium, verificar trial
    if (empresa.trial_end_date) {
      const trialEnd = new Date(empresa.trial_end_date);
      const now = new Date();
      const isTrialExpired = now > trialEnd;
      const daysRemaining = isTrialExpired ? 0 : Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const result = {
        isPremium: false,
        isTrialExpired,
        daysRemaining
      };
      premiumCache = { data: result, timestamp: Date.now() };
      return result;
    }

    // Sem trial definido, considerar expirado
    const result = {
      isPremium: false,
      isTrialExpired: true,
      daysRemaining: 0
    };
    premiumCache = { data: result, timestamp: Date.now() };
    return result;

  } catch (error) {
    console.error('Erro ao verificar status premium:', error);
    const result = {
      isPremium: false,
      isTrialExpired: true,
      daysRemaining: 0
    };
    premiumCache = { data: result, timestamp: Date.now() };
    return result;
  }
}

// Verificar se usuário tem acesso a funcionalidade premium
export async function hasPremiumAccess(): Promise<boolean> {
  const status = await checkPremiumStatus();
  return status.isPremium || (!status.isTrialExpired && status.daysRemaining > 0);
}

// Verificar se trial expirou
export async function isTrialExpired(): Promise<boolean> {
  const status = await checkPremiumStatus();
  return status.isTrialExpired && !status.isPremium;
}

// Limpar cache de premium (útil após mudanças no status)
export function clearPremiumCache(): void {
  premiumCache = null;
  console.log('🗑️ Cache de premium limpo');
}

// Log de tentativa de acesso não autorizado
export function logUnauthorizedAccess(action: string, userId?: string) {
  console.warn('🚫 Tentativa de acesso não autorizado:', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  
  // Aqui você pode enviar para um serviço de monitoramento
  // como Sentry, LogRocket, etc.
}
