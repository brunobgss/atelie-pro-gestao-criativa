import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Sistema de rastreamento de erros é inicializado automaticamente
// Veja: src/utils/errorTracking.ts

// Desabilitar tradução automática do Google Tradutor para evitar conflitos com React
// O Google Tradutor modifica o DOM e pode causar erros de removeChild
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.setAttribute('lang', 'pt-BR');
  
  // Adicionar meta tag se não existir
  if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
  
  // Detectar se o Google Tradutor está ativo e avisar
  const checkGoogleTranslate = () => {
    const isTranslated = document.documentElement.classList.contains('translated-ltr') || 
                         document.documentElement.classList.contains('translated-rtl') ||
                         document.querySelector('script[src*="translate.googleapis.com"]') !== null;
    
    if (isTranslated) {
      console.warn('⚠️ Google Tradutor detectado! Isso pode causar problemas com o React. Por favor, desative a tradução automática.');
    }
  };
  
  // Verificar após um pequeno delay para garantir que o tradutor já carregou
  setTimeout(checkGoogleTranslate, 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
