import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import Agenda from "./pages/Agenda";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import NotFound from "./pages/NotFound";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import OrcamentoPublico from "./pages/OrcamentoPublico";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="/pedidos/novo" element={<NovoPedido />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/estoque" element={<Estoque />} />
          </Route>
          <Route path="/orcamento/:id" element={<OrcamentoPublico />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
