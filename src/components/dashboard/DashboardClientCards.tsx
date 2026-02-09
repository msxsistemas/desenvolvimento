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
      borderColor: "border-success",
      textColor: "text-success",
    },
    {
      label: "Clientes Vencidos",
      value: clientesVencidos,
      icon: AlertTriangle,
      borderColor: "border-destructive",
      textColor: "text-destructive",
    },
    {
      label: "Clientes Desativados",
      value: clientesDesativados,
      icon: UserX,
      borderColor: "border-dashboard-purple",
      textColor: "text-dashboard-purple",
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border-2 ${card.borderColor} bg-transparent p-5 transition-transform duration-200 hover:scale-[1.02] shadow-lg`}
        >
          <div className="flex items-center gap-4">
            <card.icon className={`h-6 w-6 ${card.textColor}`} />
            <div>
              <p className={`text-base font-medium ${card.textColor}`}>{card.label}</p>
              <p className={`text-2xl font-bold ml-1 ${card.textColor}`}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
