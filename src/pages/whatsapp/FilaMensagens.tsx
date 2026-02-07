import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Home, Send, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import { format } from "date-fns";

interface Mensagem {
  id: string;
  cliente: string;
  whatsapp: string;
  mensagem: string;
  data_hora: string;
  scheduled_for?: string;
  status: "enviada" | "aguardando" | "erro" | "agendada";
}

export default function FilaMensagens() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'single' | 'enviadas' | 'todas'; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useCurrentUser();
  const { sendMessage, isConnected, config } = useEvolutionAPI();

  useEffect(() => {
    document.title = "Fila de Mensagens | Tech Play";
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMensagens();
    }
  }, [user?.id]);

  const loadMensagens = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Buscar mensagens do WhatsApp
      const { data: messagesData, error: messagesError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false });

      if (messagesError) {
        console.error("Erro ao carregar mensagens:", messagesError);
        toast.error("Erro ao carregar mensagens");
        return;
      }

      // Buscar clientes para associar nomes
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("nome, whatsapp")
        .eq("user_id", user.id);

      const clientesMap = new Map(
        clientesData?.map(c => [c.whatsapp.replace(/\D/g, ''), c.nome]) || []
      );

      if (messagesData) {
        setMensagens(messagesData.map(m => {
          const phoneClean = m.phone.replace(/\D/g, '');
          let status: "enviada" | "aguardando" | "erro" | "agendada" = 'aguardando';
          if (m.status === 'sent') status = 'enviada';
          else if (m.status === 'pending') status = 'aguardando';
          else if (m.status === 'scheduled') status = 'agendada';
          else if (m.status === 'failed') status = 'erro';
          
          return {
            id: m.id,
            cliente: clientesMap.get(phoneClean) || m.phone,
            whatsapp: m.phone,
            mensagem: m.message,
            data_hora: m.sent_at,
            scheduled_for: (m as any).scheduled_for,
            status
          };
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  const filteredMensagens = mensagens.filter(m => {
    if (filtro === "aguardando" && m.status !== "aguardando") return false;
    if (filtro === "agendada" && m.status !== "agendada") return false;
    if (filtro === "enviadas" && m.status !== "enviada") return false;
    if (filtro === "erro" && m.status !== "erro") return false;
    if (busca && !m.cliente.toLowerCase().includes(busca.toLowerCase()) && !m.whatsapp.includes(busca)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredMensagens.length / parseInt(entriesPerPage)) || 1;
  const paginatedMensagens = filteredMensagens.slice(
    (currentPage - 1) * parseInt(entriesPerPage),
    currentPage * parseInt(entriesPerPage)
  );

  const counts = {
    todas: mensagens.length,
    aguardando: mensagens.filter(m => m.status === "aguardando").length,
    agendada: mensagens.filter(m => m.status === "agendada").length,
    enviadas: mensagens.filter(m => m.status === "enviada").length,
    erro: mensagens.filter(m => m.status === "erro").length,
  };

  // Forçar envio de todas as mensagens aguardando e agendadas
  const handleForcarEnvio = async () => {
    if (!isConnected) {
      toast.error("WhatsApp não está conectado. Conecte primeiro em 'Parear WhatsApp'");
      return;
    }

    // Incluir mensagens aguardando E agendadas
    const paraEnviar = mensagens.filter(m => m.status === "aguardando" || m.status === "agendada");
    if (paraEnviar.length === 0) {
      toast.info("Não há mensagens aguardando envio");
      return;
    }

    setActionLoading(true);
    
    const toastId = toast.loading(`Enviando 0/${paraEnviar.length} mensagens...`);

    let enviadas = 0;
    let erros = 0;

    try {
      for (let i = 0; i < paraEnviar.length; i++) {
        const msg = paraEnviar[i];
        
        // Atualizar toast com progresso
        toast.loading(`Enviando ${i + 1}/${paraEnviar.length} mensagens...`, { id: toastId });
        
        try {
          await sendMessage(msg.whatsapp, msg.mensagem);
          
          // Atualizar status no banco
          await supabase
            .from("whatsapp_messages")
            .update({ status: 'sent', scheduled_for: null } as any)
            .eq("id", msg.id);
          
          enviadas++;
        } catch (error) {
          console.error(`Erro ao enviar para ${msg.whatsapp}:`, error);
          
          // Marcar como erro no banco
          await supabase
            .from("whatsapp_messages")
            .update({ status: 'failed', error_message: String(error), scheduled_for: null } as any)
            .eq("id", msg.id);
          
          erros++;
        }

        // Delay variável entre mensagens para evitar bloqueio do WhatsApp
        // Base de 17-25 segundos + variação de 1-10 segundos
        if (i < paraEnviar.length - 1) {
          const baseDelay = Math.floor(Math.random() * (25 - 17 + 1)) + 17; // 17-25 segundos
          const variation = Math.floor(Math.random() * 10) + 1; // 1-10 segundos
          const totalDelay = (baseDelay + variation) * 1000; // Converter para ms
          await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
      }

      toast.dismiss(toastId);
      
      if (erros === 0) {
        toast.success(`${enviadas} mensagens enviadas com sucesso!`);
      } else {
        toast.warning(`${enviadas} enviadas, ${erros} com erro`);
      }
    } catch (error) {
      console.error("Erro geral ao forçar envio:", error);
      toast.dismiss(toastId);
      toast.error("Erro ao processar envio de mensagens");
    } finally {
      setActionLoading(false);
      await loadMensagens();
    }
  };

  // Excluir mensagens enviadas
  const handleExcluirEnviadas = async () => {
    setDeleteDialog({ type: 'enviadas' });
  };

  // Excluir todas as mensagens
  const handleExcluirTodas = async () => {
    setDeleteDialog({ type: 'todas' });
  };

  // Confirmar exclusão
  const confirmDelete = async () => {
    if (!deleteDialog || !user?.id) return;

    setActionLoading(true);
    try {
      if (deleteDialog.type === 'single' && deleteDialog.id) {
        await supabase
          .from("whatsapp_messages")
          .delete()
          .eq("id", deleteDialog.id)
          .eq("user_id", user.id);
        toast.success("Mensagem excluída!");
      } else if (deleteDialog.type === 'enviadas') {
        await supabase
          .from("whatsapp_messages")
          .delete()
          .eq("user_id", user.id)
          .eq("status", "sent");
        toast.success("Mensagens enviadas excluídas!");
      } else if (deleteDialog.type === 'todas') {
        await supabase
          .from("whatsapp_messages")
          .delete()
          .eq("user_id", user.id);
        toast.success("Todas as mensagens excluídas!");
      }
      
      await loadMensagens();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir mensagens");
    } finally {
      setActionLoading(false);
      setDeleteDialog(null);
    }
  };

  // Reativar mensagens com erro (colocar de volta na fila)
  const handleReativarMensagens = async () => {
    if (!user?.id) return;

    const comErro = mensagens.filter(m => m.status === "erro");
    if (comErro.length === 0) {
      toast.info("Não há mensagens com erro para reativar");
      return;
    }

    setActionLoading(true);
    try {
      await supabase
        .from("whatsapp_messages")
        .update({ status: 'pending', error_message: null })
        .eq("user_id", user.id)
        .eq("status", "failed");

      toast.success(`${comErro.length} mensagens reativadas e colocadas na fila!`);
      await loadMensagens();
    } catch (error) {
      console.error("Erro ao reativar:", error);
      toast.error("Erro ao reativar mensagens");
    } finally {
      setActionLoading(false);
    }
  };

  // Excluir mensagem individual
  const handleDelete = (id: string) => {
    setDeleteDialog({ type: 'single', id });
  };

  // Reenviar mensagem individual
  const handleResend = async (id: string) => {
    if (!isConnected) {
      toast.error("WhatsApp não está conectado");
      return;
    }

    const msg = mensagens.find(m => m.id === id);
    if (!msg) return;

    setActionLoading(true);
    try {
      await sendMessage(msg.whatsapp, msg.mensagem);
      
      await supabase
        .from("whatsapp_messages")
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq("id", id);

      toast.success("Mensagem reenviada com sucesso!");
      await loadMensagens();
    } catch (error) {
      console.error("Erro ao reenviar:", error);
      toast.error("Erro ao reenviar mensagem");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (msg: Mensagem) => {
    const { status, scheduled_for } = msg;
    switch (status) {
      case "enviada":
        return <Badge className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] text-white text-xs px-3 py-1">Mensagem Enviada</Badge>;
      case "aguardando":
        return <Badge className="bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))] text-black text-xs px-3 py-1">Aguardando</Badge>;
      case "agendada":
        const scheduledTime = scheduled_for ? new Date(scheduled_for) : null;
        const now = new Date();
        const remaining = scheduledTime ? Math.max(0, Math.ceil((scheduledTime.getTime() - now.getTime()) / 1000)) : 0;
        return (
          <Badge className="bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] text-white text-xs px-3 py-1">
            Agendada {remaining > 0 ? `(${remaining}s)` : ''}
          </Badge>
        );
      case "erro":
        return <Badge className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] text-white text-xs px-3 py-1">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Bom Tarde, Tech Play!</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Home className="h-4 w-4" />
            <span>/</span>
            <span className="text-[hsl(var(--brand-2))]">Envios WhatsApp</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleForcarEnvio} 
            size="sm" 
            disabled={actionLoading || !isConnected}
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white rounded-full px-4"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Forçar Envio
          </Button>
          <Button 
            onClick={handleExcluirEnviadas} 
            size="sm" 
            disabled={actionLoading}
            className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90 text-white rounded-full px-4"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir Enviadas
          </Button>
          <Button 
            onClick={handleExcluirTodas} 
            size="sm" 
            disabled={actionLoading}
            className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90 text-white rounded-full px-4"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir Todas
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1">Envios De Notificações</h2>
          <p className="text-muted-foreground text-sm mb-5">Fique por dentro das mensagens que são enviadas aos seus clientes</p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            <Button 
              size="sm"
              onClick={() => setFiltro("todas")}
              className={filtro === "todas" 
                ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white rounded-full px-4"
                : "bg-secondary hover:bg-secondary/80 text-foreground rounded-full px-4"}
            >
              Todas ({counts.todas})
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setFiltro("aguardando")}
              className={filtro === "aguardando" 
                ? "bg-[hsl(300,70%,40%)] hover:bg-[hsl(300,70%,35%)] text-white border-transparent rounded-full px-4" 
                : "border-[hsl(300,70%,40%)] text-[hsl(300,70%,60%)] hover:bg-[hsl(300,70%,40%)]/10 rounded-full px-4"}
            >
              Aguardando Envio ({counts.aguardando})
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setFiltro("agendada")}
              className={filtro === "agendada" 
                ? "bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,45%)] text-white border-transparent rounded-full px-4" 
                : "border-[hsl(200,70%,50%)] text-[hsl(200,70%,60%)] hover:bg-[hsl(200,70%,50%)]/10 rounded-full px-4"}
            >
              Agendadas ({counts.agendada})
            </Button>
            <Button 
              size="sm"
              onClick={() => setFiltro("enviadas")}
              className={filtro === "enviadas" 
                ? "bg-[hsl(300,70%,40%)] hover:bg-[hsl(300,70%,35%)] text-white rounded-full px-4" 
                : "bg-[hsl(260,30%,30%)] hover:bg-[hsl(260,30%,35%)] text-[hsl(300,70%,70%)] rounded-full px-4"}
            >
              Mensagens Enviadas ({counts.enviadas})
            </Button>
            <Button 
              size="sm"
              onClick={() => setFiltro("erro")}
              className={filtro === "erro"
                ? "bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90 text-white rounded-full px-4"
                : "bg-[hsl(var(--destructive))]/20 hover:bg-[hsl(var(--destructive))]/30 text-[hsl(var(--destructive))] rounded-full px-4"}
            >
              Mensagens com Erro ({counts.erro})
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={handleReativarMensagens}
              disabled={actionLoading || counts.erro === 0}
              className="border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10 rounded-full px-4"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${actionLoading ? 'animate-spin' : ''}`} />
              Reativar Mensagens
            </Button>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Mostrar</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20 bg-secondary border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Buscar:</span>
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-48 bg-secondary border-border h-9"
                placeholder="Buscar..."
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="text-foreground font-semibold whitespace-nowrap">Cliente: ↕</TableHead>
                    <TableHead className="text-foreground font-semibold whitespace-nowrap">WhatsApp: ↕</TableHead>
                    <TableHead className="text-foreground font-semibold">Mensagem:</TableHead>
                    <TableHead className="text-foreground font-semibold whitespace-nowrap">Data/Hora: ↓</TableHead>
                    <TableHead className="text-foreground font-semibold whitespace-nowrap">Status: ↕</TableHead>
                    <TableHead className="text-foreground font-semibold whitespace-nowrap">Ações: ↕</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Carregando mensagens...</p>
                      </TableCell>
                    </TableRow>
                  ) : paginatedMensagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma mensagem encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMensagens.map((msg) => (
                      <TableRow key={msg.id} className="border-b border-border hover:bg-secondary/30">
                        <TableCell className="text-[hsl(var(--brand-2))] font-medium whitespace-nowrap">{msg.cliente}</TableCell>
                        <TableCell className="text-foreground whitespace-nowrap font-mono text-sm">{msg.whatsapp}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[350px]">
                          <div className="line-clamp-2">{msg.mensagem}</div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm whitespace-nowrap">
                          {format(new Date(msg.data_hora), "dd/MM/yyyy - HH:mm:ss")}
                        </TableCell>
                        <TableCell>{getStatusBadge(msg)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            {/* Botão lixeira - sempre visível */}
                            <Button 
                              size="icon" 
                              variant="ghost"
                              disabled={actionLoading}
                              className="h-8 w-8 text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                              onClick={() => handleDelete(msg.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {/* Botão reenviar - apenas para mensagens enviadas ou com erro */}
                            {(msg.status === "enviada" || msg.status === "erro") && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                disabled={actionLoading || !isConnected}
                                className="h-8 w-8 text-[hsl(var(--success))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                                onClick={() => handleResend(msg.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <span className="text-muted-foreground text-sm">
              Mostrando {filteredMensagens.length > 0 ? ((currentPage - 1) * parseInt(entriesPerPage)) + 1 : 0} a {Math.min(currentPage * parseInt(entriesPerPage), filteredMensagens.length)} de {filteredMensagens.length} entradas
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-border"
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-[hsl(300,70%,40%)] hover:bg-[hsl(300,70%,35%)]" : "border-border"}
                >
                  {page}
                </Button>
              ))}
              {totalPages > 5 && (
                <>
                  <span className="text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="border-border"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-border"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center text-xl">
              {deleteDialog?.type === 'single' && "Excluir esta mensagem?"}
              {deleteDialog?.type === 'enviadas' && "Excluir mensagens enviadas?"}
              {deleteDialog?.type === 'todas' && "Excluir TODAS as mensagens?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {deleteDialog?.type === 'single' && "Deseja realmente excluir esta mensagem? Esta ação não pode ser desfeita."}
              {deleteDialog?.type === 'enviadas' && `Deseja excluir ${counts.enviadas} mensagens enviadas? Esta ação não pode ser desfeita.`}
              {deleteDialog?.type === 'todas' && `Deseja excluir TODAS as ${counts.todas} mensagens? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center gap-4">
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sim, excluir!
            </AlertDialogAction>
            <AlertDialogCancel className="bg-secondary hover:bg-secondary/80 text-foreground border-none">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
