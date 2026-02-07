import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  ChevronRight,
  Link2,
  LayoutGrid,
  Package,
  Smartphone,
  BarChart3,
  CreditCard,
  ShoppingCart,
  Settings,
  Play,
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

  // Estilo base dos itens - plano sem background
  const menuItemClass = (active: boolean) =>
    `flex items-center justify-between w-full px-5 py-3.5 transition-colors border-0 rounded-none ${
      active 
        ? "text-white" 
        : "text-[#8b8b9a] hover:text-white"
    }`;

  return (
    <Sidebar className="border-r border-[#2a2a3c]" collapsible="icon">
      <SidebarContent className="bg-[#1a1a2e]">
        {/* Logo Header - Centered */}
        <div className="flex justify-center py-10">
          <div className="w-24 h-24 rounded-full bg-[#ff4d4d] flex items-center justify-center">
            <Play className="h-12 w-12 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0">
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                  <NavLink to="/" end className={menuItemClass(isActive("/"))}>
                    <div className="flex items-center gap-4">
                      <Home className="h-5 w-5" />
                      {!isCollapsed && <span className="text-[15px]">Dashboard</span>}
                    </div>
                    {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Clientes */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setClientesOpen((o) => !o)}
                  className={`${menuItemClass(clientesActive)} hover:bg-transparent`}
                >
                  <div className="flex items-center gap-4">
                    <Users className="h-5 w-5" />
                    {!isCollapsed && <span className="text-[15px]">Clientes</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className={`h-4 w-4 opacity-40 transition-transform ${clientesOpen ? "rotate-90" : ""}`} />}
                </SidebarMenuButton>
                {clientesOpen && !isCollapsed && (
                  <SidebarMenuSub className="ml-12 mt-1 space-y-1 border-l border-[#2a2a3c] pl-4">
                    {[
                      { to: "/clientes", label: "Listar/Criar" },
                      { to: "/clientes/planos", label: "Planos" },
                      { to: "/clientes/produtos", label: "Produtos" },
                      { to: "/clientes/aplicativos", label: "Aplicativos" },
                      { to: "/clientes/metricas", label: "Métricas" },
                      { to: "/clientes/integracoes", label: "Integrações" },
                    ].map((item) => (
                      <SidebarMenuSubItem key={item.to}>
                        <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                          <NavLink
                            to={item.to}
                            end
                            className={`py-2 text-[14px] transition-colors ${
                              isActive(item.to)
                                ? "text-white"
                                : "text-[#8b8b9a] hover:text-white"
                            }`}
                          >
                            {item.label}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Financeiro */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                  <NavLink to="/financeiro" end className={menuItemClass(isActive("/financeiro"))}>
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-5 w-5" />
                      {!isCollapsed && <span className="text-[15px]">Financeiro</span>}
                    </div>
                    {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Pagamentos */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setPagamentosOpen((o) => !o)}
                  className={`${menuItemClass(pagamentosActive)} hover:bg-transparent`}
                >
                  <div className="flex items-center gap-4">
                    <Wallet className="h-5 w-5" />
                    {!isCollapsed && (
                      <div className="flex items-center gap-2">
                        <span className="text-[15px]">Pagamentos</span>
                        <span className="bg-[#22c55e] text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                          Novo
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && <ChevronRight className={`h-4 w-4 opacity-40 transition-transform ${pagamentosOpen ? "rotate-90" : ""}`} />}
                </SidebarMenuButton>
                {pagamentosOpen && !isCollapsed && (
                  <SidebarMenuSub className="ml-12 mt-1 space-y-1 border-l border-[#2a2a3c] pl-4">
                    {[
                      { to: "/financeiro-extra/assas", label: "Assas" },
                      { to: "/financeiro-extra/checkout", label: "Checkout" },
                    ].map((item) => (
                      <SidebarMenuSubItem key={item.to}>
                        <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                          <NavLink
                            to={item.to}
                            end
                            className={`py-2 text-[14px] transition-colors ${
                              isActive(item.to)
                                ? "text-white"
                                : "text-[#8b8b9a] hover:text-white"
                            }`}
                          >
                            {item.label}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* WhatsApp */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                  <NavLink to="/parear-whatsapp" end className={menuItemClass(isActive("/parear-whatsapp"))}>
                    <div className="flex items-center gap-4">
                      <WhatsAppIcon className="h-5 w-5" />
                      {!isCollapsed && <span className="text-[15px]">WhatsApp</span>}
                    </div>
                    {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Mensagens */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                  <NavLink to="/configuracoes/mensagens-cobranca" end className={menuItemClass(isActive("/configuracoes/mensagens-cobranca"))}>
                    <div className="flex items-center gap-4">
                      <MessageSquare className="h-5 w-5" />
                      {!isCollapsed && <span className="text-[15px]">Mensagens</span>}
                    </div>
                    {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Configurações */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                  <NavLink to="/configuracoes" end className={menuItemClass(isActive("/configuracoes"))}>
                    <div className="flex items-center gap-4">
                      <Settings className="h-5 w-5" />
                      {!isCollapsed && <span className="text-[15px]">Configurações</span>}
                    </div>
                    {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
