// Teste completo da Calculadora de Preços
// Este script testa todas as funcionalidades da calculadora

console.log("🧮 TESTE COMPLETO DA CALCULADORA DE PREÇOS");
console.log("==========================================");

// Teste 1: Bordado por Pontos
console.log("\n1️⃣ TESTE: Bordado por Pontos");
const bordadoPontos = {
  tipo: "bordado",
  modo: "pontos",
  pontos: 5000,
  precoPorMilPontos: 1.5,
  materiais: [
    { nome: "Linha", quantidade: 2, precoUnitario: 3.50 },
    { nome: "Tecido", quantidade: 1, precoUnitario: 15.00 }
  ],
  margemLucro: 35
};

const custoProducaoPontos = (bordadoPontos.pontos / 1000) * bordadoPontos.precoPorMilPontos;
const custoMateriaisPontos = bordadoPontos.materiais.reduce((total, mat) => total + (mat.quantidade * mat.precoUnitario), 0);
const subtotalPontos = custoProducaoPontos + custoMateriaisPontos;
const lucroPontos = subtotalPontos * (bordadoPontos.margemLucro / 100);
const precoFinalPontos = subtotalPontos + lucroPontos;

console.log(`   Pontos: ${bordadoPontos.pontos}`);
console.log(`   Custo Produção: R$ ${custoProducaoPontos.toFixed(2)}`);
console.log(`   Materiais: R$ ${custoMateriaisPontos.toFixed(2)}`);
console.log(`   Subtotal: R$ ${subtotalPontos.toFixed(2)}`);
console.log(`   Lucro (${bordadoPontos.margemLucro}%): R$ ${lucroPontos.toFixed(2)}`);
console.log(`   PREÇO FINAL: R$ ${precoFinalPontos.toFixed(2)}`);

// Teste 2: Bordado por Horas
console.log("\n2️⃣ TESTE: Bordado por Horas");
const bordadoHoras = {
  tipo: "bordado",
  modo: "horas",
  horas: 3,
  precoPorHora: 25,
  materiais: [
    { nome: "Linha", quantidade: 1, precoUnitario: 3.50 },
    { nome: "Tecido", quantidade: 1, precoUnitario: 12.00 }
  ],
  margemLucro: 40
};

const custoProducaoHoras = bordadoHoras.horas * bordadoHoras.precoPorHora;
const custoMateriaisHoras = bordadoHoras.materiais.reduce((total, mat) => total + (mat.quantidade * mat.precoUnitario), 0);
const subtotalHoras = custoProducaoHoras + custoMateriaisHoras;
const lucroHoras = subtotalHoras * (bordadoHoras.margemLucro / 100);
const precoFinalHoras = subtotalHoras + lucroHoras;

console.log(`   Horas: ${bordadoHoras.horas}`);
console.log(`   Custo Produção: R$ ${custoProducaoHoras.toFixed(2)}`);
console.log(`   Materiais: R$ ${custoMateriaisHoras.toFixed(2)}`);
console.log(`   Subtotal: R$ ${subtotalHoras.toFixed(2)}`);
console.log(`   Lucro (${bordadoHoras.margemLucro}%): R$ ${lucroHoras.toFixed(2)}`);
console.log(`   PREÇO FINAL: R$ ${precoFinalHoras.toFixed(2)}`);

// Teste 3: Camiseta
console.log("\n3️⃣ TESTE: Camiseta");
const camiseta = {
  tipo: "camiseta",
  horas: 0.5,
  precoPorHora: 25,
  materiais: [
    { nome: "Camiseta", quantidade: 1, precoUnitario: 18.00 },
    { nome: "Tinta", quantidade: 0.1, precoUnitario: 50.00 }
  ],
  margemLucro: 50
};

const custoProducaoCamiseta = camiseta.horas * camiseta.precoPorHora;
const custoMateriaisCamiseta = camiseta.materiais.reduce((total, mat) => total + (mat.quantidade * mat.precoUnitario), 0);
const subtotalCamiseta = custoProducaoCamiseta + custoMateriaisCamiseta;
const lucroCamiseta = subtotalCamiseta * (camiseta.margemLucro / 100);
const precoFinalCamiseta = subtotalCamiseta + lucroCamiseta;

console.log(`   Horas: ${camiseta.horas}`);
console.log(`   Custo Produção: R$ ${custoProducaoCamiseta.toFixed(2)}`);
console.log(`   Materiais: R$ ${custoMateriaisCamiseta.toFixed(2)}`);
console.log(`   Subtotal: R$ ${subtotalCamiseta.toFixed(2)}`);
console.log(`   Lucro (${camiseta.margemLucro}%): R$ ${lucroCamiseta.toFixed(2)}`);
console.log(`   PREÇO FINAL: R$ ${precoFinalCamiseta.toFixed(2)}`);

// Teste 4: Produto Personalizado
console.log("\n4️⃣ TESTE: Produto Personalizado");
const personalizado = {
  tipo: "personalizado",
  quantidade: 10,
  custoUnitario: 15.00,
  custoSetup: 50.00,
  margemLucro: 60
};

const custoTotalPersonalizado = (personalizado.quantidade * personalizado.custoUnitario) + personalizado.custoSetup;
const lucroPersonalizado = custoTotalPersonalizado * (personalizado.margemLucro / 100);
const precoFinalPersonalizado = custoTotalPersonalizado + lucroPersonalizado;
const precoUnitarioPersonalizado = precoFinalPersonalizado / personalizado.quantidade;

console.log(`   Quantidade: ${personalizado.quantidade}`);
console.log(`   Custo Unitário: R$ ${personalizado.custoUnitario.toFixed(2)}`);
console.log(`   Custo Setup: R$ ${personalizado.custoSetup.toFixed(2)}`);
console.log(`   Custo Total: R$ ${custoTotalPersonalizado.toFixed(2)}`);
console.log(`   Lucro (${personalizado.margemLucro}%): R$ ${lucroPersonalizado.toFixed(2)}`);
console.log(`   PREÇO FINAL: R$ ${precoFinalPersonalizado.toFixed(2)}`);
console.log(`   PREÇO UNITÁRIO: R$ ${precoUnitarioPersonalizado.toFixed(2)}`);

// Resumo dos Testes
console.log("\n📊 RESUMO DOS TESTES:");
console.log("=====================");
console.log(`Bordado (Pontos): R$ ${precoFinalPontos.toFixed(2)}`);
console.log(`Bordado (Horas): R$ ${precoFinalHoras.toFixed(2)}`);
console.log(`Camiseta: R$ ${precoFinalCamiseta.toFixed(2)}`);
console.log(`Personalizado (10 un): R$ ${precoFinalPersonalizado.toFixed(2)}`);
console.log(`Personalizado (1 un): R$ ${precoUnitarioPersonalizado.toFixed(2)}`);

console.log("\n✅ TESTE COMPLETO FINALIZADO!");
console.log("Verifique se os valores estão corretos na calculadora.");
