// Script para testar a correção do trial
// Execute no console do navegador após fazer login

console.log("🧪 Testando correção do trial...");

// Função para simular a lógica corrigida
function testarLógicaCorrigida(empresa) {
  console.log(`\n🔍 Testando empresa: ${empresa?.nome || 'Sem empresa'}`);
  
  // Verificar se empresa existe
  if (!empresa) {
    console.log("⏳ Aguardando carregamento dos dados da empresa...");
    return { isExpired: false, shouldWait: true, isLoading: true };
  }

  // Verificar se trial_end_date existe
  if (!empresa?.trial_end_date) {
    console.log("⏳ Trial end date não encontrado - aguardando carregamento completo...");
    return { isExpired: false, shouldWait: true, isLoading: true };
  }

  // Calcular se expirou
  const trialEnd = new Date(empresa.trial_end_date);
  const now = new Date();
  const isExpired = now > trialEnd;

  console.log("📅 Verificação:", {
    trialEndDate: empresa.trial_end_date,
    now: now.toISOString(),
    isExpired,
    diasRestantes: Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  });

  return { isExpired, shouldWait: false, isLoading: false };
}

// Testar diferentes cenários
const cenarios = [
  { nome: "Sem empresa", empresa: null },
  { nome: "Empresa sem trial_end_date", empresa: { id: "1", nome: "Teste", email: "test@test.com" } },
  { nome: "Empresa com trial válido", empresa: { 
    id: "2", 
    nome: "Teste 2", 
    email: "test2@test.com", 
    trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
  }},
  { nome: "Empresa com trial expirado", empresa: { 
    id: "3", 
    nome: "Teste 3", 
    email: "test3@test.com", 
    trial_end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() 
  }}
];

console.log("📊 Testando cenários:");
cenarios.forEach((cenario, index) => {
  console.log(`\n--- Cenário ${index + 1}: ${cenario.nome} ---`);
  const resultado = testarLógicaCorrigida(cenario.empresa);
  console.log("Resultado:", resultado);
});

console.log("\n✅ Teste concluído!");
console.log("💡 A lógica corrigida deve:");
console.log("1. Aguardar carregamento quando empresa é null");
console.log("2. Aguardar carregamento quando trial_end_date é null/undefined");
console.log("3. Só bloquear quando trial_end_date existe e está expirado");
console.log("4. Permitir acesso quando trial_end_date existe e não está expirado");