import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Server, Lock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROVEDORES } from "@/components/servidores/ProvedoresList";

const PROVIDER_ROUTES: Record<string, string> = {
  'sigma-v2': '/servidores/sigma',
  'koffice-api': '/servidores/koffice-api',
  'koffice-v2': '/servidores/koffice-v2',
};

export default function ServidoresIndex() {
  useEffect(() => {
    document.title = "Servidores | Tech Play";
  }, []);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Servidores IPTV</h1>
            <p className="text-sm text-muted-foreground">Selecione um provedor para gerenciar seus painéis</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVEDORES.map((provedor) => {
          const route = PROVIDER_ROUTES[provedor.id];
          const isIntegrado = provedor.integrado;

          if (isIntegrado && route) {
            return (
              <NavLink
                key={provedor.id}
                to={route}
                className="rounded-lg p-5 bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Server className="w-5 h-5 text-green-500" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-foreground">{provedor.nome}</h3>
                <p className="text-sm text-muted-foreground mt-1">{provedor.descricao}</p>
                <Badge className="mt-3 bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/10">
                  Integrado
                </Badge>
              </NavLink>
            );
          }

          return (
            <div
              key={provedor.id}
              className="rounded-lg p-5 bg-card border border-border opacity-60"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground">{provedor.nome}</h3>
              <p className="text-sm text-muted-foreground mt-1">{provedor.descricao}</p>
              <Badge variant="outline" className="mt-3 text-amber-400 border-amber-400/50 bg-amber-400/10">
                Em breve
              </Badge>
            </div>
          );
        })}
      </div>
    </main>
  );
}
