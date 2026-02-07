import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
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
}: Props) {
  const clientData = clientesNovosData.map((d, i) => ({
    day: d.day,
    "Novos Clientes": d.total,
    "Renovações": renovacoesData[i]?.total ?? 0,
  }));

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Pagamentos por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pagamentosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
                <Bar dataKey="Novos Clientes" fill="hsl(var(--dashboard-green))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Renovações" fill="hsl(var(--dashboard-warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
