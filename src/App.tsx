import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PageSkeleton } from "@/components/ui/page-skeleton";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppLayout = lazy(() => import("./components/layout/AppLayout"));
const ClientesListCreate = lazy(() => import("./pages/clientes/ClientesListCreate"));
const ClientesCadastro = lazy(() => import("./pages/clientes/ClientesCadastro"));
const ClientesEditar = lazy(() => import("./pages/clientes/ClientesEditar"));
const ClientesPlanos = lazy(() => import("./pages/clientes/ClientesPlanos"));
const PlanosCadastro = lazy(() => import("./pages/clientes/PlanosCadastro"));
const ClientesProdutos = lazy(() => import("./pages/clientes/ClientesProdutos"));
const ProdutosCadastro = lazy(() => import("./pages/clientes/ProdutosCadastro"));
const ClientesAplicativos = lazy(() => import("./pages/clientes/ClientesAplicativos"));
const AplicativosCadastro = lazy(() => import("./pages/clientes/AplicativosCadastro"));
const ClientesMetricas = lazy(() => import("./pages/clientes/ClientesMetricas"));
const ClientesIntegracoes = lazy(() => import("./pages/clientes/ClientesIntegracoes"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Configuracoes = lazy(() => import("./pages/configuracoes/Configuracoes"));
const MensagensCobranca = lazy(() => import("./pages/configuracoes/MensagensCobranca"));
const MensagensPadroes = lazy(() => import("./pages/configuracoes/MensagensPadroes"));
const TemplatesCobranca = lazy(() => import("./pages/configuracoes/TemplatesCobranca"));
const AtivarCobrancas = lazy(() => import("./pages/configuracoes/AtivarCobrancas"));
const Marketing = lazy(() => import("./pages/Marketing"));
const MensagensEnviadas = lazy(() => import("./pages/MensagensEnviadas"));
const Tutoriais = lazy(() => import("./pages/Tutoriais"));
const ParearWhatsapp = lazy(() => import("./pages/whatsapp/ParearWhatsappNew"));
const Checkout = lazy(() => import("./pages/financeiro-extra/Checkout"));
const Assas = lazy(() => import("./pages/financeiro-extra/Assas"));
const GerenciarMensagens = lazy(() => import("./pages/whatsapp/GerenciarMensagens"));
const FilaMensagens = lazy(() => import("./pages/whatsapp/FilaMensagens"));
const EnviosEmMassa = lazy(() => import("./pages/whatsapp/EnviosEmMassa"));
const GerenciarCampanhas = lazy(() => import("./pages/whatsapp/GerenciarCampanhas"));
const Templates = lazy(() => import("./pages/whatsapp/Templates"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const LogsPainel = lazy(() => import("./pages/LogsPainel"));
const LogsSistema = lazy(() => import("./pages/LogsSistema"));
const IndicacoesClientes = lazy(() => import("./pages/indicacoes/IndicacoesClientes"));
const IndicacoesSistema = lazy(() => import("./pages/indicacoes/IndicacoesSistema"));
const Cupom = lazy(() => import("./pages/outros/Cupom"));
const Auth = lazy(() => import("./pages/auth/Auth"));
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="p-4 sm:p-6">
      <PageSkeleton variant="dashboard" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
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
              <Route path="/planos/cadastro" element={<PlanosCadastro />} />
              <Route path="/produtos" element={<ClientesProdutos />} />
              <Route path="/produtos/cadastro" element={<ProdutosCadastro />} />
              <Route path="/aplicativos" element={<ClientesAplicativos />} />
              <Route path="/aplicativos/cadastro" element={<AplicativosCadastro />} />
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
              <Route path="/whatsapp/parear" element={<ParearWhatsapp />} />
              {/* Logs routes */}
              <Route path="/logs/painel" element={<LogsPainel />} />
              <Route path="/logs/sistema" element={<LogsSistema />} />
              {/* Indicações routes */}
              <Route path="/indicacoes/clientes" element={<IndicacoesClientes />} />
              <Route path="/indicacoes/sistema" element={<IndicacoesSistema />} />
              {/* Outros routes */}
              <Route path="/outros/cupom" element={<Cupom />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);


export default App;
