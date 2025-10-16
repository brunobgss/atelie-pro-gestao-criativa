// Script para recuperar clientes perdidos
// Execute no console do navegador na página de clientes

async function recuperarClientes() {
  console.log("🔍 Investigando clientes perdidos...");
  
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
    
    // 2. Buscar TODAS as empresas do usuário
    const { data: userEmpresas, error: userEmpresasError } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", user.id);
    
    console.log("🏢 Empresas do usuário:", { userEmpresas, userEmpresasError });
    
    if (userEmpresasError || !userEmpresas || userEmpresas.length === 0) {
      console.error("❌ Usuário não tem empresas associadas");
      return;
    }
    
    // 3. Buscar clientes de TODAS as empresas do usuário
    const empresaIds = userEmpresas.map(ue => ue.empresa_id);
    console.log("🔍 Buscando clientes das empresas:", empresaIds);
    
    const { data: todosClientes, error: todosClientesError } = await supabase
      .from("customers")
      .select("*")
      .in("empresa_id", empresaIds);
    
    console.log("📋 Clientes encontrados:", { todosClientes, todosClientesError });
    
    // 4. Buscar clientes sem filtro (para ver se existem)
    const { data: clientesSemFiltro, error: clientesSemFiltroError } = await supabase
      .from("customers")
      .select("id, name, empresa_id, created_at");
    
    console.log("📋 Todos os clientes (sem filtro):", { clientesSemFiltro, clientesSemFiltroError });
    
    // 5. Verificar se há clientes órfãos (sem empresa_id válida)
    if (clientesSemFiltro && clientesSemFiltro.length > 0) {
      const clientesOrfaos = clientesSemFiltro.filter(c => !empresaIds.includes(c.empresa_id));
      console.log("👻 Clientes órfãos (não pertencem às suas empresas):", clientesOrfaos);
      
      if (clientesOrfaos.length > 0) {
        console.log("🔄 Tentando recuperar clientes órfãos...");
        
        // Perguntar se quer recuperar
        const recuperar = confirm(`Encontrados ${clientesOrfaos.length} clientes que podem ser seus. Deseja recuperá-los?`);
        
        if (recuperar) {
          // Associar clientes órfãos à primeira empresa do usuário
          const primeiraEmpresa = empresaIds[0];
          console.log("🔄 Associando clientes à empresa:", primeiraEmpresa);
          
          for (const cliente of clientesOrfaos) {
            const { data: clienteAtualizado, error: updateError } = await supabase
              .from("customers")
              .update({ empresa_id: primeiraEmpresa })
              .eq("id", cliente.id)
              .select("*");
            
            console.log(`✅ Cliente ${cliente.name} recuperado:`, { clienteAtualizado, updateError });
          }
        }
      }
    }
    
    // 6. Verificar se há clientes com empresa_id NULL
    const { data: clientesNull, error: clientesNullError } = await supabase
      .from("customers")
      .select("*")
      .is("empresa_id", null);
    
    console.log("❓ Clientes com empresa_id NULL:", { clientesNull, clientesNullError });
    
    if (clientesNull && clientesNull.length > 0) {
      console.log("🔄 Tentando associar clientes NULL à sua empresa...");
      
      const primeiraEmpresa = empresaIds[0];
      for (const cliente of clientesNull) {
        const { data: clienteAtualizado, error: updateError } = await supabase
          .from("customers")
          .update({ empresa_id: primeiraEmpresa })
          .eq("id", cliente.id)
          .select("*");
        
        console.log(`✅ Cliente ${cliente.name} associado:`, { clienteAtualizado, updateError });
      }
    }
    
    // 7. Verificar resultado final
    const { data: clientesFinais, error: clientesFinaisError } = await supabase
      .from("customers")
      .select("*")
      .in("empresa_id", empresaIds);
    
    console.log("🎉 Clientes finais após recuperação:", { clientesFinais, clientesFinaisError });
    
  } catch (error) {
    console.error("❌ Erro na recuperação:", error);
  }
}

// Executar recuperação
recuperarClientes();




