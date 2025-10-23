// Script para testar se o fix do trial está funcionando
// Execute no console do navegador

console.log("🧪 Testando fix do trial...");

// Simular dados de empresa sem trial_end_date
const empresaSemTrial = {
  id: "test-id",
  nome: "Empresa Teste",
  email: "teste@empresa.com",
  // trial_end_date: undefined - simula o problema
};

// Simular dados de empresa com trial válido
const empresaComTrial = {
  id: "test-id-2", 
  nome: "Empresa Teste 2",
  email: "teste2@empresa.com",
  trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias no futuro
};

// Simular dados de empresa com trial expirado
const empresaTrialExpirado = {
  id: "test-id-3",
  nome: "Empresa Teste 3", 
  email: "teste3@empresa.com",
  trial_end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 dia no passado
};

console.log("📊 Dados de teste:");
console.log("1. Empresa sem trial_end_date:", empresaSemTrial);
console.log("2. Empresa com trial válido:", empresaComTrial);
console.log("3. Empresa com trial expirado:", empresaTrialExpirado);

// Testar a lógica corrigida
function testarTrialLogic(empresa) {
  console.log(`\n🔍 Testando empresa: ${empresa.nome}`);
  
  // Lógica corrigida: aguardar carregamento se não há trial_end_date
  if (!empresa?.trial_end_date) {
    console.log("⏳ Trial end date não encontrado - aguardando carregamento completo...");
    return { isExpired: false, shouldWait: true };
  }

  const trialEnd = new Date(empresa.trial_end_date);
  const now = new Date();
  const isExpired = now > trialEnd;

  console.log("📅 Verificação:", {
    trialEndDate: empresa.trial_end_date,
    now: now.toISOString(),
    isExpired
  });

  return { isExpired, shouldWait: false };
}

// Executar testes
const resultado1 = testarTrialLogic(empresaSemTrial);
const resultado2 = testarTrialLogic(empresaComTrial);
const resultado3 = testarTrialLogic(empresaTrialExpirado);

console.log("\n📋 Resultados:");
console.log("1. Sem trial_end_date:", resultado1);
console.log("2. Trial válido:", resultado2);
console.log("3. Trial expirado:", resultado3);

console.log("\n✅ Teste concluído! Verifique se a lógica está funcionando corretamente.");