import { Toaster } from "@/components/ui/toaster";
// Cache buster - force new deployment
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./components/AuthProvider";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import Agenda from "./pages/Agenda";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import CalculadoraPrecos from "./pages/CalculadoraPrecos";
import CatalogoProdutos from "./pages/CatalogoProdutos";
import Relatorios from "./pages/Relatorios";
import Assinatura from "./pages/Assinatura";
import AssinaturaSucesso from "./pages/AssinaturaSucesso";
import OrdemProducao from "./pages/OrdemProducao";
import ControleFinanceiro from "./pages/ControleFinanceiro";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import OrcamentoPublico from "./pages/OrcamentoPublico";
import OrcamentoImpressao from "./pages/OrcamentoImpressao";
import EditarOrcamento from "./pages/EditarOrcamento";
import EditarPedido from "./pages/EditarPedido";
import MinhaConta from "./pages/MinhaConta";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import NotFound from "./pages/NotFound";
import { SyncProvider } from "./contexts/SyncContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Sempre buscar dados frescos
      refetchOnWindowFocus: false, // Não refetch ao focar na janela
      retry: 1, // Tentar apenas 1 vez em caso de erro
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/orcamento/:id" element={<OrcamentoPublico />} />
            <Route path="/assinatura/sucesso" element={<AssinaturaSucesso />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
              <Route path="/pedidos/:id/producao" element={<OrdemProducao />} />
              <Route path="/pedidos/novo" element={<NovoPedido />} />
              <Route path="/pedidos/editar/:id" element={<EditarPedido />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
              <Route path="/orcamentos/editar/:id" element={<EditarOrcamento />} />
              <Route path="/orcamentos/imprimir/:id" element={<OrcamentoImpressao />} />
              <Route path="/calculadora" element={<CalculadoraPrecos />} />
              <Route path="/catalogo" element={<CatalogoProdutos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/assinatura" element={<Assinatura />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              <Route path="/financeiro" element={<ControleFinanceiro />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/estoque" element={<Estoque />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;