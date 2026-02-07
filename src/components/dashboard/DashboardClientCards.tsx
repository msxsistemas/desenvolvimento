import { Users, AlertTriangle, UserX } from "lucide-react";

interface Props {
  clientesAtivos: number;
  clientesVencidos: number;
  clientesDesativados?: number;
}

export default function DashboardClientCards({
  clientesAtivos,
  clientesVencidos,
  clientesDesativados = 0,
}: Props) {
  const cards = [
    {
      label: "Clientes Ativos",
      value: clientesAtivos,
      icon: Users,
      bgColor: "bg-[hsl(142,70%,45%)]",
      iconBgColor: "bg-[hsl(142,60%,35%)]",
    },
    {
      label: "Clientes Vencidos",
      value: clientesVencidos,
      icon: AlertTriangle,
      bgColor: "bg-[hsl(0,72%,51%)]",
      iconBgColor: "bg-[hsl(0,60%,40%)]",
    },
    {
      label: "Clientes Desativados",
      value: clientesDesativados,
      icon: UserX,
      bgColor: "bg-[hsl(300,70%,40%)]",
      iconBgColor: "bg-[hsl(300,60%,30%)]",
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-xl ${card.bgColor} p-5 text-white transition-transform duration-200 hover:scale-[1.02]`}
        >
          {/* Subtle glow effect */}
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/8 to-transparent" />
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/10 blur-xl" />

          <div className="relative z-10 flex items-center gap-4">
            <card.icon className="h-6 w-6 text-white/80" />
            <div>
              <p className="text-sm font-medium text-white/90">{card.label}</p>
              <p className="text-xl font-bold ml-1">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
