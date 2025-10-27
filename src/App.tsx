import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./components/AuthProvider";
import { SyncProvider } from "./contexts/SyncContext";
import { InternationalizationProvider } from "./contexts/InternationalizationContext";
import { Layout } from "./components/Layout";

// Páginas públicas
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import OrcamentoPublico from "./pages/OrcamentoPublico";

// Páginas protegidas
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import EditarPedido from "./pages/EditarPedido";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import EditarOrcamento from "./pages/EditarOrcamento";
import OrcamentoImpressaoNovo from "./pages/OrcamentoImpressaoNovo";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import CatalogoProdutos from "./pages/CatalogoProdutos";
import CalculadoraPrecos from "./pages/CalculadoraPrecos";
import Relatorios from "./pages/Relatorios";
import ControleFinanceiro from "./pages/ControleFinanceiro";
import Assinatura from "./pages/Assinatura";
import AssinaturaSucesso from "./pages/AssinaturaSucesso";
import VerificarPagamento from "./pages/VerificarPagamento";
import MinhaConta from "./pages/MinhaConta";
import Agenda from "./pages/Agenda";
import OrdemProducao from "./pages/OrdemProducao";
import MedidasClientes from "./pages/MedidasClientes";
import Ajuda from "./pages/Ajuda";
import Documentacao from "./pages/Documentacao";
import FAQ from "./pages/FAQ";
import RelatorioUso from "./pages/RelatorioUso";

// QueryClient fora do componente para evitar re-criação
// Cache buster: 2024-12-19 - Corrigindo Dashboard not defined
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Sempre buscar dados frescos
      gcTime: 2 * 60 * 1000, // Cache por 2 minutos
      retry: 3, // Tentar 3 vezes em caso de erro
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
      refetchOnWindowFocus: false, // Não refetch ao focar na janela
      refetchOnReconnect: true, // Refetch ao reconectar
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <InternationalizationProvider>
            <SyncProvider>
              <BrowserRouter>
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/cadastro" element={<Cadastro />} />
                  <Route path="/orcamento/:id" element={<OrcamentoPublico />} />
                  <Route path="/orcamentos/:id/impressao" element={<OrcamentoImpressaoNovo />} />
                  <Route path="/assinatura-sucesso" element={<AssinaturaSucesso />} />
                  <Route path="/verificar-pagamento" element={<VerificarPagamento />} />
                  
                  {/* Rotas protegidas com Layout */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="pedidos" element={<Pedidos />} />
                    <Route path="pedidos/novo" element={<NovoPedido />} />
                    <Route path="pedidos/editar/:id" element={<EditarPedido />} />
                    <Route path="pedidos/:id/producao" element={<OrdemProducao />} />
                    <Route path="pedidos/:id" element={<PedidoDetalhe />} />
                    <Route path="orcamentos" element={<Orcamentos />} />
                    <Route path="orcamentos/novo" element={<NovoOrcamento />} />
                    <Route path="orcamentos/editar/:id" element={<EditarOrcamento />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="estoque" element={<Estoque />} />
                    <Route path="catalogo" element={<CatalogoProdutos />} />
                    <Route path="calculadora" element={<CalculadoraPrecos />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="financeiro" element={<ControleFinanceiro />} />
                    <Route path="assinatura" element={<Assinatura />} />
                    <Route path="minha-conta" element={<MinhaConta />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="medidas" element={<MedidasClientes />} />
                    <Route path="ajuda" element={<Ajuda />} />
                    <Route path="documentacao" element={<Documentacao />} />
                    <Route path="faq" element={<FAQ />} />
                    <Route path="admin/relatorio-uso" element={<RelatorioUso />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </SyncProvider>
          </InternationalizationProvider>
        </AuthProvider>
      </TooltipProvider>
      <Sonner />
    </QueryClientProvider>
  );
}

export default App;