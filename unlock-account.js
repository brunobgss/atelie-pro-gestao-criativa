// Script para desbloquear conta
// Execute no console do navegador

console.log("🔓 Desbloqueando conta...");

// 1. Limpar todo o localStorage
localStorage.clear();
console.log("🧹 localStorage limpo");

// 2. Limpar sessionStorage
sessionStorage.clear();
console.log("🧹 sessionStorage limpo");

// 3. Forçar reload sem cache
console.log("🔄 Recarregando página sem cache...");
window.location.reload(true);
