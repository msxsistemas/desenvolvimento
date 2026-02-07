import { Users, AlertTriangle, Clock, UserPlus } from "lucide-react";

interface Props {
  clientesAtivos: number;
  clientesVencidos: number;
  clientesNovosHoje: number;
  totalClientes: number;
}

export default function DashboardClientCards({
  clientesAtivos,
  clientesVencidos,
  clientesNovosHoje,
  totalClientes,
}: Props) {
  const cards = [
    {
      label: "Clientes Ativos",
      value: clientesAtivos,
      icon: Users,
      gradient: "from-[hsl(142,70%,40%)] to-[hsl(142,60%,55%)]",
      shadow: "shadow-[0_8px_32px_hsl(142,70%,45%/0.3)]",
    },
    {
      label: "Clientes Vencidos",
      value: clientesVencidos,
      icon: AlertTriangle,
      gradient: "from-[hsl(0,84%,55%)] to-[hsl(0,70%,65%)]",
      shadow: "shadow-[0_8px_32px_hsl(0,84%,60%/0.3)]",
    },
    {
      label: "Clientes a Vencer",
      value: 0,
      icon: Clock,
      gradient: "from-[hsl(38,92%,45%)] to-[hsl(38,80%,60%)]",
      shadow: "shadow-[0_8px_32px_hsl(38,92%,50%/0.3)]",
    },
    {
      label: "Novos no Mês",
      value: totalClientes,
      icon: UserPlus,
      gradient: "from-[hsl(199,89%,42%)] to-[hsl(220,80%,60%)]",
      shadow: "shadow-[0_8px_32px_hsl(199,89%,48%/0.3)]",
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} p-5 text-white transition-transform duration-200 hover:scale-[1.03]`}
        >
          {/* Decorative circle */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{card.label}</p>
              <p className="mt-1 text-3xl font-bold">{card.value}</p>
            </div>
            <card.icon className="h-10 w-10 text-white/40" />
          </div>
        </div>
      ))}
    </section>
  );
}
