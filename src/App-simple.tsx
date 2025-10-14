import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function SimpleApp() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>Ateliê Pro - Teste</h1>
        <p>Se você está vendo isso, o app está funcionando!</p>
        <Routes>
          <Route path="/" element={<div>Dashboard Teste</div>} />
          <Route path="/teste" element={<div>Página de Teste</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default SimpleApp;
