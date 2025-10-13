// Script para testar atualização de status de pedidos
// Cole este código no console do navegador (F12) para testar

console.log('🧪 Testando sistema de atualização de pedidos...');

// Simular atualização de status
const testUpdate = async () => {
  try {
    // Importar a função de atualização
    const { updateOrderStatus } = await import('/src/integrations/supabase/orders.ts');
    
    console.log('📝 Testando atualização do PED-001 para "Pronto"...');
    
    const result = await updateOrderStatus('PED-001', 'Pronto');
    
    if (result.ok) {
      console.log('✅ Atualização bem-sucedida!');
      console.log('📊 Dados atualizados:', result.data);
    } else {
      console.error('❌ Erro na atualização:', result.error);
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar teste
testUpdate();

console.log('🔍 Verificando localStorage...');
const mockUpdates = localStorage.getItem('atelie-pro-mock-updates');
console.log('💾 Updates salvos:', mockUpdates ? JSON.parse(mockUpdates) : 'Nenhum');


