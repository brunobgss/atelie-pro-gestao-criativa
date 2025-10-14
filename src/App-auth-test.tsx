import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./components/AuthProvider";

// QueryClient fora do componente para evitar re-criação
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
    },
  },
});

function AuthTestApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
              <h1>Ateliê Pro - Teste AuthProvider</h1>
              <p>Testando AuthProvider...</p>
              <Routes>
                <Route path="/" element={<div>Dashboard Teste</div>} />
                <Route path="/teste" element={<div>Página de Teste</div>} />
              </Routes>
            </div>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default AuthTestApp;
