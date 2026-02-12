import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, DollarSign, CreditCard, TrendingUp, Receipt, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GlobalStats {
  totalUsers: number;
  totalClientes: number;
  clientesAtivos: number;
  totalReceita: number;
  totalCobrancas: number;
  cobrancasPagas: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard Admin | Msx Gestor";
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(
          `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action: "global_stats" }),
          }
        );
        const result = await resp.json();
        if (result.success) setStats(result.stats);
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = stats
    ? [
        { title: "Usuários do Sistema", value: stats.totalUsers, icon: Users, color: "text-primary" },
        { title: "Clientes Total", value: stats.totalClientes, icon: UserCheck, color: "text-primary" },
        { title: "Clientes Ativos", value: stats.clientesAtivos, icon: TrendingUp, color: "text-primary" },
        { title: "Receita Total", value: `R$ ${stats.totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-primary" },
        { title: "Cobranças Geradas", value: stats.totalCobrancas, icon: Receipt, color: "text-primary" },
        { title: "Cobranças Pagas", value: stats.cobrancasPagas, icon: CreditCard, color: "text-primary" },
      ]
    : [];

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            <h1 className="text-base font-semibold tracking-tight">Dashboard Administrativo</h1>
          </div>
          <p className="text-xs/6 opacity-90">Visão geral de todos os usuários e métricas do sistema.</p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-sm animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
