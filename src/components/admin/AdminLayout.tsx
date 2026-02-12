import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeft,
  Shield,
  MessageSquare,
  Wallet,
  ScrollText,
  Settings,
  UserCheck,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SubItem {
  to: string;
  label: string;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  submenuKey?: string;
  subItems?: SubItem[];
}

const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Planos SaaS", url: "/admin/planos", icon: CreditCard },
  { title: "Assinaturas", url: "/admin/assinaturas", icon: UserCheck },
  {
    title: "Gateways",
    url: "/admin/gateways",
    icon: Wallet,
    submenuKey: "gateways",
    subItems: [
      { to: "/admin/gateways", label: "Gerenciar" },
      { to: "/admin/gateways/asaas", label: "Asaas" },
      { to: "/admin/gateways/mercadopago", label: "Mercado Pago" },
      { to: "/admin/gateways/stripe", label: "Stripe" },
      { to: "/admin/gateways/v3pay", label: "V3Pay" },
      { to: "/admin/gateways/ciabra", label: "Ciabra" },
    ],
  },
  { title: "Templates", url: "/admin/templates", icon: MessageSquare },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
  { title: "Logs", url: "/admin/logs", icon: ScrollText },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const getInitialSubmenu = () => {
    for (const item of adminNavItems) {
      if (item.submenuKey && item.subItems?.some(s => currentPath === s.to || currentPath.startsWith(s.to + "/"))) {
        return item.submenuKey;
      }
    }
    return null;
  };

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(getInitialSubmenu);

  const toggleSubmenu = (key: string) => setOpenSubmenu(prev => prev === key ? null : key);

  const isActive = (path: string) => currentPath === path;

  const isSectionActive = (item: NavItem) => {
    if (item.subItems) return item.subItems.some(s => currentPath === s.to || currentPath.startsWith(s.to + "/"));
    return currentPath === item.url;
  };

  const isMenuHighlighted = (menuKey: string, sectionActive: boolean) =>
    openSubmenu === menuKey || (sectionActive && openSubmenu === null);

  const menuItemClass = (active: boolean) =>
    `flex items-center justify-between w-full px-5 py-3 transition-all ${
      active
        ? "bg-primary/15 text-primary border-l-[3px] border-l-primary font-medium"
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground/80"
    }`;

  const subItemClass = (active: boolean) =>
    `flex items-center gap-2 py-1 text-[13px] transition-colors ${
      active ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
    }`;

  const subItemDotClass = (active: boolean) =>
    `w-2 h-2 rounded-full border ${
      active ? "border-primary bg-primary" : "border-muted-foreground bg-transparent"
    }`;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-sidebar flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-sidebar-foreground">Painel Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {adminNavItems.map((item) => {
            if (item.submenuKey && item.subItems) {
              const sectionActive = isSectionActive(item);
              return (
                <div key={item.url}>
                  <button
                    onClick={() => toggleSubmenu(item.submenuKey!)}
                    className={cn("w-full", menuItemClass(isMenuHighlighted(item.submenuKey, sectionActive)))}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-[14px] font-medium">{item.title}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openSubmenu === item.submenuKey && "rotate-180")} />
                  </button>
                  {openSubmenu === item.submenuKey && (
                    <div className="ml-8 mt-2 mb-2 space-y-1">
                      {item.subItems.map((sub) => (
                        <NavLink key={sub.to} to={sub.to} end className={subItemClass(isActive(sub.to))}>
                          <span className={subItemDotClass(isActive(sub.to))} />
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/admin"}
                onClick={() => setOpenSubmenu(null)}
                className={() => menuItemClass(isActive(item.url) && openSubmenu === null)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="text-[14px] font-medium">{item.title}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <NavLink to="/">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Sistema
            </Button>
          </NavLink>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" />
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
