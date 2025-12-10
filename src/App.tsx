import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./components/AuthProvider";
import { SyncProvider } from "./contexts/SyncContext";
import { InternationalizationProvider } from "./contexts/InternationalizationContext";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Páginas públicas
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import ResetPassword from "./pages/ResetPassword";
import ConfirmarEmail from "./pages/ConfirmarEmail";
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
import VisualizarOrcamento from "./pages/VisualizarOrcamento";
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
import AdminErros from "./pages/AdminErros";
import ConfiguracaoFocusNF from "./pages/ConfiguracaoFocusNF";
import GestaoNotasFiscais from "./pages/GestaoNotasFiscais";
import Fornecedores from "./pages/Fornecedores";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import PedidosCompra from "./pages/PedidosCompra";
import MovimentacoesEstoque from "./pages/MovimentacoesEstoque";
import FluxoCaixa from "./pages/FluxoCaixa";
import Indicacoes from "./pages/Indicacoes";
import Recompensas from "./pages/Recompensas";
import ConfiguracaoWhatsApp from "./pages/ConfiguracaoWhatsApp";
import AdminComissoes from "./pages/AdminComissoes";
import Servicos from "./pages/Servicos";

// QueryClient fora do componente para evitar re-criação
// Cache buster: 2024-12-19 - Corrigindo Dashboard not defined
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Cache por 30 segundos (dados considerados frescos)
      gcTime: 5 * 60 * 1000, // Manter cache por 5 minutos
      retry: 2, // Tentar 2 vezes em caso de erro (reduzido de 3)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
      refetchOnWindowFocus: false, // Não refetch ao focar na janela
      refetchOnReconnect: true, // Refetch ao reconectar
      refetchOnMount: false, // Não refetch ao montar componente se dados estão frescos
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
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
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/confirmar-email" element={<ConfirmarEmail />} />
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
                    <Route path="orcamentos/:id/visualizar" element={<VisualizarOrcamento />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="estoque" element={<Estoque />} />
                    <Route path="catalogo" element={<CatalogoProdutos />} />
                    <Route path="calculadora" element={<CalculadoraPrecos />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="financeiro" element={<ControleFinanceiro />} />
                    <Route path="assinatura" element={<Assinatura />} />
                    <Route path="indicacoes" element={<Indicacoes />} />
                    <Route path="recompensas" element={<Recompensas />} />
                    <Route path="configuracao-whatsapp" element={<ConfiguracaoWhatsApp />} />
                    <Route path="minha-conta" element={<MinhaConta />} />
                    <Route path="admin/comissoes" element={<AdminComissoes />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="medidas" element={<MedidasClientes />} />
                    <Route path="ajuda" element={<Ajuda />} />
                    <Route path="documentacao" element={<Documentacao />} />
                    <Route path="faq" element={<FAQ />} />
                    <Route path="admin/relatorio-uso" element={<RelatorioUso />} />
                    <Route path="admin/erros" element={<AdminErros />} />
                    <Route path="notas-fiscais" element={<GestaoNotasFiscais />} />
                    <Route path="configuracao-focusnf" element={<ConfiguracaoFocusNF />} />
                    <Route path="fornecedores" element={<Fornecedores />} />
                    <Route path="contas-pagar" element={<ContasPagar />} />
                    <Route path="contas-receber" element={<ContasReceber />} />
                    <Route path="pedidos-compra" element={<PedidosCompra />} />
                    <Route path="movimentacoes-estoque" element={<MovimentacoesEstoque />} />
                    <Route path="fluxo-caixa" element={<FluxoCaixa />} />
                    <Route path="servicos" element={<Servicos />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </SyncProvider>
          </InternationalizationProvider>
        </AuthProvider>
      </TooltipProvider>
      <Sonner />
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;