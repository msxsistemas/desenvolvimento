import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Send, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
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
  const [autoSending, setAutoSending] = useState(false);
  const { user } = useCurrentUser();
  const { sendMessage, isConnected, hydrated } = useEvolutionAPISimple();

  useEffect(() => {
    document.title = "Fila de Mensagens | Tech Play";
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMensagens();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !hydrated || !isConnected) return;

    const processarMensagensPendentes = async () => {
      if (autoSending) return;

      const agora = new Date().toISOString();
      const { data: pendentes, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "scheduled"])
        .or(`scheduled_for.is.null,scheduled_for.lte.${agora}`)
        .order("created_at", { ascending: true })
        .limit(1);

      if (error || !pendentes || pendentes.length === 0) return;

      const msg = pendentes[0];
      
      setAutoSending(true);
      
      try {
        await sendMessage(msg.phone, msg.message);
        
        await supabase
          .from("whatsapp_messages")
          .update({ status: 'sent', scheduled_for: null })
          .eq("id", msg.id);
        
        console.log(`Mensagem enviada automaticamente para ${msg.phone}`);
      } catch (error) {
        console.error(`Erro ao enviar para ${msg.phone}:`, error);
        
        await supabase
          .from("whatsapp_messages")
          .update({ status: 'failed', error_message: String(error), scheduled_for: null })
          .eq("id", msg.id);
      } finally {
        setAutoSending(false);
        loadMensagens();
      }
    };

    const interval = setInterval(processarMensagensPendentes, 5000);
    processarMensagensPendentes();

    return () => clearInterval(interval);
  }, [user?.id, hydrated, isConnected, autoSending, sendMessage]);

  const loadMensagens = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
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

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("nome, whatsapp")
        .eq("user_id", user.id);

      const normalizePhone = (phone: string): string => {
        const cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('55') && cleaned.length >= 10) {
          return '55' + cleaned;
        }
        return cleaned;
      };

      const clientesMap = new Map(
        clientesData?.map(c => [normalizePhone(c.whatsapp), c.nome]) || []
      );

      if (messagesData) {
        setMensagens(messagesData.map(m => {
          const phoneClean = normalizePhone(m.phone);
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

  const handleForcarEnvio = async () => {
    if (!hydrated) {
      toast.info("Aguarde, verificando conexão...");
      return;
    }
    if (!isConnected) {
      toast.error("WhatsApp não está conectado. Conecte primeiro em 'Parear WhatsApp'");
      return;
    }

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
        
        toast.loading(`Enviando ${i + 1}/${paraEnviar.length} mensagens...`, { id: toastId });
        
        try {
          await sendMessage(msg.whatsapp, msg.mensagem);
          
          await supabase
            .from("whatsapp_messages")
            .update({ status: 'sent', scheduled_for: null } as any)
            .eq("id", msg.id);
          
          enviadas++;
        } catch (error) {
          console.error(`Erro ao enviar para ${msg.whatsapp}:`, error);
          
          await supabase
            .from("whatsapp_messages")
            .update({ status: 'failed', error_message: String(error), scheduled_for: null } as any)
            .eq("id", msg.id);
          
          erros++;
        }

        if (i < paraEnviar.length - 1) {
          const baseDelay = Math.floor(Math.random() * (25 - 17 + 1)) + 17;
          const variation = Math.floor(Math.random() * 10) + 1;
          const totalDelay = (baseDelay + variation) * 1000;
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

  const handleExcluirEnviadas = async () => {
    setDeleteDialog({ type: 'enviadas' });
  };

  const handleExcluirTodas = async () => {
    setDeleteDialog({ type: 'todas' });
  };

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

  const handleDelete = (id: string) => {
    setDeleteDialog({ type: 'single', id });
  };

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
    const { status } = msg;
    switch (status) {
      case "enviada":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Mensagem Enviada</Badge>;
      case "aguardando":
        return <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Aguardando</Badge>;
      case "agendada":
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Agendada</Badge>;
      case "erro":
        return <Badge className="bg-red-600 hover:bg-red-600 text-white">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Envios De Notificações</h1>
          <p className="text-sm text-muted-foreground">Fique por dentro das mensagens que são enviadas aos seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleForcarEnvio} 
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Forçar Envio
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleExcluirEnviadas} 
            disabled={actionLoading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir Enviadas
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleExcluirTodas} 
            disabled={actionLoading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir Todas
          </Button>
        </div>
      </header>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filtro === "todas" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("todas")}
          className={filtro === "todas" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
        >
          Todas ({counts.todas})
        </Button>
        <Button
          variant={filtro === "aguardando" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("aguardando")}
          className={filtro === "aguardando" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
        >
          Aguardando Envio ({counts.aguardando})
        </Button>
        <Button
          variant={filtro === "enviadas" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("enviadas")}
          className={filtro === "enviadas" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
        >
          Mensagens Enviadas ({counts.enviadas})
        </Button>
        <Button
          variant={filtro === "erro" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("erro")}
          className={filtro === "erro" ? "bg-pink-600 hover:bg-pink-700 text-white" : ""}
        >
          Mensagens com Erro ({counts.erro})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReativarMensagens}
          disabled={actionLoading || counts.erro === 0}
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reativar Mensagens
        </Button>
      </div>

      {/* Entries and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entradas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Buscar:</span>
          <Input
            placeholder=""
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-48 h-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Cliente: ↕</TableHead>
                <TableHead className="font-semibold">WhatsApp: ↕</TableHead>
                <TableHead className="font-semibold">Mensagem:</TableHead>
                <TableHead className="font-semibold">Data/Hora: ↕</TableHead>
                <TableHead className="font-semibold">Status: ↕</TableHead>
                <TableHead className="w-[80px] text-right font-semibold">Ações: ↕</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMensagens.length ? (
                paginatedMensagens.map((msg) => (
                  <TableRow key={msg.id} className="border-b border-border">
                    <TableCell className="text-primary font-medium">{msg.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{msg.whatsapp}</TableCell>
                    <TableCell className="max-w-[300px] text-muted-foreground">
                      <div className="line-clamp-3 whitespace-pre-wrap text-sm">
                        {msg.mensagem}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(msg.data_hora), "dd/MM/yyyy")} - {format(new Date(msg.data_hora), "HH:mm:ss")}
                    </TableCell>
                    <TableCell>{getStatusBadge(msg)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(msg.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {(msg.status === "erro" || msg.status === "aguardando") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResend(msg.id)}
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination info */}
      <div className="text-sm text-muted-foreground">
        Mostrando {((currentPage - 1) * parseInt(entriesPerPage)) + 1} a {Math.min(currentPage * parseInt(entriesPerPage), filteredMensagens.length)} de {filteredMensagens.length} entradas
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'single' && "Tem certeza que deseja excluir esta mensagem?"}
              {deleteDialog?.type === 'enviadas' && "Tem certeza que deseja excluir todas as mensagens enviadas?"}
              {deleteDialog?.type === 'todas' && "Tem certeza que deseja excluir TODAS as mensagens? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
