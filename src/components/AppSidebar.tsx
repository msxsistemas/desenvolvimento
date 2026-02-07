import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  DollarSign,
  Wallet,
  MessageSquare,
  ChevronDown,
  Circle,
  Link2,
  LayoutGrid,
  Package,
  Smartphone,
  BarChart3,
  CreditCard,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";

// Custom WhatsApp icon to match sidebar icon API
const WhatsAppIcon = (props: LucideProps) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    stroke="none"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M20.52 3.48A11.8 11.8 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.2-1.62A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.18-3.48-8.52zM12 22a9.94 9.94 0 01-5.45-1.5l-.39-.23-3.67.96.98-3.58-.25-.41A9.9 9.9 0 012 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.96 9.96 0 0122 12c0 5.52-4.48 10-10 10zm5.38-7.62c-.29-.14-1.71-.84-1.97-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.2-.62.07-.29-.14-1.21-.45-2.3-1.43-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.45.12-.59.12-.12.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.56-.88-2.14-.23-.55-.47-.48-.64-.48h-.55c-.17 0-.45.07-.69.36-.24.29-.9.88-.9 2.14s.93 2.48 1.06 2.65c.14.19 1.83 2.8 4.43 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.71-.7 1.95-1.37.24-.67.24-1.24.17-1.37-.07-.12-.26-.2-.55-.33z" />
  </svg>
);

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  // Estado do submenu Clientes
  const clientesActive =
    currentPath === "/clientes" || currentPath.startsWith("/clientes/");
  const [clientesOpen, setClientesOpen] = useState(clientesActive);

  // Estado do submenu Pagamentos
  const pagamentosActive =
    currentPath === "/financeiro-extra" || currentPath.startsWith("/financeiro-extra/");
  const [pagamentosOpen, setPagamentosOpen] = useState(pagamentosActive);

  const isActive = (path: string) => currentPath === path;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
      isActive 
        ? "bg-sidebar-accent text-sidebar-primary font-medium" 
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    }`;

  const getSubNavCls = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
      active 
        ? "bg-sidebar-accent text-sidebar-primary font-medium" 
        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    }`;

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <SidebarContent className="bg-sidebar-background">
        {/* Logo/Brand Header */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-base tracking-tight">GESTOR TP</span>
              <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Painel Admin</span>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="p-0">
                  <NavLink
                    to="/"
                    end
                    className={getNavCls}
                    aria-current={isActive("/") ? "page" : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--dashboard-cyan))]/20 flex items-center justify-center">
                      <Home className="h-4 w-4 text-[hsl(var(--dashboard-cyan))]" />
                    </div>
                    {!isCollapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gerenciamento Section */}
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-3 mb-2">
            Gerenciamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Grupo Clientes com submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setClientesOpen((o) => !o)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all w-full ${
                    clientesActive 
                      ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  aria-expanded={clientesOpen}
                  aria-controls="submenu-clientes"
                >
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--dashboard-green))]/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-[hsl(var(--dashboard-green))]" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">Clientes</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${clientesOpen ? "rotate-180" : ""}`} />
                    </>
                  )}
                </SidebarMenuButton>
                {clientesOpen && !isCollapsed && (
                  <SidebarMenuSub id="submenu-clientes" className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes" end className={getSubNavCls(isActive("/clientes"))}>
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span>Listar/Criar</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes/planos" end className={getSubNavCls(isActive("/clientes/planos"))}>
                          <Package className="h-3.5 w-3.5" />
                          <span>Planos</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes/produtos" end className={getSubNavCls(isActive("/clientes/produtos"))}>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Produtos</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes/aplicativos" end className={getSubNavCls(isActive("/clientes/aplicativos"))}>
                          <Smartphone className="h-3.5 w-3.5" />
                          <span>Aplicativos</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes/metricas" end className={getSubNavCls(isActive("/clientes/metricas"))}>
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Métricas</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/clientes/integracoes" end className={getSubNavCls(isActive("/clientes/integracoes"))}>
                          <Link2 className="h-3.5 w-3.5" />
                          <span>Integrações</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Financeiro */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="p-0">
                  <NavLink
                    to="/financeiro"
                    end
                    className={getNavCls}
                    aria-current={isActive("/financeiro") ? "page" : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--warning))]/20 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-[hsl(var(--warning))]" />
                    </div>
                    {!isCollapsed && <span>Financeiro</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações Section */}
        <SidebarGroup className="px-3 mt-2">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-3 mb-2">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Pagamentos com submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setPagamentosOpen((o) => !o)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all w-full ${
                    pagamentosActive 
                      ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  aria-expanded={pagamentosOpen}
                  aria-controls="submenu-pagamentos"
                >
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--dashboard-purple))]/20 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-[hsl(var(--dashboard-purple))]" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">Pagamentos</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${pagamentosOpen ? "rotate-180" : ""}`} />
                    </>
                  )}
                </SidebarMenuButton>
                {pagamentosOpen && !isCollapsed && (
                  <SidebarMenuSub id="submenu-pagamentos" className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/financeiro-extra/assas" end className={getSubNavCls(isActive("/financeiro-extra/assas"))}>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Assas</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="p-0">
                        <NavLink to="/financeiro-extra/checkout" end className={getSubNavCls(isActive("/financeiro-extra/checkout"))}>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Checkout</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* WhatsApp */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="p-0">
                  <NavLink
                    to="/parear-whatsapp"
                    end
                    className={getNavCls}
                    aria-current={isActive("/parear-whatsapp") ? "page" : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 flex items-center justify-center">
                      <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                    </div>
                    {!isCollapsed && <span>WhatsApp</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Mensagens de Cobrança */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="p-0">
                  <NavLink
                    to="/configuracoes/mensagens-cobranca"
                    end
                    className={getNavCls}
                    aria-current={isActive("/configuracoes/mensagens-cobranca") ? "page" : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--dashboard-red))]/20 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-[hsl(var(--dashboard-red))]" />
                    </div>
                    {!isCollapsed && <span>Mensagens de Cobrança</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer to push footer down */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <NavLink
            to="/configuracoes"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
              isActive("/configuracoes")
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
              <Settings className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            {!isCollapsed && <span>Configurações</span>}
          </NavLink>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
