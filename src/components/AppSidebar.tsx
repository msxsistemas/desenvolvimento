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
  Server,
  List,
  Package,
  DollarSign,
  ArrowLeftRight,
  Filter,
  Tag,
  Globe,
  Webhook,
  MessageSquare,
  Share2,
  MoreHorizontal,
  ScrollText,
  ChevronRight,
  ChevronDown,
  Play,
  Phone,
} from "lucide-react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";

// Custom WhatsApp icon
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

  // Estado dos submenus
  const clientesActive = currentPath === "/clientes" || currentPath.startsWith("/clientes/");
  const whatsappActive = currentPath.startsWith("/whatsapp") || currentPath === "/parear-whatsapp";
  const [clientesOpen, setClientesOpen] = useState(clientesActive);
  const [whatsappOpen, setWhatsappOpen] = useState(whatsappActive);

  const isActive = (path: string) => currentPath === path;

  // Estilo base dos itens
  const menuItemClass = (active: boolean) =>
    `flex items-center justify-between w-full px-5 py-3 transition-colors border-0 rounded-none ${
      active ? "text-white" : "text-[#8b8b9a] hover:text-white"
    }`;

  // Menu items baseado na imagem de referência
  const menuItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/clientes", icon: Users, label: "Clientes", hasSubmenu: true },
    { to: "/clientes/integracoes", icon: Server, label: "Servidores" },
    { to: "/clientes/planos", icon: List, label: "Planos" },
    { to: "/clientes/produtos", icon: Package, label: "Produtos" },
    { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
    { to: "/financeiro-extra/assas", icon: ArrowLeftRight, label: "Movimentações" },
    { to: "/clientes/metricas", icon: Filter, label: "Relatórios" },
    { to: "/marketing", icon: Tag, label: "Tags" },
    { to: "/financeiro-extra/checkout", icon: Globe, label: "V3Pay", badge: "Novo!" },
    { to: "/configuracoes", icon: Globe, label: "Gateways" },
    { to: "/configuracoes/ativar-cobrancas", icon: Webhook, label: "WebHook" },
    { to: "/whatsapp", icon: WhatsAppIcon, label: "WhatsApp", hasWhatsappSubmenu: true },
    { to: "/mensagens-enviadas", icon: MessageSquare, label: "SMS" },
    { to: "/configuracoes/mensagens-cobranca", icon: Share2, label: "Indicações" },
    { to: "/configuracoes/mensagens-padroes", icon: MoreHorizontal, label: "Outros" },
    { to: "/tutoriais", icon: ScrollText, label: "Logs" },
  ];

  // Subitens do Clientes
  const clientesSubItems = [
    { to: "/clientes", label: "Listar/Criar" },
    { to: "/clientes/planos", label: "Planos" },
    { to: "/clientes/produtos", label: "Produtos" },
    { to: "/clientes/aplicativos", label: "Aplicativos" },
    { to: "/clientes/metricas", label: "Métricas" },
    { to: "/clientes/integracoes", label: "Integrações" },
  ];

  // Subitens do WhatsApp
  const whatsappSubItems = [
    { to: "/whatsapp/gerenciar-mensagens", label: "Gerenciar Mensagens" },
    { to: "/whatsapp/fila-mensagens", label: "Fila de Mensagens" },
    { to: "/whatsapp/envios-em-massa", label: "Envios em Massa" },
    { to: "/whatsapp/templates", label: "Templates" },
    { to: "/whatsapp/parear", label: "Parear Whatsapp" },
  ];

  return (
    <Sidebar className="border-r border-[#2a2a3c]" collapsible="icon">
      <SidebarContent className="bg-[#1e1e2d]">
        {/* Logo Header */}
        <div className="flex justify-center py-8">
          <div className="w-20 h-20 rounded-full bg-[#e63946] flex items-center justify-center shadow-lg shadow-[#e63946]/30">
            <Play className="h-10 w-10 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Separator Line */}
        <div className="mx-4 border-t border-[#2d2d3d] mb-2" />

        {/* Main Navigation */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0">
              {menuItems.map((item) => {
                // Item Clientes com submenu
                if (item.hasSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => setClientesOpen((o) => !o)}
                        className={`${menuItemClass(clientesActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${clientesOpen ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {clientesOpen && !isCollapsed && (
                        <SidebarMenuSub className="ml-10 mt-1 space-y-0 border-l border-[#2a2a3c] pl-4">
                          {clientesSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`py-1.5 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-white" : "text-[#8b8b9a] hover:text-white"
                                  }`}
                                >
                                  {subItem.label}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // Item WhatsApp com submenu
                if (item.hasWhatsappSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => setWhatsappOpen((o) => !o)}
                        className={`h-auto p-0 hover:bg-transparent rounded-none ${whatsappActive ? "" : ""}`}
                      >
                        <div className={`flex items-center justify-between w-full px-5 py-3 transition-all ${
                          whatsappActive 
                            ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg mx-2" 
                            : "text-[#8b8b9a] hover:text-white"
                        }`}>
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5" />
                            {!isCollapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                          </div>
                          {!isCollapsed && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${whatsappOpen ? "rotate-180" : ""}`}
                            />
                          )}
                        </div>
                      </SidebarMenuButton>
                      {whatsappOpen && !isCollapsed && (
                        <SidebarMenuSub className="ml-10 mt-1 space-y-0 border-l border-[#2a2a3c] pl-4">
                          {whatsappSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`py-1.5 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-white" : "text-[#8b8b9a] hover:text-white"
                                  }`}
                                >
                                  {subItem.label}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // Items normais
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent rounded-none">
                      <NavLink to={item.to} end className={menuItemClass(isActive(item.to))}>
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && (
                            <div className="flex items-center gap-2">
                              <span className="text-[14px]">{item.label}</span>
                              {item.badge && (
                                <span className="bg-[#22c55e] text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-50" />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}