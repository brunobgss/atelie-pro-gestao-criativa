// Teste simples da calculadora
console.log("🧮 TESTE SIMPLES DA CALCULADORA");
console.log("==============================");

// Teste: Bordado de 5000 pontos
const pontos = 5000;
const precoPorMil = 1.5;
const custoProducao = (pontos / 1000) * precoPorMil;

console.log(`Pontos: ${pontos}`);
console.log(`Preço por mil: R$ ${precoPorMil}`);
console.log(`Custo produção: R$ ${custoProducao.toFixed(2)}`);

// Teste: Materiais
const materiais = [
  { nome: "Linha", qty: 2, preco: 3.50 },
  { nome: "Tecido", qty: 1, preco: 15.00 }
];

const custoMateriais = materiais.reduce((total, mat) => total + (mat.qty * mat.preco), 0);
console.log(`Custo materiais: R$ ${custoMateriais.toFixed(2)}`);

// Teste: Cálculo final
const subtotal = custoProducao + custoMateriais;
const margemLucro = 35;
const lucro = subtotal * (margemLucro / 100);
const precoFinal = subtotal + lucro;

console.log(`Subtotal: R$ ${subtotal.toFixed(2)}`);
console.log(`Lucro (${margemLucro}%): R$ ${lucro.toFixed(2)}`);
console.log(`PREÇO FINAL: R$ ${precoFinal.toFixed(2)}`);

console.log("\n✅ Teste concluído!");
