import { useFinanceiro } from "@/hooks/useFinanceiro";
import {
  useMetricasClientes,
  useMetricasPagamentos,
  useMetricasRenovacoes,
} from "@/hooks/useMetricas";
import DashboardClientCards from "@/components/dashboard/DashboardClientCards";
import DashboardFinanceCards from "@/components/dashboard/DashboardFinanceCards";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardExpiredAlert from "@/components/dashboard/DashboardExpiredAlert";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";

export default function Index() {
  const { entradas, saidas, lucros, loading: loadingFinanceiro } = useFinanceiro();
  const {
    totalClientes,
    clientesAtivos,
    clientesVencidos,
    clientesNovosHoje,
    clientesNovosData,
    loading: loadingClientes,
  } = useMetricasClientes();
  const {
    totalPagamentos,
    valorTotalMes,
    mediaPorDia,
    pagamentosData,
    loading: loadingPagamentos,
  } = useMetricasPagamentos();
  const {
    renovacoesData,
    loading: loadingRenovacoes,
  } = useMetricasRenovacoes();

  const isLoading =
    loadingFinanceiro || loadingClientes || loadingPagamentos || loadingRenovacoes;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-72 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const hora = new Date().getHours();
  const saudacao =
    hora < 12 ? "Bom Dia" : hora < 18 ? "Boa Tarde" : "Boa Noite";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {saudacao}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe clientes, pagamentos e desempenho.
        </p>
      </header>

      {/* 1ª linha — Cards de clientes */}
      <DashboardClientCards
        clientesAtivos={clientesAtivos}
        clientesVencidos={clientesVencidos}
        clientesNovosHoje={clientesNovosHoje}
        totalClientes={totalClientes}
      />

      {/* 2ª linha — Financeiro */}
      <DashboardFinanceCards
        entradas={entradas}
        saidas={saidas}
        lucros={lucros}
        valorTotalMes={valorTotalMes}
      />

      {/* 3ª linha — Gráficos */}
      <DashboardCharts
        pagamentosData={pagamentosData}
        clientesNovosData={clientesNovosData}
        renovacoesData={renovacoesData}
        entradas={entradas}
        saidas={saidas}
      />

      {/* 4ª linha — Alerta de vencidos */}
      <DashboardExpiredAlert clientesVencidos={clientesVencidos} />

      {/* 5ª linha — Resumos */}
      <DashboardSummaryCards
        mediaPorDia={mediaPorDia}
        valorTotalMes={valorTotalMes}
        totalClientes={totalClientes}
        pagamentosData={pagamentosData}
      />
    </div>
  );
}
