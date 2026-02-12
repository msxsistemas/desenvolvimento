import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeft,
  Shield,
  UserCheck,
  MessageSquare,
  Wallet,
  ScrollText,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Clientes", url: "/admin/clientes", icon: UserCheck },
  { title: "Planos", url: "/admin/planos", icon: CreditCard },
  { title: "Mensagens", url: "/admin/mensagens", icon: MessageSquare },
  { title: "Gateways", url: "/admin/gateways", icon: Wallet },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: Smartphone },
  { title: "Transações", url: "/admin/transacoes", icon: DollarSign },
  { title: "Logs", url: "/admin/logs", icon: ScrollText },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-sidebar flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-sidebar-foreground">Painel Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <NavLink to="/">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Sistema
            </Button>
          </NavLink>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive" onClick={signOut}>
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
