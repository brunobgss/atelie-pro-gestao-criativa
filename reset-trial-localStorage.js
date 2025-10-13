// Script para limpar localStorage e resetar trial
// Cole este código no console do navegador (F12) para resetar o trial

// Limpar localStorage do trial
localStorage.removeItem('atelie-pro-trial-end-date');

// Criar nova data de trial de 7 dias
const newTrialEnd = new Date();
newTrialEnd.setDate(newTrialEnd.getDate() + 7);
localStorage.setItem('atelie-pro-trial-end-date', newTrialEnd.toISOString());

console.log('Trial resetado para 7 dias!');
console.log('Nova data de expiração:', newTrialEnd.toLocaleString('pt-BR'));

// Recarregar a página para aplicar as mudanças
window.location.reload();


