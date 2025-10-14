// Script para testar o cadastro completo
// Execute no console do navegador

console.log("🧪 Testando sistema de cadastro...");

// 1. Verificar se a página de cadastro está acessível
console.log("📍 Acesse: http://localhost:8082/cadastro");

// 2. Dados de teste para o cadastro
const dadosTeste = {
  empresa: "Ateliê Teste",
  nome: "João Silva",
  email: "joao.teste@exemplo.com",
  cpfCnpj: "12345678901",
  telefone: "11999999999",
  password: "123456789",
  confirmPassword: "123456789"
};

console.log("📝 Dados de teste para usar no cadastro:");
console.log(JSON.stringify(dadosTeste, null, 2));

// 3. Verificar se há erros no console durante o cadastro
console.log("🔍 Monitore o console durante o cadastro para ver:");
console.log("- ✅ 'Usuário criado: [ID]'");
console.log("- ✅ 'Empresa criada: [ID]'");
console.log("- ✅ 'Usuário vinculado à empresa com sucesso'");
console.log("- ✅ 'Cadastro realizado com sucesso!'");

// 4. Verificar se o redirecionamento funciona
console.log("🔄 Após o cadastro, deve redirecionar para /login");

// 5. Verificar se o login funciona
console.log("🔑 Após o cadastro, teste fazer login com os mesmos dados");

// 6. Verificar se os dados aparecem no dashboard
console.log("📊 Após o login, verifique se:");
console.log("- Nome da empresa aparece no sidebar");
console.log("- Trial de 7 dias aparece no banner");
console.log("- Não aparece 'Empresa Temporária'");

console.log("🎯 Execute o cadastro e me informe o resultado!");
