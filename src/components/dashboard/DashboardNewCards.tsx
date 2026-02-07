import { Users, TrendingUp } from "lucide-react";

interface Props {
  novosClientesHoje: number;
  novosClientesSemana: number;
  novosClientesMes: number;
  clientesVencendoHoje: number;
  clientesVencendo3Dias: number;
  clientesSemRenovar: number;
  clientesRecuperadosMes: number;
  totalClientesRecuperados: number;
  valoresHoje: number;
  valoresAmanha: number;
  projecaoMensal: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function DashboardNewCards({
  novosClientesHoje,
  novosClientesSemana,
  novosClientesMes,
  clientesVencendoHoje,
  clientesVencendo3Dias,
  clientesSemRenovar,
  clientesRecuperadosMes,
  totalClientesRecuperados,
  valoresHoje,
  valoresAmanha,
  projecaoMensal,
}: Props) {
  return (
    <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1 - Novos Clientes */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border p-5 text-white flex items-center gap-4">
        <div className="rounded-full bg-[hsl(142,70%,45%)]/20 p-2">
          <Users className="h-6 w-6 text-[hsl(142,70%,45%)]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(142,70%,45%)]" />
            <span className="text-sm text-muted-foreground">Novos Clientes Hoje</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{novosClientesHoje}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(142,70%,45%)]" />
            <span className="text-sm text-muted-foreground">Novos Clientes Esta Semana</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{novosClientesSemana}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(142,70%,45%)]" />
            <span className="text-sm text-muted-foreground">Novos Clientes Este Mês</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{novosClientesMes}</span>
          </div>
        </div>
      </div>

      {/* Card 2 - Clientes Vencendo */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border p-5 text-white flex items-center gap-4">
        <div className="rounded-full bg-[hsl(142,70%,45%)]/20 p-2">
          <Users className="h-6 w-6 text-[hsl(142,70%,45%)]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Clientes Vencendo Hoje</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{clientesVencendoHoje}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Clientes Vencendo em 3 Dias</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{clientesVencendo3Dias}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Clientes sem Renovar este Mês</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{clientesSemRenovar}</span>
          </div>
        </div>
      </div>

      {/* Card 3 - Projeção */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-full bg-[hsl(142,70%,45%)]/20 p-1">
            <TrendingUp className="h-4 w-4 text-[hsl(142,70%,45%)]" />
          </div>
          <span className="text-sm text-muted-foreground">Valores a Receber</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[hsl(142,70%,45%)]" />
            <span className="text-sm text-muted-foreground">Projeção Mensal</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{fmt(projecaoMensal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(142,70%,45%)]">$</span>
            <span className="text-sm text-muted-foreground">Hoje</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{fmt(valoresHoje)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(142,70%,45%)]">$</span>
            <span className="text-sm text-muted-foreground">Amanhã</span>
            <span className="text-[hsl(142,70%,45%)] font-semibold">{fmt(valoresAmanha)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
