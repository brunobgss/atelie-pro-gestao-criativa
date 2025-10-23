export type Country = 'BR' | 'PT' | 'US' | 'ES' | 'FR' | 'IT' | 'DE';

export type Language = 'pt-BR' | 'pt-PT' | 'en' | 'es' | 'fr' | 'it' | 'de';

export type Currency = 'BRL' | 'EUR' | 'USD';

export interface CountryConfig {
  code: Country;
  name: string;
  flag: string;
  language: Language;
  currency: Currency;
  timezone: string;
  currencySymbol: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

export interface PricingConfig {
  monthly: number;
  yearly: number;
  currency: Currency;
  symbol: string;
}

export const COUNTRIES: Record<Country, CountryConfig> = {
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    language: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    currencySymbol: 'R$',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: '.'
    }
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    language: 'pt-PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    currencySymbol: '€',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: ' '
    }
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    language: 'en',
    currency: 'USD',
    timezone: 'America/New_York',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: {
      decimal: '.',
      thousands: ','
    }
  },
  ES: {
    code: 'ES',
    name: 'Espanha',
    flag: '🇪🇸',
    language: 'es',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    currencySymbol: '€',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: '.'
    }
  },
  FR: {
    code: 'FR',
    name: 'França',
    flag: '🇫🇷',
    language: 'fr',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    currencySymbol: '€',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: ' '
    }
  },
  IT: {
    code: 'IT',
    name: 'Itália',
    flag: '🇮🇹',
    language: 'it',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    currencySymbol: '€',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: '.'
    }
  },
  DE: {
    code: 'DE',
    name: 'Alemanha',
    flag: '🇩🇪',
    language: 'de',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    currencySymbol: '€',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: {
      decimal: ',',
      thousands: '.'
    }
  }
};

// Configurações de preços por país
export const PRICING: Record<Country, PricingConfig> = {
  BR: {
    monthly: 39.00,
    yearly: 390.00,
    currency: 'BRL',
    symbol: 'R$'
  },
  PT: {
    monthly: 35.00,
    yearly: 350.00,
    currency: 'EUR',
    symbol: '€'
  },
  US: {
    monthly: 39.00,
    yearly: 390.00,
    currency: 'USD',
    symbol: '$'
  },
  ES: {
    monthly: 35.00,
    yearly: 350.00,
    currency: 'EUR',
    symbol: '€'
  },
  FR: {
    monthly: 35.00,
    yearly: 350.00,
    currency: 'EUR',
    symbol: '€'
  },
  IT: {
    monthly: 35.00,
    yearly: 350.00,
    currency: 'EUR',
    symbol: '€'
  },
  DE: {
    monthly: 35.00,
    yearly: 350.00,
    currency: 'EUR',
    symbol: '€'
  }
};

// Países disponíveis para seleção (foco em BR, PT e US)
export const AVAILABLE_COUNTRIES: Country[] = ['BR', 'PT', 'US'];
