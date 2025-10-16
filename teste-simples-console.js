// Script simples para testar no console
// Cole este código no console da página de clientes

// 1. Verificar se o Supabase está disponível
console.log("🔍 Verificando Supabase...");
console.log("window.supabase:", typeof window.supabase);
console.log("window.supabaseClient:", typeof window.supabaseClient);

// 2. Tentar encontrar o Supabase de outras formas
const supabase = window.supabase || window.supabaseClient || window.__supabase;

if (supabase) {
  console.log("✅ Supabase encontrado:", supabase);
  
  // Testar consulta simples
  supabase
    .from("customers")
    .select("*")
    .then(({ data, error }) => {
      console.log("📋 Resultado da consulta:", { data, error });
    });
} else {
  console.log("❌ Supabase não encontrado. Tentando outras formas...");
  
  // Tentar encontrar no React DevTools
  const reactRoot = document.querySelector('#root');
  if (reactRoot && reactRoot._reactInternalFiber) {
    console.log("🔍 Tentando encontrar Supabase no React...");
  }
  
  // Listar todas as variáveis globais que podem ser o Supabase
  const globalVars = Object.keys(window).filter(key => 
    key.toLowerCase().includes('supabase') || 
    key.toLowerCase().includes('client')
  );
  console.log("🔍 Variáveis globais relacionadas:", globalVars);
}




