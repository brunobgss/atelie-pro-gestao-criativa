// Configurações do domínio
export const DOMAIN_CONFIG = {
  // Domínios
  MAIN_DOMAIN: 'ateliepro.online',           // Landing page / vendas
  APP_DOMAIN: 'app.ateliepro.online',        // Aplicação
  
  // URLs completas
  BASE_URL: 'https://app.ateliepro.online',
  LANDING_URL: 'https://ateliepro.online',
  
  // URLs específicas
  SUCCESS_URL: 'https://app.ateliepro.online/assinatura-sucesso',
  CALLBACK_URL: 'https://app.ateliepro.online/assinatura-sucesso',
  
  // Configurações do ASAAS
  ASAAS_CALLBACK_URL: 'https://app.ateliepro.online/assinatura-sucesso',
  ASAAS_SUCCESS_URL: 'https://app.ateliepro.online/assinatura-sucesso',
  
  // Webhook URL
  WEBHOOK_URL: 'https://app.ateliepro.online/api/webhooks/asaas'
};

// Função para obter URL baseada no ambiente
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Cliente (browser)
    return window.location.origin;
  }
  
  // Servidor
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : DOMAIN_CONFIG.BASE_URL;
}

// Função para obter URL de sucesso
export function getSuccessUrl() {
  return `${getBaseUrl()}/assinatura-sucesso`;
}

// Função para obter URL de callback
export function getCallbackUrl() {
  return `${getBaseUrl()}/assinatura-sucesso`;
}
