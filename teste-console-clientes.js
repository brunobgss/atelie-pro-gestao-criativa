// Script para testar no console do navegador
// Cole este código no console da página de clientes

async function testarClientes() {
  console.log("🔍 Testando clientes no console...");
  
  try {
    // Usar o supabase já carregado na página
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://xthioxkfkxjvqcjqllfy.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanc7bGxmeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI4NzQ0NzQwLCJleHAiOjIwNDQzMjA3NDB9.8QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Verificar usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    console.log("👤 Usuário logado:", user?.id);
    
    // 2. Buscar empresa do usuário
    const { data: userEmpresa, error: userEmpresaError } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single();
    
    console.log("🏢 Empresa do usuário:", { userEmpresa, userEmpresaError });
    
    // 3. Buscar TODOS os clientes (sem filtro)
    const { data: todosClientes, error: todosClientesError } = await supabase
      .from("customers")
      .select("*");
    
    console.log("📋 TODOS os clientes:", { todosClientes, todosClientesError });
    
    // 4. Buscar clientes da empresa do usuário
    if (userEmpresa?.empresa_id) {
      const { data: clientesEmpresa, error: clientesEmpresaError } = await supabase
        .from("customers")
        .select("*")
        .eq("empresa_id", userEmpresa.empresa_id);
      
      console.log("📋 Clientes da sua empresa:", { clientesEmpresa, clientesEmpresaError });
    }
    
    // 5. Verificar se há clientes órfãos
    if (todosClientes && userEmpresa?.empresa_id) {
      const clientesOrfaos = todosClientes.filter(c => c.empresa_id !== userEmpresa.empresa_id);
      console.log("👻 Clientes de outras empresas:", clientesOrfaos);
      
      if (clientesOrfaos.length > 0) {
        console.log("🔄 Estes clientes podem ser seus! Vou tentar recuperá-los...");
        
        // Tentar associar à empresa do usuário
        for (const cliente of clientesOrfaos) {
          const { data: clienteAtualizado, error: updateError } = await supabase
            .from("customers")
            .update({ empresa_id: userEmpresa.empresa_id })
            .eq("id", cliente.id)
            .select("*");
          
          console.log(`✅ Cliente ${cliente.name} recuperado:`, { clienteAtualizado, updateError });
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

// Executar teste
testarClientes();




