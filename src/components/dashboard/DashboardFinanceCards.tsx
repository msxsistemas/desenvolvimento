import { DollarSign, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Props {
  entradas: number;
  saidas: number;
  lucros: number;
  valorTotalMes: number;
  valorTotalAno?: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function DashboardFinanceCards({ 
  entradas, 
  saidas, 
  lucros, 
  valorTotalMes,
  valorTotalAno = 0
}: Props) {
  const [showValues, setShowValues] = useState(true);
  
  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
  const currentYear = new Date().getFullYear();
  
  const saldoMes = lucros;
  const saldoAno = valorTotalAno || lucros * 12;

  const cards = [
    {
      label: "Saldo Líquido do Mês",
      badge: currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
      badgeColor: "bg-[hsl(142,70%,45%)]",
      value: saldoMes,
    },
    {
      label: "Saldo Líquido do Ano",
      badge: currentYear.toString(),
      badgeColor: "bg-[hsl(0,72%,51%)]",
      value: saldoAno,
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {cards.map((c) => (
        <Card key={c.label} className="bg-card border-border">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[hsl(199,89%,48%)]/20 p-3">
                <DollarSign className="h-6 w-6 text-[hsl(199,89%,48%)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <Badge className={`${c.badgeColor} text-white text-xs px-2 py-0.5`}>
                    {c.badge}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {showValues ? fmt(c.value) : "R$ •••••"}
                  </p>
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showValues ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-full bg-[hsl(199,89%,48%)]/10 p-3">
              <DollarSign className="h-6 w-6 text-[hsl(199,89%,48%)]/50" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
