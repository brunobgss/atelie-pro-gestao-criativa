// Script para testar trial expirado
// Execute no console do navegador

console.log("🧪 Testando sistema de trial...");

// 1. Verificar dados atuais do localStorage
const trialData = localStorage.getItem('atelie-pro-trial-end-date');
const empresaData = localStorage.getItem('atelie-pro-empresa-data');
const userId = localStorage.getItem('atelie-pro-user-id');

console.log("📱 Dados atuais do localStorage:");
console.log("Trial End Date:", trialData);
console.log("Empresa Data:", empresaData);
console.log("User ID:", userId);

// 2. Simular trial expirado (para teste)
if (trialData) {
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1); // Ontem
  
  localStorage.setItem('atelie-pro-trial-end-date', expiredDate.toISOString());
  console.log("⚠️ Trial simulado como expirado:", expiredDate.toISOString());
  
  // Recarregar página para testar
  console.log("🔄 Recarregando página para testar proteção...");
  setTimeout(() => {
    window.location.reload();
  }, 2000);
} else {
  console.log("❌ Nenhum trial encontrado no localStorage");
}

// 3. Função para restaurar trial válido (se necessário)
window.restoreTrial = function() {
  const validDate = new Date();
  validDate.setDate(validDate.getDate() + 7); // 7 dias a partir de agora
  
  localStorage.setItem('atelie-pro-trial-end-date', validDate.toISOString());
  console.log("✅ Trial restaurado:", validDate.toISOString());
  window.location.reload();
};

console.log("💡 Use window.restoreTrial() para restaurar trial válido se necessário");
