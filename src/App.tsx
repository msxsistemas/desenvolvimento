import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import ClientesListCreate from "./pages/clientes/ClientesListCreate";
import ClientesCadastro from "./pages/clientes/ClientesCadastro";
import ClientesEditar from "./pages/clientes/ClientesEditar";
import ClientesPlanos from "./pages/clientes/ClientesPlanos";
import ClientesProdutos from "./pages/clientes/ClientesProdutos";
import ClientesAplicativos from "./pages/clientes/ClientesAplicativos";
import ClientesMetricas from "./pages/clientes/ClientesMetricas";
import ClientesIntegracoes from "./pages/clientes/ClientesIntegracoes";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/configuracoes/Configuracoes";
import MensagensCobranca from "./pages/configuracoes/MensagensCobranca";
import MensagensPadroes from "./pages/configuracoes/MensagensPadroes";
import TemplatesCobranca from "./pages/configuracoes/TemplatesCobranca";
import AtivarCobrancas from "./pages/configuracoes/AtivarCobrancas";
import Marketing from "./pages/Marketing";
import MensagensEnviadas from "./pages/MensagensEnviadas";
import Tutoriais from "./pages/Tutoriais";
import ParearWhatsapp from "./pages/ParearWhatsapp";
import Checkout from "./pages/financeiro-extra/Checkout";
import Assas from "./pages/financeiro-extra/Assas";
// WhatsApp pages
import GerenciarMensagens from "./pages/whatsapp/GerenciarMensagens";
import FilaMensagens from "./pages/whatsapp/FilaMensagens";
import EnviosEmMassa from "./pages/whatsapp/EnviosEmMassa";
import GerenciarCampanhas from "./pages/whatsapp/GerenciarCampanhas";
import ParearWhatsappNew from "./pages/whatsapp/ParearWhatsappNew";
import Templates from "./pages/whatsapp/Templates";
import Relatorios from "./pages/Relatorios";
import LogsPainel from "./pages/LogsPainel";
import LogsSistema from "./pages/LogsSistema";

const queryClient = new QueryClient();
import Auth from "./pages/auth/Auth";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected layout wrapper for main routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Index />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/mensagens" element={<MensagensEnviadas />} />
            <Route path="/loja" element={<ParearWhatsapp />} />
            <Route path="/parear-whatsapp" element={<ParearWhatsapp />} />
            <Route path="/tutoriais" element={<Tutoriais />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/configuracoes/mensagens-cobranca" element={<MensagensCobranca />} />
            <Route path="/configuracoes/mensagens-padroes" element={<MensagensPadroes />} />
            <Route path="/configuracoes/templates-cobranca" element={<TemplatesCobranca />} />
            <Route path="/configuracoes/ativar-cobrancas" element={<AtivarCobrancas />} />
            <Route path="/clientes" element={<ClientesListCreate />} />
            <Route path="/clientes/cadastro" element={<ClientesCadastro />} />
            <Route path="/clientes/editar/:id" element={<ClientesEditar />} />
            <Route path="/planos" element={<ClientesPlanos />} />
            <Route path="/produtos" element={<ClientesProdutos />} />
            <Route path="/aplicativos" element={<ClientesAplicativos />} />
            <Route path="/metricas" element={<ClientesMetricas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/servidores" element={<ClientesIntegracoes />} />
            <Route path="/financeiro-extra/checkout" element={<Checkout />} />
            <Route path="/financeiro-extra/assas" element={<Assas />} />
            {/* WhatsApp routes */}
            <Route path="/whatsapp/gerenciar-mensagens" element={<GerenciarMensagens />} />
            <Route path="/whatsapp/fila-mensagens" element={<FilaMensagens />} />
            <Route path="/whatsapp/envios-em-massa" element={<EnviosEmMassa />} />
            <Route path="/whatsapp/templates" element={<Templates />} />
            <Route path="/whatsapp/parear" element={<ParearWhatsappNew />} />
            {/* Logs routes */}
            <Route path="/logs/painel" element={<LogsPainel />} />
            <Route path="/logs/sistema" element={<LogsSistema />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);


export default App;
