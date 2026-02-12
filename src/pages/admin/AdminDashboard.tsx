import { useFinanceiro } from "@/hooks/useFinanceiro";
import {
  useMetricasClientes,
  useMetricasPagamentos,
  useMetricasRenovacoes,
} from "@/hooks/useMetricas";
import { useMetricasExtras } from "@/hooks/useMetricasExtras";
import DashboardClientCards from "@/components/dashboard/DashboardClientCards";
import DashboardFinanceCards from "@/components/dashboard/DashboardFinanceCards";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardNewCards from "@/components/dashboard/DashboardNewCards";
import DashboardClientTables from "@/components/dashboard/DashboardClientTables";

export default function AdminDashboard() {
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

  const metricasExtras = useMetricasExtras();

  const isLoading =
    loadingFinanceiro || loadingClientes || loadingPagamentos || loadingRenovacoes || metricasExtras.loading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
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
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        {saudacao}, Admin!
      </h1>

      <DashboardClientCards
        clientesAtivos={clientesAtivos}
        clientesVencidos={clientesVencidos}
        clientesDesativados={0}
      />

      <DashboardNewCards
        novosClientesHoje={metricasExtras.novosClientesHoje}
        novosClientesSemana={metricasExtras.novosClientesSemana}
        novosClientesMes={metricasExtras.novosClientesMes}
        clientesVencendoHoje={metricasExtras.clientesVencendoHoje}
        clientesVencendo3Dias={metricasExtras.clientesVencendo3Dias}
        clientesSemRenovar={metricasExtras.clientesSemRenovar}
        clientesRecuperadosMes={metricasExtras.clientesRecuperadosMes}
        totalClientesRecuperados={metricasExtras.totalClientesRecuperados}
        valoresHoje={metricasExtras.valoresHoje}
        valoresAmanha={metricasExtras.valoresAmanha}
        projecaoMensal={metricasExtras.projecaoMensal}
      />

      <DashboardFinanceCards
        entradas={entradas}
        saidas={saidas}
        lucros={lucros}
        valorTotalMes={valorTotalMes}
      />

      <DashboardCharts
        pagamentosData={pagamentosData}
        clientesNovosData={clientesNovosData}
        renovacoesData={renovacoesData}
        entradas={entradas}
        saidas={saidas}
      />

      <DashboardClientTables />
    </div>
  );
}
