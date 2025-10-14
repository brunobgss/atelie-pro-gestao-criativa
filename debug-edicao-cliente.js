// Script para debug da edição de cliente
// Execute no console do navegador

console.clear();
console.log("🔍 Debug da edição de cliente ativado!");

// 1. Monitorar todas as requisições de edição
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('customers')) {
    console.log("🌐 Requisição para customers:", url);
    console.log("📦 Dados da requisição:", args[1]);
  }
  return originalFetch.apply(this, args);
};

// 2. Monitorar erros específicos
const originalError = console.error;
console.error = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('updateCustomer')) {
    console.log("🚨 ERRO NA EDIÇÃO DE CLIENTE:", args);
  }
  originalError.apply(console, args);
};

// 3. Verificar se há clientes na interface
setTimeout(() => {
  const clientCards = document.querySelectorAll('[data-client-id], .client-card, [class*="client"]');
  console.log(`📊 Elementos de cliente encontrados: ${clientCards.length}`);
  
  // Verificar se há botões de editar
  const editButtons = document.querySelectorAll('button[class*="edit"], button:has(svg)');
  console.log(`✏️ Botões de editar encontrados: ${editButtons.length}`);
  
  if (editButtons.length > 0) {
    console.log("✅ Interface carregada! Pode testar a edição.");
  } else {
    console.log("⚠️ Aguarde o carregamento da interface...");
  }
}, 3000);

// 4. Instruções para teste
console.log("📝 Para testar:");
console.log("1. Aguarde o carregamento completo");
console.log("2. Clique no ícone de editar (lápis)");
console.log("3. Modifique o nome");
console.log("4. Clique em 'Salvar'");
console.log("5. Monitore os logs abaixo");

console.log("✅ Debug ativado! Agora teste a edição.");
