// Teste específico para verificar o problema do WhatsApp
// Cole este script no console do navegador na página de Orçamentos

console.log("=== TESTE ESPECÍFICO WHATSAPP ===");

// Simular um orçamento como vem da lista
const mockQuote = {
  id: "ORC-002",
  client: "Escola Municipal",
  description: "Uniformes escolares completos",
  value: 3500.00,
  date: "2025-01-08",
  status: "Pendente"
};

console.log("Orçamento mock:", mockQuote);

// Simular a função getQuoteByCode
async function mockGetQuoteByCode(code) {
  console.log("Simulando busca do orçamento:", code);
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const mockQuotes = {
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
    }
  };

  return mockQuotes[code] || { quote: null, items: [] };
}

// Simular a função openWhatsApp corrigida
async function testOpenWhatsApp(quote) {
  try {
    console.log("Iniciando envio WhatsApp para orçamento:", quote.id);
    
    // Buscar dados completos do orçamento
    const quoteData = await mockGetQuoteByCode(quote.id);
    console.log("Dados do orçamento:", quoteData);
    
    const { items } = quoteData;
    
    // Montar lista de produtos
    let productsList = "";
    if (items && items.length > 0) {
      productsList = items.map(item => 
        `• ${item.description} - Qtd: ${item.quantity} - R$ ${Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join('\n');
    } else {
      // Se não há itens, usar a descrição do orçamento
      productsList = `• ${quote.description || 'Produto não especificado'}`;
    }

    const message = `*ORÇAMENTO ATELIÊ PRO*

Olá *${quote.client}*!

Seu orçamento está pronto!

*Produtos:*
${productsList}

*Valor Total: R$ ${Number(quote.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*

*Próximos passos:*
1. Confirme se está de acordo
2. Informe a forma de pagamento
3. Defina a data de entrega

Para aprovar ou fazer alterações, responda esta mensagem!

Atenciosamente,
Ateliê Pro`;

    console.log("Mensagem WhatsApp:", message);
    
    // Verificar se a lista de produtos não está vazia
    if (productsList.trim() === "") {
      console.error("❌ PROBLEMA: Lista de produtos está vazia!");
      console.log("Items encontrados:", items);
      console.log("Items length:", items ? items.length : "undefined");
    } else {
      console.log("✅ Lista de produtos gerada com sucesso!");
      console.log("Produtos:", productsList);
    }
    
    return message;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
  }
}

// Executar o teste
testOpenWhatsApp(mockQuote).then(result => {
  console.log("\n=== RESULTADO FINAL ===");
  if (result) {
    console.log("✅ Teste executado com sucesso!");
    console.log("Mensagem gerada:", result);
  } else {
    console.log("❌ Teste falhou!");
  }
});


