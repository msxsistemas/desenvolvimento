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
          {/* Decorative circles */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-8 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center gap-3">
            <div className={`rounded-lg ${card.iconBgColor} p-2`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
