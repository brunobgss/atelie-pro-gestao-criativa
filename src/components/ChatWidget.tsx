import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

/**
 * Componente de Chat Widget para Suporte Proativo
 * 
 * Suporta:
 * - Tawk.to (gratuito, fácil configuração)
 * - Crisp (gratuito até 2 operadores)
 * 
 * Configuração via variáveis de ambiente:
 * - VITE_CHAT_PROVIDER: "tawk" ou "crisp"
 * - VITE_TAWK_PROPERTY_ID: ID do Tawk.to (se usar Tawk)
 * - VITE_TAWK_WIDGET_ID: Widget ID do Tawk.to (se usar Tawk)
 * - VITE_CRISP_WEBSITE_ID: Website ID do Crisp (se usar Crisp)
 */
export function ChatWidget() {
  const { empresa, user } = useAuth();

  // CSS para ocultar texto do Tawk.to
  useEffect(() => {
    const addTawkStyles = () => {
      // Verificar se o estilo já foi adicionado
      if (document.getElementById('tawk-custom-style')) {
        return;
      }

      const tawkStyle = document.createElement('style');
      tawkStyle.id = 'tawk-custom-style';
      tawkStyle.textContent = `
        /* Ocultar texto "We Are Here!" e outros textos do botão flutuante do Tawk.to */
        #tawkchat-container .tawk-button-text,
        #tawkchat-container .tawk-button-label,
        #tawkchat-container .tawk-button-text-wrapper,
        #tawkchat-container [class*="button-text"],
        #tawkchat-container [class*="button-label"],
        #tawkchat-container [class*="tawk-button-text"],
        #tawkchat-container span[class*="text"],
        #tawkchat-container div[class*="text"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Ocultar qualquer texto dentro do botão */
        #tawkchat-container .tawk-button > *:not(.tawk-button-icon):not(svg) {
          display: none !important;
        }
        
        /* Garantir que apenas o ícone fique visível */
        #tawkchat-container .tawk-button {
          min-width: 60px !important;
          width: 60px !important;
          height: 60px !important;
          padding: 0 !important;
        }
      `;
      
      document.head.appendChild(tawkStyle);
    };

    // Adicionar estilos imediatamente
    addTawkStyles();

    // Também adicionar quando o Tawk carregar (pode demorar um pouco)
    const interval = setInterval(() => {
      if (document.getElementById('tawkchat-container')) {
        addTawkStyles();
        clearInterval(interval);
      }
    }, 500);

    // Limpar intervalo após 10 segundos
    setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const provider = import.meta.env.VITE_CHAT_PROVIDER || "tawk";
    
    if (provider === "tawk") {
      // Tawk.to Integration
      const tawkPropertyId = import.meta.env.VITE_TAWK_PROPERTY_ID;
      const tawkWidgetId = import.meta.env.VITE_TAWK_WIDGET_ID;

      if (!tawkPropertyId || !tawkWidgetId) {
        console.warn("Tawk.to não configurado. Configure VITE_TAWK_PROPERTY_ID e VITE_TAWK_WIDGET_ID");
        return;
      }

      // Verificar se já foi carregado
      if (window.Tawk_API) {
        return;
      }

      // Carregar script do Tawk.to
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://embed.tawk.to/${tawkPropertyId}/${tawkWidgetId}`;
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");
      
      document.head.appendChild(script);

      // Configurar informações do usuário quando Tawk carregar
      script.onload = () => {
        // Aguardar Tawk carregar completamente
        if (window.Tawk_API) {
          window.Tawk_API.onLoad = () => {
            // Ocultar o texto "We Are Here!" do widget
            window.Tawk_API.hideWidget();
            setTimeout(() => {
              window.Tawk_API.showWidget();
            }, 100);

            // Personalizar o widget (remover texto padrão)
            const tawkWidget = document.querySelector('#tawkchat-container iframe');
            if (tawkWidget) {
              // Ocultar o texto do botão flutuante via CSS
              const style = document.createElement('style');
              style.textContent = `
                #tawkchat-container .tawk-button-text {
                  display: none !important;
                }
                #tawkchat-container .tawk-button-label {
                  display: none !important;
                }
                #tawkchat-container .tawk-button-text-wrapper {
                  display: none !important;
                }
              `;
              document.head.appendChild(style);
            }

            if (user && empresa) {
              window.Tawk_API.setAttributes({
                name: user.email || "Usuário",
                email: user.email || "",
                hash: "", // Hash para autenticação (opcional)
              }, (error: any) => {
                if (error) {
                  console.error("Erro ao configurar atributos do Tawk:", error);
                }
              });

              // Adicionar informações customizadas
              window.Tawk_API.addTags([`empresa-${empresa.id}`, empresa.is_premium ? "premium" : "trial"], (error: any) => {
                if (error) {
                  console.error("Erro ao adicionar tags do Tawk:", error);
                }
              });
            }
          };
        }
      };

      return () => {
        // Cleanup: remover script se necessário
        const existingScript = document.querySelector(`script[src*="tawk.to"]`);
        if (existingScript) {
          // Não removemos o script, apenas limpamos referências
        }
      };
    } else if (provider === "crisp") {
      // Crisp Integration
      const crispWebsiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;

      if (!crispWebsiteId) {
        console.warn("Crisp não configurado. Configure VITE_CRISP_WEBSITE_ID");
        return;
      }

      // Verificar se já foi carregado
      if (window.$crisp) {
        return;
      }

      // Carregar script do Crisp
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = crispWebsiteId;

      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      document.head.appendChild(script);

      // Configurar informações do usuário quando Crisp carregar
      script.onload = () => {
        if (window.$crisp && user && empresa) {
          window.$crisp.push(["set", "user:email", user.email || ""]);
          window.$crisp.push(["set", "user:nickname", user.email || "Usuário"]);
          window.$crisp.push(["set", "session:data", [
            ["empresa_id", empresa.id],
            ["empresa_nome", empresa.nome || ""],
            ["is_premium", empresa.is_premium ? "true" : "false"],
          ]]);
        }
      };

      return () => {
        // Cleanup
        const existingScript = document.querySelector(`script[src*="crisp.chat"]`);
        if (existingScript) {
          // Não removemos o script, apenas limpamos referências
        }
      };
    }
  }, [user, empresa]);

  // Este componente não renderiza nada visível
  // O widget de chat aparece automaticamente via script
  return null;
}

// Tipos para TypeScript
declare global {
  interface Window {
    Tawk_API?: {
      setAttributes: (attributes: { name?: string; email?: string; hash?: string }, callback?: (error: any) => void) => void;
      addTags: (tags: string[], callback?: (error: any) => void) => void;
      showWidget: () => void;
      hideWidget: () => void;
      toggleVisibility: () => void;
      maximize: () => void;
      minimize: () => void;
      onLoad: (callback: () => void) => void;
    };
    $crisp?: any[];
    CRISP_WEBSITE_ID?: string;
  }
}


