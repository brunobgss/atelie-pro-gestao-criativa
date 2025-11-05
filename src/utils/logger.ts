// Logger utilitário para substituir console.log em produção
// Remove logs automaticamente em produção para melhor performance

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  // Log apenas em desenvolvimento
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // Info sempre loga (mas pode ser filtrado)
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  // Warn sempre loga (importante para monitoramento)
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  // Error sempre loga (crítico)
  error: (...args: unknown[]) => {
    console.error(...args);
    
    // Em produção, pode enviar para serviço de monitoramento
    if (isProduction && typeof window !== 'undefined') {
      // Aqui você pode adicionar integração com Sentry, LogRocket, etc.
      // Exemplo: sentry.captureException(args[0]);
    }
  },

  // Debug apenas em desenvolvimento
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  // Group logs (apenas em desenvolvimento)
  group: (label: string, collapsed = false) => {
    if (isDevelopment) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  // Table (apenas em desenvolvimento)
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

// Substituir console.log globalmente em produção (opcional)
if (isProduction && typeof window !== 'undefined') {
  // Manter apenas console.error e console.warn
  // console.log, console.info, console.debug serão silenciados
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = () => {}; // Silenciar em produção
  console.info = () => {}; // Silenciar em produção
  console.debug = () => {}; // Silenciar em produção

  // Restaurar em desenvolvimento (se necessário)
  if (isDevelopment) {
    console.log = originalLog;
    console.info = originalInfo;
    console.debug = originalDebug;
  }
}
