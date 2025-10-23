import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Country, CountryConfig, Language, Currency, COUNTRIES, PRICING, AVAILABLE_COUNTRIES } from '@/types/internationalization';
import { translations } from '@/locales/translations';
import { useAuth } from '@/components/AuthProvider';

interface InternationalizationContextType {
  currentCountry: Country;
  countryConfig: CountryConfig;
  language: Language;
  currency: Currency;
  setCountry: (country: Country) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  formatNumber: (number: number) => string;
  getPricing: () => { monthly: number; yearly: number; currency: string; symbol: string };
  refreshCountry: () => void;
}

const InternationalizationContext = createContext<InternationalizationContextType | undefined>(undefined);

interface InternationalizationProviderProps {
  children: ReactNode;
}

export function InternationalizationProvider({ children }: InternationalizationProviderProps) {
  const { empresa } = useAuth();
  const [currentCountry, setCurrentCountry] = useState<Country>('BR');

  console.log("🌍 InternationalizationProvider render - empresa:", empresa);

  // Usar país da empresa ou fallback para BR
  useEffect(() => {
    console.log("🌍 InternationalizationContext - empresa mudou:", empresa?.country, empresa?.id);
    
    if (empresa?.country && AVAILABLE_COUNTRIES.includes(empresa.country as Country)) {
      console.log("🌍 Mudando país para:", empresa.country);
      setCurrentCountry(empresa.country as Country);
    } else {
      console.log("🌍 País não encontrado, usando fallback");
      // Fallback: detectar por idioma do navegador
      detectCountryByLocation();
    }
  }, [empresa?.country, empresa?.id]);

  const detectCountryByLocation = () => {
    if (navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('pt-pt') || lang === 'pt') {
        setCurrentCountry('PT');
      } else if (lang.startsWith('en')) {
        setCurrentCountry('US');
      } else {
        setCurrentCountry('BR');
      }
    }
  };

  const refreshCountry = () => {
    // Forçar atualização do país baseado na empresa atual
    if (empresa?.country && AVAILABLE_COUNTRIES.includes(empresa.country as Country)) {
      setCurrentCountry(empresa.country as Country);
    }
  };

  const setCountry = async (country: Country) => {
    setCurrentCountry(country);
    
    // Atualizar no banco de dados
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("empresas")
        .update({ country })
        .eq("id", empresa?.id);
      
      if (error) {
        console.error("Erro ao atualizar país:", error);
      } else {
        console.log("País atualizado com sucesso:", country);
      }
    } catch (error) {
      console.error("Erro ao salvar país:", error);
    }
  };

  const countryConfig = COUNTRIES[currentCountry];
  const language = countryConfig.language;
  const currency = countryConfig.currency;

  const formatCurrency = (amount: number): string => {
    const { currencySymbol, numberFormat } = countryConfig;
    console.log("💰 formatCurrency chamada:", { amount, currencySymbol, currentCountry });
    
    const formattedNumber = amount.toLocaleString(language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...numberFormat
    });
    return `${currencySymbol} ${formattedNumber}`;
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatNumber = (number: number): string => {
    return number.toLocaleString(language, countryConfig.numberFormat);
  };

  const getPricing = () => {
    const pricing = PRICING[currentCountry];
    return {
      monthly: pricing.monthly,
      yearly: pricing.yearly,
      currency: pricing.currency,
      symbol: pricing.symbol
    };
  };

  const value: InternationalizationContextType = {
    currentCountry,
    countryConfig,
    language,
    currency,
    setCountry,
    formatCurrency,
    formatDate,
    formatNumber,
    getPricing,
    refreshCountry,
  };

  return (
    <InternationalizationContext.Provider value={value}>
      {children}
    </InternationalizationContext.Provider>
  );
}

export function useInternationalization() {
  const context = useContext(InternationalizationContext);
  if (context === undefined) {
    throw new Error('useInternationalization deve ser usado dentro de um InternationalizationProvider');
  }
  return context;
}

export function useTranslations() {
  const { language } = useInternationalization();
  return translations[language];
}
