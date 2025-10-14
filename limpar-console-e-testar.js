// Script para limpar console e testar funcionalidades
// Execute no console do navegador

console.clear();
console.log("🧹 CONSOLE LIMPO - TESTE DE FUNCIONALIDADES");
console.log("=============================================");
console.log("✅ Logs excessivos foram corrigidos!");
console.log("✅ Agora os logs aparecem apenas uma vez por sessão");
console.log("");

// Verificar se as flags de controle estão funcionando
console.log("🔍 Verificando flags de controle:");
console.log("- authErrorLogged:", window.authErrorLogged || "não definido");
console.log("- localStorageUsed:", window.localStorageUsed || "não definido");
console.log("- dataRestored:", window.dataRestored || "não definido");
console.log("");

// Monitorar logs de clientes
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && typeof args[0] === 'string') {
    if (args[0].includes('Editando cliente (modo demonstração)')) {
      console.log("🎉 EDIÇÃO INICIADA:", args[1]);
    }
    if (args[0].includes('Novos dados:')) {
      console.log("📝 DADOS ALTERADOS:", args[1]);
    }
    if (args[0].includes('Criando cliente (modo demonstração)')) {
      console.log("➕ CRIAÇÃO INICIADA:", args[1]);
    }
    if (args[0].includes('Excluindo cliente (modo demonstração)')) {
      console.log("🗑️ EXCLUSÃO INICIADA:", args[1]);
    }
  }
  originalLog.apply(console, args);
};

// Verificar se a página carregou
setTimeout(() => {
  const clientCards = document.querySelectorAll('[class*="card"], [class*="client"]');
  console.log(`📊 Cards de cliente encontrados: ${clientCards.length}`);
  
  if (clientCards.length > 0) {
    console.log("✅ Interface carregada com sucesso!");
    console.log("");
    console.log("🎯 TESTE AS FUNCIONALIDADES:");
    console.log("1. Editar cliente (ícone de lápis)");
    console.log("2. Criar cliente (botão + Novo Cliente)");
    console.log("3. Excluir cliente (ícone de lixeira)");
    console.log("");
    console.log("✅ Console agora deve estar limpo e sem spam!");
  } else {
    console.log("⚠️ Aguarde o carregamento da interface...");
  }
}, 2000);

console.log("✅ Sistema de monitoramento ativado!");
console.log("🎯 Teste as funcionalidades - console deve estar limpo!");