import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface Props {
  pagamentosData: Array<{ day: string; valor: number }>;
  clientesNovosData: Array<{ day: string; total: number }>;
  renovacoesData: Array<{ day: string; total: number }>;
  entradas: number;
  saidas: number;
}

export default function DashboardCharts({
  pagamentosData,
  clientesNovosData,
  renovacoesData,
  entradas,
  saidas,
}: Props) {
  // Merge finance data
  const financeData = pagamentosData.map((d, i) => ({
    day: d.day,
    receita: d.valor,
    despesas: d.valor > 0 ? d.valor * (saidas / (entradas || 1)) : 0,
  }));

  // Merge client movement data
  const clientData = clientesNovosData.map((d, i) => ({
    day: d.day,
    novos: d.total,
    renovacoes: renovacoesData[i]?.total ?? 0,
    cancelamentos: 0,
  }));

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <section className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {/* Receita vs Despesas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Receita vs Despesas</CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeData}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--dashboard-success))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--dashboard-success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--dashboard-danger))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--dashboard-danger))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="hsl(var(--dashboard-success))"
                  fill="url(#gReceita)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="hsl(var(--dashboard-danger))"
                  fill="url(#gDespesas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Movimentação de Clientes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Movimentação de Clientes</CardTitle>
          <p className="text-xs text-muted-foreground">Novos, Renovações e Cancelamentos</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientData}>
                <defs>
                  <linearGradient id="gNovos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--dashboard-secondary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--dashboard-secondary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRenov" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--dashboard-warning))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--dashboard-warning))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="novos"
                  name="Novos"
                  stroke="hsl(var(--dashboard-secondary))"
                  fill="url(#gNovos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="renovacoes"
                  name="Renovações"
                  stroke="hsl(var(--dashboard-warning))"
                  fill="url(#gRenov)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cancelamentos"
                  name="Cancelamentos"
                  stroke="hsl(var(--dashboard-danger))"
                  fillOpacity={0}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
