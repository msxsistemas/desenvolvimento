import { DollarSign, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  entradas: number;
  saidas: number;
  lucros: number;
  valorTotalMes: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function DashboardFinanceCards({ entradas, saidas, lucros, valorTotalMes }: Props) {
  const cards = [
    {
      label: "Receita do Mês",
      value: fmt(entradas),
      icon: DollarSign,
      color: "text-dashboard-success",
      bg: "bg-dashboard-success/10",
      border: "border-dashboard-success/20",
    },
    {
      label: "Despesas do Mês",
      value: fmt(saidas),
      icon: TrendingDown,
      color: "text-dashboard-danger",
      bg: "bg-dashboard-danger/10",
      border: "border-dashboard-danger/20",
    },
    {
      label: "Lucro do Mês",
      value: fmt(lucros),
      icon: TrendingUp,
      color: "text-dashboard-secondary",
      bg: "bg-dashboard-secondary/10",
      border: "border-dashboard-secondary/20",
    },
    {
      label: "Projeção Próximo Mês",
      value: fmt(valorTotalMes * 1.1),
      icon: BarChart3,
      color: "text-dashboard-warning",
      bg: "bg-dashboard-warning/10",
      border: "border-dashboard-warning/20",
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className={`${c.bg} border ${c.border}`}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded-lg ${c.bg} p-3`}>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
