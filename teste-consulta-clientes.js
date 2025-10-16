// Script para testar consulta de clientes
// Execute no console do navegador na página de clientes

async function testarConsultaClientes() {
  console.log("🧪 Testando consulta de clientes...");
  
  try {
    // Usar o supabase já carregado na página
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
    
    // 3. Testar consulta direta (sem filtro de empresa)
    console.log("🔍 Testando consulta sem filtro...");
    const { data: todosClientes, error: todosClientesError } = await supabase
      .from("customers")
      .select("*");
    
    console.log("📋 Todos os clientes (sem filtro):", { todosClientes, todosClientesError });
    
    // 4. Testar consulta com filtro de empresa
    console.log("🔍 Testando consulta com filtro de empresa...");
    const { data: clientesFiltrados, error: clientesFiltradosError } = await supabase
      .from("customers")
      .select("*")
      .eq("empresa_id", userEmpresa.empresa_id);
    
    console.log("📋 Clientes filtrados por empresa:", { clientesFiltrados, clientesFiltradosError });
    
    // 5. Verificar se há clientes de outras empresas
    console.log("🔍 Verificando clientes de outras empresas...");
    const { data: outrosClientes, error: outrosClientesError } = await supabase
      .from("customers")
      .select("id, name, empresa_id")
      .neq("empresa_id", userEmpresa.empresa_id);
    
    console.log("📋 Clientes de outras empresas:", { outrosClientes, outrosClientesError });
    
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

// Executar teste
testarConsultaClientes();




