import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./components/AuthProvider";
import { SyncProvider } from "./contexts/SyncContext";
import { Layout } from "./components/Layout";

// Páginas públicas
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import OrcamentoPublico from "./pages/OrcamentoPublico";

// Páginas protegidas
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import OrcamentoImpressao from "./pages/OrcamentoImpressao";
import OrcamentoImpressaoTeste from "./pages/OrcamentoImpressaoTeste";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import CatalogoProdutos from "./pages/CatalogoProdutos";
import CalculadoraPrecos from "./pages/CalculadoraPrecos";
import Relatorios from "./pages/Relatorios";
import ControleFinanceiro from "./pages/ControleFinanceiro";
import Assinatura from "./pages/Assinatura";
import MinhaConta from "./pages/MinhaConta";
import Agenda from "./pages/Agenda";

// QueryClient fora do componente para evitar re-criação
// Cache buster: 2024-12-19 - Corrigindo Dashboard not defined
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SyncProvider>
            <BrowserRouter>
              <Routes>
                {/* Rotas públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/orcamento/:id" element={<OrcamentoPublico />} />
                <Route path="/orcamentos/:id/impressao" element={<div style={{padding: "20px", backgroundColor: "red", color: "white"}}><h1>TESTE DIRETO</h1><p>Rota funcionando!</p></div>} />
                
                {/* Rotas protegidas com Layout */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="pedidos" element={<Pedidos />} />
                  <Route path="pedidos/novo" element={<NovoPedido />} />
                  <Route path="pedidos/:id" element={<PedidoDetalhe />} />
                  <Route path="orcamentos" element={<Orcamentos />} />
                  <Route path="orcamentos/novo" element={<NovoOrcamento />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="estoque" element={<Estoque />} />
                  <Route path="catalogo" element={<CatalogoProdutos />} />
                  <Route path="calculadora" element={<CalculadoraPrecos />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="financeiro" element={<ControleFinanceiro />} />
                  <Route path="assinatura" element={<Assinatura />} />
                  <Route path="minha-conta" element={<MinhaConta />} />
                  <Route path="agenda" element={<Agenda />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SyncProvider>
        </AuthProvider>
      </TooltipProvider>
      <Toaster />
      <Sonner />
    </QueryClientProvider>
  );
}

export default App;