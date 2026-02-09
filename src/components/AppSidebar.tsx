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
  
  Globe,
  MessageSquare,
  Share2,
  MoreHorizontal,
  ScrollText,
  ChevronRight,
  ChevronDown,
  Phone,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";
import logoPlay from "@/assets/logo-play.png";

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
  const planosActive = currentPath === "/planos" || currentPath.startsWith("/planos/");
  const aplicativosActive = currentPath === "/aplicativos" || currentPath.startsWith("/aplicativos/");
  const produtosActive = currentPath === "/produtos" || currentPath.startsWith("/produtos/");
  const whatsappActive = currentPath.startsWith("/whatsapp") || currentPath === "/parear-whatsapp";
  const logsActive = currentPath.startsWith("/logs");
  const indicacoesActive = currentPath.startsWith("/indicacoes");
  const outrosActive = currentPath.startsWith("/outros") || currentPath === "/configuracoes/mensagens-padroes";
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(
    clientesActive ? "clientes" : planosActive ? "planos" : aplicativosActive ? "aplicativos" : produtosActive ? "produtos" : whatsappActive ? "whatsapp" : logsActive ? "logs" : indicacoesActive ? "indicacoes" : outrosActive ? "outros" : null
  );

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(prev => prev === menu ? null : menu);
  };

  const isActive = (path: string) => currentPath === path;

  // Estilo base dos itens
  const menuItemClass = (active: boolean) =>
    `flex items-center justify-between w-full px-5 py-3 transition-colors border-0 rounded-none ${
      active ? "text-white" : "text-muted-foreground hover:text-white"
    }`;

  // Menu items baseado na imagem de referência
  const menuItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/clientes", icon: Users, label: "Clientes", hasSubmenu: true },
    { to: "/planos", icon: List, label: "Planos", hasPlanosSubmenu: true },
    { to: "/aplicativos", icon: Package, label: "Aplicativos", hasAplicativosSubmenu: true },
    { to: "/produtos", icon: Package, label: "Produtos", hasProdutosSubmenu: true },
    { to: "/servidores", icon: Server, label: "Servidores" },
    { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
    
    { to: "/relatorios", icon: Filter, label: "Relatórios" },
    { to: "/configuracoes", icon: Globe, label: "Gateways" },
    { to: "/whatsapp", icon: WhatsAppIcon, label: "WhatsApp", hasWhatsappSubmenu: true },
    { to: "/indicacoes", icon: Share2, label: "Indicações", hasIndicacoesSubmenu: true },
    { to: "/outros", icon: MoreHorizontal, label: "Outros", hasOutrosSubmenu: true },
    { to: "/logs", icon: ScrollText, label: "Logs", hasLogsSubmenu: true },
  ];

  // Subitens do Clientes
  const clientesSubItems = [
    { to: "/clientes/cadastro", label: "Adicionar" },
    { to: "/clientes", label: "Gerenciar" },
  ];

  // Subitens do Planos
  const planosSubItems = [
    { to: "/planos/cadastro", label: "Adicionar" },
    { to: "/planos", label: "Gerenciar" },
  ];

  // Subitens do Aplicativos
  const aplicativosSubItems = [
    { to: "/aplicativos/cadastro", label: "Adicionar" },
    { to: "/aplicativos", label: "Gerenciar" },
  ];

  // Subitens do Produtos
  const produtosSubItems = [
    { to: "/produtos/cadastro", label: "Adicionar" },
    { to: "/produtos", label: "Gerenciar" },
  ];

  // Subitens do WhatsApp
  const whatsappSubItems = [
    { to: "/whatsapp/gerenciar-mensagens", label: "Gerenciar Mensagens" },
    { to: "/whatsapp/fila-mensagens", label: "Fila de Mensagens" },
    { to: "/whatsapp/envios-em-massa", label: "Envios em Massa" },
    { to: "/whatsapp/templates", label: "Templates" },
    { to: "/whatsapp/parear", label: "Parear Whatsapp" },
  ];

  // Subitens do Logs
  const logsSubItems = [
    { to: "/logs/painel", label: "Logs do Painel" },
    { to: "/logs/sistema", label: "Logs do Sistema" },
  ];

  // Subitens das Indicações
  const indicacoesSubItems = [
    { to: "/indicacoes/clientes", label: "Indicação de Clientes" },
    { to: "/indicacoes/sistema", label: "Indicação do Sistema" },
  ];

  // Subitens do Outros
  const outrosSubItems = [
    { to: "/outros/cupom", label: "Cupom" },
  ];

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarContent className="bg-background">
        {/* Logo Header */}
        <div className="flex justify-center py-6">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg shadow-destructive/30">
            <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Separator Line */}
        <div className="mx-4 border-t border-border/50 mb-2" />

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
                        onClick={() => toggleSubmenu("clientes")}
                        className={`${menuItemClass(clientesActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "clientes" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "clientes" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {clientesSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                 <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  {/* Círculo indicador */}
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Planos com submenu
                if (item.hasPlanosSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("planos")}
                        className={`${menuItemClass(planosActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "planos" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "planos" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {planosSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Aplicativos com submenu
                if (item.hasAplicativosSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("aplicativos")}
                        className={`${menuItemClass(aplicativosActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "aplicativos" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "aplicativos" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {aplicativosSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Produtos com submenu
                if (item.hasProdutosSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("produtos")}
                        className={`${menuItemClass(produtosActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "produtos" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "produtos" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {produtosSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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
                        onClick={() => toggleSubmenu("whatsapp")}
                        className={`h-auto p-0 hover:bg-transparent rounded-none ${whatsappActive ? "" : ""}`}
                      >
                        <div className={`flex items-center justify-between w-full px-5 py-3 transition-all ${
                          whatsappActive 
                            ? "bg-gradient-to-r from-dashboard-purple to-dashboard-purple/80 text-white rounded-lg mx-2" 
                            : "text-muted-foreground hover:text-white"
                        }`}>
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5" />
                            {!isCollapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                          </div>
                          {!isCollapsed && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${openSubmenu === "whatsapp" ? "rotate-180" : ""}`}
                            />
                          )}
                        </div>
                      </SidebarMenuButton>
                      {openSubmenu === "whatsapp" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {whatsappSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  {/* Círculo indicador */}
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Logs com submenu
                if (item.hasLogsSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("logs")}
                        className={`${menuItemClass(logsActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "logs" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "logs" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {logsSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Indicações com submenu
                if (item.hasIndicacoesSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("indicacoes")}
                        className={`${menuItemClass(indicacoesActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "indicacoes" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "indicacoes" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {indicacoesSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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

                // Item Outros com submenu
                if (item.hasOutrosSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("outros")}
                        className={`${menuItemClass(outrosActive)} hover:bg-transparent`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={`h-4 w-4 opacity-50 transition-transform ${openSubmenu === "outros" ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarMenuButton>
                      {openSubmenu === "outros" && !isCollapsed && (
                        <SidebarMenuSub className="ml-8 mt-2 space-y-1">
                          {outrosSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.to}>
                              <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
                                <NavLink
                                  to={subItem.to}
                                  end
                                  className={`flex items-center gap-2 py-1 text-[13px] transition-colors ${
                                    isActive(subItem.to) ? "text-sidebar-primary" : "text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${
                                    isActive(subItem.to) 
                                      ? "border-sidebar-primary bg-sidebar-primary" 
                                      : "border-muted-foreground bg-transparent"
                                  }`} />
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
                          {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                        </div>
                        {/* Não mostrar seta no Dashboard */}
                        {!isCollapsed && item.to !== "/" && <ChevronRight className="h-4 w-4 opacity-50" />}
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