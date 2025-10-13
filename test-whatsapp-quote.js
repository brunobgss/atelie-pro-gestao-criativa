// Script para testar o envio de WhatsApp com produtos do orçamento
// Cole este script no console do navegador na página do Ateliê Pro

console.log("=== TESTE DE ENVIO WHATSAPP COM PRODUTOS ===");

// Simular a função getQuoteByCode com dados mock
function getMockQuoteByCode(code) {
  const mockQuotes = {
    "ORC-001": {
      quote: {
        id: "mock-1",
        code: "ORC-001",
        customer_name: "Roberto Alves",
        customer_phone: "(11) 99999-1111",
        date: "2025-01-09",
        observations: "Camisetas bordadas para empresa",
      },
      items: [
        { id: "i1", quote_id: "mock-1", description: "Camiseta bordada - Logo empresa", quantity: 20, value: 25 },
        { id: "i2", quote_id: "mock-1", description: "Camiseta polo - Bordado peito", quantity: 10, value: 35 },
      ]
    },
    "ORC-002": {
      quote: {
        id: "mock-2",
        code: "ORC-002",
        customer_name: "Escola Municipal",
        customer_phone: "(11) 99999-2222",
        date: "2025-01-08",
        observations: "Uniformes escolares completos",
      },
      items: [
        { id: "i3", quote_id: "mock-2", description: "Camisa uniforme escolar", quantity: 50, value: 30 },
        { id: "i4", quote_id: "mock-2", description: "Calça uniforme escolar", quantity: 50, value: 40 },
      ]
    },
    "ORC-003": {
      quote: {
        id: "mock-3",
        code: "ORC-003",
        customer_name: "Mariana Souza",
        customer_phone: "(11) 99999-3333",
        date: "2025-01-07",
        observations: "Bordados personalizados",
      },
      items: [
        { id: "i5", quote_id: "mock-3", description: "Toalha bordada personalizada", quantity: 5, value: 45 },
      ]
    }
  };

  return mockQuotes[code] || { quote: null, items: [] };
}

// Simular a função openWhatsApp
function testOpenWhatsApp(quoteCode) {
  console.log(`\n--- Testando envio WhatsApp para ${quoteCode} ---`);
  
  try {
    // Simular busca dos dados do orçamento
    const quoteData = getMockQuoteByCode(quoteCode);
    console.log("Dados do orçamento:", quoteData);
    
    if (!quoteData.quote) {
      console.error("Orçamento não encontrado!");
      return;
    }
    
    const { items } = quoteData;
    const quote = quoteData.quote;
    
    // Montar lista de produtos
    let productsList = "";
    if (items && items.length > 0) {
      productsList = items.map(item => 
        `• ${item.description} - Qtd: ${item.quantity} - R$ ${Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join('\n');
    } else {
      // Se não há itens, usar a descrição do orçamento
      productsList = `• ${quote.observations || 'Produto não especificado'}`;
    }

    // Calcular valor total
    const totalValue = items.reduce((sum, item) => sum + (item.value * item.quantity), 0);

    const message = `*ORÇAMENTO ATELIÊ PRO*

Olá *${quote.customer_name}*!

Seu orçamento está pronto!

*Produtos:*
${productsList}

*Valor Total: R$ ${Number(totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*

*Próximos passos:*
1. Confirme se está de acordo
2. Informe a forma de pagamento
3. Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

Atenciosamente,
Ateliê Pro`;

    console.log("Mensagem WhatsApp gerada:");
    console.log("=".repeat(50));
    console.log(message);
    console.log("=".repeat(50));
    
    // Verificar se a lista de produtos não está vazia
    if (productsList.trim() === "") {
      console.error("❌ PROBLEMA: Lista de produtos está vazia!");
    } else {
      console.log("✅ Lista de produtos gerada com sucesso!");
    }
    
    return message;
  } catch (error) {
    console.error("Erro ao gerar mensagem WhatsApp:", error);
  }
}

// Testar com diferentes orçamentos
console.log("\n=== TESTANDO TODOS OS ORÇAMENTOS ===");

const testCodes = ["ORC-001", "ORC-002", "ORC-003"];

testCodes.forEach(code => {
  testOpenWhatsApp(code);
});

console.log("\n=== TESTE CONCLUÍDO ===");
console.log("Se algum orçamento mostrou 'Lista de produtos está vazia!', há um problema na lógica.");
console.log("Caso contrário, a função está funcionando corretamente.");


