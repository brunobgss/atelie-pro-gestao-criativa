// Script para recuperar clientes usando o Supabase já carregado na página
// Cole este código no console da página de clientes

async function recuperarClientesPagina() {
  console.log("🔍 Recuperando clientes usando Supabase da página...");
  
  try {
    // Usar o supabase já carregado na página (não criar nova instância)
    // Assumindo que o supabase está disponível globalmente
    if (typeof window.supabase === 'undefined') {
      console.error("❌ Supabase não encontrado na página. Tente recarregar a página.");
      return;
    }
    
    const supabase = window.supabase;
    
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
    
    console.log("🏢 Sua empresa:", { userEmpresa, userEmpresaError });
    
    if (userEmpresaError || !userEmpresa?.empresa_id) {
      console.error("❌ Usuário não tem empresa associada");
      return;
    }
    
    // 3. Buscar TODOS os clientes (sem filtro) - usando RPC se necessário
    const { data: todosClientes, error: todosClientesError } = await supabase
      .from("customers")
      .select("*");
    
    console.log("📋 TODOS os clientes encontrados:", todosClientes);
    
    if (!todosClientes || todosClientes.length === 0) {
      console.log("❌ Nenhum cliente encontrado no banco");
      return;
    }
    
    // 4. Verificar se há clientes órfãos
    const clientesOrfaos = todosClientes.filter(c => c.empresa_id !== userEmpresa.empresa_id);
    console.log("👻 Clientes órfãos encontrados:", clientesOrfaos);
    
    if (clientesOrfaos.length === 0) {
      console.log("✅ Todos os clientes já estão na sua empresa");
      return;
    }
    
    // 5. Mover clientes órfãos para sua empresa
    console.log(`🔄 Movendo ${clientesOrfaos.length} clientes para sua empresa...`);
    
    let sucessos = 0;
    let erros = 0;
    
    for (const cliente of clientesOrfaos) {
      try {
        const { data: clienteAtualizado, error: updateError } = await supabase
          .from("customers")
          .update({ empresa_id: userEmpresa.empresa_id })
          .eq("id", cliente.id)
          .select("*");
        
        if (updateError) {
          console.error(`❌ Erro ao mover cliente ${cliente.name}:`, updateError);
          erros++;
        } else {
          console.log(`✅ Cliente ${cliente.name} movido com sucesso!`);
          sucessos++;
        }
      } catch (error) {
        console.error(`❌ Erro ao mover cliente ${cliente.name}:`, error);
        erros++;
      }
    }
    
    console.log(`🎉 Recuperação concluída: ${sucessos} sucessos, ${erros} erros`);
    
    // 6. Verificar resultado final
    const { data: clientesFinais, error: clientesFinaisError } = await supabase
      .from("customers")
      .select("*")
      .eq("empresa_id", userEmpresa.empresa_id);
    
    console.log("📋 Clientes finais na sua empresa:", { clientesFinais, clientesFinaisError });
    
    if (clientesFinais && clientesFinais.length > 0) {
      console.log("🎉 SUCESSO! Seus clientes foram recuperados!");
      console.log("🔄 Recarregue a página para ver os clientes");
    }
    
  } catch (error) {
    console.error("❌ Erro na recuperação:", error);
  }
}

// Executar recuperação
recuperarClientesPagina();




