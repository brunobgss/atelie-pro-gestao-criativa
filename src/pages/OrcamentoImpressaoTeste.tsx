import React from "react";

export default function OrcamentoImpressaoTeste() {
  console.log("🧪 COMPONENTE DE TESTE EXECUTANDO!");
  console.log("🧪 URL atual:", window.location.href);
  
  return (
    <div style={{ 
      padding: "20px", 
      backgroundColor: "red", 
      color: "white",
      minHeight: "100vh",
      fontSize: "24px",
      fontWeight: "bold"
    }}>
      <h1>🧪 TESTE DE IMPRESSÃO FUNCIONANDO!</h1>
      <p>URL: {window.location.href}</p>
      <p>Se você está vendo isso, o componente está funcionando!</p>
      <p>Timestamp: {new Date().toLocaleString()}</p>
    </div>
  );
}
