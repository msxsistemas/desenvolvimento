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
import { useSystemLogo } from "@/hooks/useSystemLogo";
import logoMsx from "@/assets/logo-msx.png";

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
  const logoUrl = useSystemLogo();

  // Estado dos submenus
  const clientesActive = currentPath === "/clientes" || currentPath.startsWith("/clientes/");
  const planosActive = currentPath === "/planos" || currentPath.startsWith("/planos/");
  const aplicativosActive = currentPath === "/aplicativos" || currentPath.startsWith("/aplicativos/");
  const produtosActive = currentPath === "/produtos" || currentPath.startsWith("/produtos/");
  const financeiroActive = currentPath.startsWith("/financeiro");
  const whatsappActive = currentPath.startsWith("/whatsapp") || currentPath === "/parear-whatsapp";
  const logsActive = currentPath.startsWith("/logs");
  const indicacoesActive = currentPath.startsWith("/indicacoes");
  const outrosActive = currentPath.startsWith("/outros") || currentPath === "/configuracoes/mensagens-padroes";
  const gatewaysActive = currentPath === "/configuracoes" || currentPath.startsWith("/configuracoes/asaas") || currentPath.startsWith("/configuracoes/mercado-pago") || currentPath.startsWith("/configuracoes/ciabra") || currentPath.startsWith("/configuracoes/pix-manual") || currentPath.startsWith("/configuracoes/v3pay") || currentPath.startsWith("/gateways/");
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(
    clientesActive ? "clientes" : planosActive ? "planos" : aplicativosActive ? "aplicativos" : produtosActive ? "produtos" : currentPath.startsWith("/servidores") ? "servidores" : financeiroActive ? "financeiro" : whatsappActive ? "whatsapp" : logsActive ? "logs" : indicacoesActive ? "indicacoes" : outrosActive ? "outros" : gatewaysActive ? "gateways" : null
  );

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(prev => prev === menu ? null : menu);
  };

  const isActive = (path: string) => currentPath === path;

  // Estilo base dos itens - com destaque de cor quando ativo
  const menuItemClass = (active: boolean) =>
    `flex items-center justify-between w-full px-5 py-3 transition-all border-0 rounded-none ${
      active 
        ? "bg-primary/15 text-primary border-l-[3px] border-l-primary font-medium" 
        : "text-muted-foreground hover:text-muted-foreground/80"
    }`;

  // Estilo para subitens ativos
  const subItemClass = (active: boolean) =>
    `flex items-center gap-2 py-1 text-[13px] transition-colors ${
      active ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
    }`;

  const subItemDotClass = (active: boolean) =>
    `w-2 h-2 rounded-full border ${
      active 
        ? "border-primary bg-primary" 
        : "border-muted-foreground bg-transparent"
    }`;

  // Menu items
  const menuItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/clientes", icon: Users, label: "Clientes", hasSubmenu: true },
    { to: "/planos", icon: List, label: "Planos", hasPlanosSubmenu: true },
    { to: "/aplicativos", icon: Package, label: "Aplicativos", hasAplicativosSubmenu: true },
    { to: "/produtos", icon: Package, label: "Produtos", hasProdutosSubmenu: true },
    { to: "/servidores", icon: Server, label: "Servidores", hasServidoresSubmenu: true },
    { to: "/financeiro", icon: DollarSign, label: "Financeiro", hasFinanceiroSubmenu: true },
    { to: "/relatorios", icon: Filter, label: "Relatórios" },
    { to: "/configuracoes", icon: Globe, label: "Gateways", hasGatewaysSubmenu: true },
    { to: "/whatsapp", icon: WhatsAppIcon, label: "WhatsApp", hasWhatsappSubmenu: true },
    { to: "/indicacoes", icon: Share2, label: "Indicações", hasIndicacoesSubmenu: true },
    { to: "/outros", icon: MoreHorizontal, label: "Outros", hasOutrosSubmenu: true },
    { to: "/logs", icon: ScrollText, label: "Logs", hasLogsSubmenu: true },
  ];

  const clientesSubItems = [
    { to: "/clientes/cadastro", label: "Adicionar" },
    { to: "/clientes", label: "Gerenciar" },
  ];
  const planosSubItems = [
    { to: "/planos/cadastro", label: "Adicionar" },
    { to: "/planos", label: "Gerenciar" },
  ];
  const aplicativosSubItems = [
    { to: "/aplicativos/cadastro", label: "Adicionar" },
    { to: "/aplicativos", label: "Gerenciar" },
  ];
  const produtosSubItems = [
    { to: "/produtos/cadastro", label: "Adicionar" },
    { to: "/produtos", label: "Gerenciar" },
  ];
  const financeiroSubItems = [
    { to: "/financeiro", label: "Geral" },
    { to: "/financeiro/nova-transacao", label: "Nova Transação" },
  ];
  const whatsappSubItems = [
    { to: "/whatsapp/parear", label: "Parear Whatsapp" },
    { to: "/whatsapp/configuracao-envio", label: "Configuração de Envio" },
    { to: "/whatsapp/gerenciar-mensagens", label: "Gerenciar Mensagens" },
    { to: "/whatsapp/fila-mensagens", label: "Fila de Mensagens" },
    { to: "/whatsapp/envios-em-massa", label: "Envios em Massa" },
    { to: "/whatsapp/templates", label: "Templates" },
  ];
  const logsSubItems = [
    { to: "/logs/painel", label: "Logs do Painel" },
    { to: "/logs/sistema", label: "Logs do Sistema" },
  ];
  const indicacoesSubItems = [
    { to: "/indicacoes/clientes", label: "Indicação de Clientes" },
    { to: "/indicacoes/sistema", label: "Indicação do Sistema" },
  ];
  const outrosSubItems = [
    { to: "/outros/cupom", label: "Cupom" },
  ];
  const gatewaysSubItems = [
    { to: "/gateways/checkout", label: "Checkout" },
    { to: "/configuracoes/asaas", label: "Asaas" },
    { to: "/configuracoes/mercado-pago", label: "Mercado Pago" },
    { to: "/configuracoes/ciabra", label: "Ciabra" },
    { to: "/configuracoes/pix-manual", label: "PIX Manual" },
    { to: "/configuracoes/v3pay", label: "V3Pay" },
  ];
  const servidoresSubItems = [
    { to: "/servidores", label: "Todos os Servidores" },
    { to: "/servidores/sigma", label: "Painel Sigma" },
    { to: "/servidores/koffice-api", label: "KOffice API" },
    { to: "/servidores/koffice-v2", label: "KOffice V2" },
    { to: "/servidores/mundogf", label: "MundoGF" },
    { to: "/servidores/uniplay", label: "Uniplay e Franquias" },
    { to: "/servidores/playfast", label: "Playfast" },
  ];
  const servidoresActive = currentPath.startsWith("/servidores");

  // Helper to render submenu items
  const renderSubItems = (items: { to: string; label: string }[]) => (
    <SidebarMenuSub className="ml-8 mt-2 space-y-1 animate-fade-in">
      {items.map((subItem) => (
        <SidebarMenuSubItem key={subItem.to}>
          <SidebarMenuSubButton asChild className="h-auto p-0 hover:bg-transparent">
            <NavLink to={subItem.to} end className={subItemClass(isActive(subItem.to))}>
              <span className={subItemDotClass(isActive(subItem.to))} />
              {subItem.label}
            </NavLink>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  );

  // Determina se o item deve ficar azul: apenas se é o submenu aberto, 
  // ou se a rota está ativa E nenhum outro submenu está aberto
  const isMenuHighlighted = (menuKey: string, sectionActive: boolean) =>
    openSubmenu === menuKey || (sectionActive && openSubmenu === null);

  // Helper to render a submenu parent (same style as WhatsApp)
  const renderSubmenuParent = (
    item: typeof menuItems[0],
    menuKey: string,
    sectionActive: boolean,
    subItems: { to: string; label: string }[]
  ) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton
        onClick={() => toggleSubmenu(menuKey)}
        className="h-auto p-0 hover:bg-transparent active:bg-transparent active:text-inherit focus-visible:ring-0 rounded-none"
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-5 py-3'} w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMenuHighlighted(menuKey, sectionActive)
            ? `bg-primary/15 text-primary ${!isCollapsed ? 'border-l-[3px] border-l-primary' : ''} font-medium` 
            : "text-muted-foreground hover:text-muted-foreground/80"
        }`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <item.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300" />
            {!isCollapsed && <span className="text-[14px] font-medium whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
          </div>
          {!isCollapsed && (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${openSubmenu === menuKey ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </SidebarMenuButton>
      {openSubmenu === menuKey && !isCollapsed && renderSubItems(subItems)}
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarContent className="bg-background">
        {/* Logo Header */}
        <div className={`flex justify-center items-center transition-all duration-300 ${isCollapsed ? 'py-3 px-1' : 'py-4 px-2'}`}>
          {isCollapsed ? (
            <img src={logoMsx} alt="Gestor MSX" className="w-10 object-contain" />
          ) : (
            <img src={logoMsx} alt="Gestor MSX" className="w-full h-12 object-contain" />
          )}
        </div>

        <div className="mx-4 border-t border-border/50 mb-2" />

        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0">
              {menuItems.map((item) => {
                if (item.hasSubmenu) return renderSubmenuParent(item, "clientes", clientesActive, clientesSubItems);
                if (item.hasPlanosSubmenu) return renderSubmenuParent(item, "planos", planosActive, planosSubItems);
                if (item.hasAplicativosSubmenu) return renderSubmenuParent(item, "aplicativos", aplicativosActive, aplicativosSubItems);
                if (item.hasProdutosSubmenu) return renderSubmenuParent(item, "produtos", produtosActive, produtosSubItems);
                if (item.hasServidoresSubmenu) return renderSubmenuParent(item, "servidores", servidoresActive, servidoresSubItems);
                if (item.hasFinanceiroSubmenu) return renderSubmenuParent(item, "financeiro", financeiroActive, financeiroSubItems);
                if (item.hasLogsSubmenu) return renderSubmenuParent(item, "logs", logsActive, logsSubItems);
                if (item.hasIndicacoesSubmenu) return renderSubmenuParent(item, "indicacoes", indicacoesActive, indicacoesSubItems);
                if (item.hasOutrosSubmenu) return renderSubmenuParent(item, "outros", outrosActive, outrosSubItems);
                if (item.hasGatewaysSubmenu) return renderSubmenuParent(item, "gateways", gatewaysActive, gatewaysSubItems);

                // WhatsApp - special styling
                if (item.hasWhatsappSubmenu) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        onClick={() => toggleSubmenu("whatsapp")}
                        className="h-auto p-0 hover:bg-transparent active:bg-transparent active:text-inherit focus-visible:ring-0 rounded-none"
                      >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-5 py-3'} w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          isMenuHighlighted("whatsapp", whatsappActive)
                            ? `bg-primary/15 text-primary ${!isCollapsed ? 'border-l-[3px] border-l-primary' : ''} font-medium` 
                            : "text-muted-foreground hover:text-muted-foreground/80"
                        }`}>
                          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <Phone className="h-5 w-5 flex-shrink-0 transition-transform duration-300" />
                            {!isCollapsed && <span className="text-[14px] font-medium whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
                          </div>
                          {!isCollapsed && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${openSubmenu === "whatsapp" ? "rotate-180" : ""}`}
                            />
                          )}
                        </div>
                      </SidebarMenuButton>
                      {openSubmenu === "whatsapp" && !isCollapsed && renderSubItems(whatsappSubItems)}
                    </SidebarMenuItem>
                  );
                }

                // Items normais
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent active:bg-transparent active:text-inherit focus-visible:ring-0 rounded-none">
                      <NavLink to={item.to} end onClick={() => setOpenSubmenu(null)}>
                        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-5 py-3'} w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          isActive(item.to) && openSubmenu === null
                            ? `bg-primary/15 text-primary ${!isCollapsed ? 'border-l-[3px] border-l-primary' : ''} font-medium`
                            : "text-muted-foreground hover:text-muted-foreground/80"
                        }`}>
                          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <item.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300" />
                            {!isCollapsed && <span className="text-[14px] font-medium whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
                          </div>
                          {!isCollapsed && <ChevronDown className="h-4 w-4 opacity-50" />}
                        </div>
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
