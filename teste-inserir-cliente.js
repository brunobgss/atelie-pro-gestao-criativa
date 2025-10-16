// Script para testar inserção de cliente
// Execute no console do navegador na página de clientes

async function testarInsercaoCliente() {
  console.log("🧪 Testando inserção de cliente...");
  
  try {
    // Importar supabase (assumindo que está disponível globalmente)
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://xthioxkfkxjvqcjqllfy.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGlveGtma3hqdnFjanc7bGxmeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI4NzQ0NzQwLCJleHAiOjIwNDQzMjA3NDB9.8QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Verificar usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    console.log("👤 Usuário logado:", user?.id);
    
    if (!user) {
      console.error("❌ Usuário não logado");
      return;
    }
    
    // 2. Buscar empresa do usuário
    const { data: userEmpresa, error: userEmpresaError } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single();
    
    console.log("🏢 Empresa do usuário:", { userEmpresa, userEmpresaError });
    
    if (userEmpresaError || !userEmpresa?.empresa_id) {
      console.error("❌ Usuário não tem empresa associada");
      return;
    }
    
    // 3. Verificar clientes existentes
    const { data: clientesExistentes, error: clientesError } = await supabase
      .from("customers")
      .select("*")
      .eq("empresa_id", userEmpresa.empresa_id);
    
    console.log("📋 Clientes existentes:", { clientesExistentes, clientesError });
    
    // 4. Inserir cliente de teste
    const { data: novoCliente, error: insertError } = await supabase
      .from("customers")
      .insert({
        empresa_id: userEmpresa.empresa_id,
        name: "Cliente Teste " + new Date().toISOString(),
        phone: "(11) 99999-9999",
        email: "teste@email.com"
      })
      .select("*")
      .single();
    
    console.log("➕ Cliente inserido:", { novoCliente, insertError });
    
    // 5. Verificar se o cliente foi inserido
    const { data: clientesAposInsert, error: clientesAposError } = await supabase
      .from("customers")
      .select("*")
      .eq("empresa_id", userEmpresa.empresa_id);
    
    console.log("📋 Clientes após inserção:", { clientesAposInsert, clientesAposError });
    
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

// Executar teste
testarInsercaoCliente();




