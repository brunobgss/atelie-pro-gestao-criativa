// Script para verificar clientes no banco de dados
// Execute no console do navegador

console.clear();
console.log("🔍 VERIFICANDO CLIENTES NO BANCO DE DADOS");
console.log("==========================================");

// Função para buscar clientes diretamente do Supabase
async function verificarClientesBanco() {
  try {
    console.log("🔍 Buscando clientes diretamente do banco...");
    
    // Importar supabase (assumindo que está disponível globalmente)
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://seu-projeto.supabase.co'; // Substitua pela sua URL
    const supabaseKey = 'sua-chave-publica'; // Substitua pela sua chave
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado no banco');
      return;
    }
    
    console.log(`✅ ${data.length} clientes encontrados no banco:`);
    data.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.name} - ${cliente.phone} - ${cliente.email || 'Sem email'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar clientes:', error);
  }
}

// Alternativa: Verificar se a query está funcionando na página
function verificarQueryAtual() {
  console.log("🔍 Verificando query atual da página...");
  
  // Verificar se há elementos de cliente na página
  const clientCards = document.querySelectorAll('[class*="card"], [class*="client"]');
  console.log(`📊 Cards de cliente na página: ${clientCards.length}`);
  
  // Verificar se há logs de busca no console
  console.log("📝 Verifique se aparecem logs como:");
  console.log("- '🔍 Buscando clientes do banco de dados...'");
  console.log("- '✅ X clientes encontrados no banco'");
  console.log("- 'Nenhum cliente encontrado no banco, usando dados de demonstração'");
}

// Executar verificações
verificarQueryAtual();

// Se quiser verificar diretamente o banco (descomente e ajuste as credenciais):
// verificarClientesBanco();

console.log("✅ Verificação concluída!");
console.log("💡 Se não aparecerem clientes, verifique:");
console.log("1. Se a tabela customers tem dados");
console.log("2. Se as políticas RLS estão corretas");
console.log("3. Se o usuário está autenticado");
