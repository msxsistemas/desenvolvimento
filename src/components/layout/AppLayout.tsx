import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LogOut, User, Bell, Check, Trash2, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { userId } = useCurrentUser();
  const { subscription, daysLeft, isTrial, isActive } = useSubscription(userId);
  const { profile } = useProfile(userId);
  const { notificacoes, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotificacoes(userId);
  const navigate = useNavigate();

  const getUserInitials = (name?: string | null, email?: string) => {
    const n = name || profile?.nome_completo;
    if (n) {
      const parts = n.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return n.substring(0, 2).toUpperCase();
    }
    if (email) {
      const parts = email.split('@')[0].split('.');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.nome_completo) return profile.nome_completo;
    const fullName = user?.user_metadata?.full_name;
    if (fullName) return fullName;
    if (user?.email) {
      return user.email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return 'Usuário';
  };

  const getCompanyName = () => {
    return profile?.nome_empresa || user?.user_metadata?.company_name || 'Minha Empresa';
  };

  const getExpirationDate = () => {
    if (!subscription?.expira_em) return null;
    const d = new Date(subscription.expira_em);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getNotifIcon = (tipo: string) => {
    switch (tipo) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const expirationDate = getExpirationDate();
  const isExpiredOrClose = daysLeft !== null && daysLeft <= 3;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-[radial-gradient(1200px_600px_at_-20%_-10%,hsl(var(--brand)/.15)_0%,transparent_60%)] overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Header */}
          <header className="h-14 sm:h-16 border-b border-border flex items-center px-3 sm:px-5 bg-sidebar-background z-10 flex-shrink-0">
            <SidebarTrigger className="hover-scale mr-2" />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Center/Right: Action icons + Expiration + Notifications + Profile */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Expiration alert badge */}
              {isTrial && daysLeft !== null && daysLeft <= 3 && (
                <button
                  onClick={() => navigate('/planos-disponiveis')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  <span>⏳</span>
                  Plano Vencido: Você ainda tem {daysLeft} dia{daysLeft !== 1 ? 's' : ''} para renovação
                </button>
              )}

              {/* WhatsApp shortcut */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-md bg-[hsl(142_71%_45%/0.15)] text-[hsl(142,71%,45%)] hover:bg-[hsl(142_71%_45%/0.25)]"
                      onClick={() => navigate('/whatsapp/parear')}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>WhatsApp</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-md bg-warning/15 text-warning hover:bg-warning/25 relative"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-semibold text-sm">Notificações</h4>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={markAllAsRead}>
                        <Check className="h-3 w-3 mr-1" />
                        Marcar todas
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="max-h-72">
                    {notificacoes.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        Nenhuma notificação
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notificacoes.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                              !n.lida ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => {
                              if (!n.lida) markAsRead(n.id);
                              if (n.link) navigate(n.link);
                            }}
                          >
                            <span className="text-lg flex-shrink-0 mt-0.5">{getNotifIcon(n.tipo)}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.lida ? 'font-semibold' : 'font-medium'}`}>{n.titulo}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Expiration date badge */}
              {expirationDate && (
                <div
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border cursor-pointer ${
                    isExpiredOrClose
                      ? 'border-destructive/50 bg-destructive/10 text-destructive'
                      : 'border-success/50 bg-success/10 text-success'
                  }`}
                  onClick={() => navigate('/planos-disponiveis')}
                >
                  <span className="text-muted-foreground text-[11px]">Vencimento do Acesso</span>
                  <span className="font-bold">{expirationDate}</span>
                </div>
              )}

              {/* Separator */}
              <div className="hidden sm:block w-px h-6 bg-border mx-1" />

              {/* Profile section */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto p-1.5 hover:bg-accent">
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-muted-foreground text-xs font-bold">
                        {getUserInitials(user?.user_metadata?.full_name, user?.email)}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-semibold text-foreground truncate max-w-[160px]">
                      {getDisplayName()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{getCompanyName()}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/perfil')}>
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/renovar-acesso')}>
                    <Star className="mr-2 h-4 w-4" />
                    Renovar Acesso
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 animate-enter min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
