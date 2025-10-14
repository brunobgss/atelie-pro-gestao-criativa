// Script para forçar carregamento dos dados
// Execute no console do navegador

console.log("🔧 Forçando carregamento dos dados...");

// 1. Limpar localStorage
localStorage.removeItem('atelie-pro-trial-end-date');
localStorage.removeItem('atelie-pro-empresa-data');
localStorage.removeItem('atelie-pro-user-id');

console.log("🧹 localStorage limpo");

// 2. Recarregar página
console.log("🔄 Recarregando página...");
window.location.reload();
