/**
 * Utilitário para formatar mensagens de erro amigáveis ao usuário
 */

export const SUPPORT_WHATSAPP = "(35) 99849-8798";
export const SUPPORT_EMAIL = "suporte@ateliepro.online";
export const SUPPORT_WHATSAPP_LINK = "https://wa.me/5535998498798";

/**
 * Formata uma mensagem de erro de forma amigável ao usuário
 * @param mainMessage - Mensagem principal do erro
 * @param isTemporary - Se o erro é temporário (mostra mensagem de aguardar)
 * @returns Mensagem formatada com instruções e contato de suporte
 */
export function formatUserFriendlyError(
  mainMessage: string,
  isTemporary: boolean = true
): string {
  const waitMessage = isTemporary 
    ? "\n\n⏱️ Aguarde alguns minutos e tente novamente."
    : "";
  
  const supportMessage = `\n\n💬 Precisa de ajuda? Entre em contato conosco:\n📱 WhatsApp: ${SUPPORT_WHATSAPP}\n📧 Email: ${SUPPORT_EMAIL}`;
  
  return `${mainMessage}${waitMessage}${supportMessage}`;
}

/**
 * Mensagens de erro pré-formatadas para casos comuns
 */
export const ErrorMessages = {
  empresaNotFound: () => 
    formatUserFriendlyError("Ops! Não conseguimos identificar sua empresa no momento."),
  
  empresaNotAssociated: () => 
    formatUserFriendlyError("Ops! Sua conta não está associada a uma empresa.", false),
  
  permissionDenied: () => 
    formatUserFriendlyError("Ops! Parece que você não tem permissão para realizar esta ação."),
  
  authenticationError: () => 
    formatUserFriendlyError("Sua sessão expirou. Por favor, faça login novamente.", false),
  
  saveError: (item: string = "suas informações") => 
    formatUserFriendlyError(`Ops! Não conseguimos salvar ${item} no momento.`),
  
  databaseError: () => 
    formatUserFriendlyError("Ops! Ocorreu um erro ao acessar o banco de dados."),
  
  genericError: (action: string = "realizar esta ação") => 
    formatUserFriendlyError(`Ops! Não conseguimos ${action} no momento.`),
};

