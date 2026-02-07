import { useState, useEffect } from "react";
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
import { Home, Send, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { format } from "date-fns";

interface Mensagem {
  id: string;
  cliente: string;
  whatsapp: string;
  mensagem: string;
  data_hora: string;
  status: "enviada" | "aguardando" | "erro";
}

export default function FilaMensagens() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [reativarDialog, setReativarDialog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUser();

  useEffect(() => {
    document.title = "Fila de Mensagens | Tech Play";
    loadMensagens();
  }, []);

  const loadMensagens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("user_id", user?.id)
        .order("sent_at", { ascending: false });
      
      if (data) {
        setMensagens(data.map(m => ({
          id: m.id,
          cliente: m.phone, // Will need to join with clients table
          whatsapp: m.phone,
          mensagem: m.message,
          data_hora: m.sent_at,
          status: m.status as "enviada" | "aguardando" | "erro"
        })));
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sample data for demonstration
  const sampleMensagens: Mensagem[] = [
    {
      id: "1",
      cliente: "Paulo",
      whatsapp: "5511986989550",
      mensagem: "Olá, *Paulo*. \\n\\n ✅ *Seu pagamento foi realizado e o seu acesso será renovado em alguns minutos!*.\\n\\nPróximo vencimento: *06/03/2026* !\\n\\nQualquer dúvida, estamos por aqui!\\n\\n *Obrigado!*",
      data_hora: "2026-02-06T20:54:23",
      status: "enviada"
    },
    {
      id: "2",
      cliente: "Campanha",
      whatsapp: "5583921461789",
      mensagem: "O cliente *Paulo Diniz* (*paulo*), WhatsApp (*5511986989550*) do servidor **RBOYS GF** pagou a fatura no valor de R$ 44.9 referente ao plano *Plano Mensal - 2 Telas* pelo Gestor Pay via *GestorV3*",
      data_hora: "2026-02-06T20:54:23",
      status: "enviada"
    },
    {
      id: "3",
      cliente: "Paulo",
      whatsapp: "5511986989550",
      mensagem: "Bom dia, *Paulo*. \\n\\n 🟥 *SEU PLANO VENCEU*\\nPra continuar aproveitando seus canais, realize o pagamento o quanto antes. \\n\\n *DADOS DA FATURA*\\n--------------------------------\\n",
      data_hora: "2026-02-06T08:00:07",
      status: "enviada"
    },
    {
      id: "4",
      cliente: "Blener",
      whatsapp: "556284095137",
      mensagem: "Bom dia, *Blener*. \\n\\n 📄 Sua fatura foi gerada com sucesso!* \\n\\n *DADOS DA FATURA*\\n--------------------------------\\n ◆ *Vencimento:* *09/02/2026*\\n ◆ Plano Mensal - 1 Telas: *R$ 29,90*\\n ◆ Desconto: *~R$ 0,00~*\\n ◆ Total a pagar: *R$ 29,90*\\n--------------------------------\\n\\n 💸 *Pagamento rápido em 1 clique:*\\nhttps://gestorv3.pro/techplay/central/ver_fatura?r=C6985c9b786573143\\n\\nAbra o link de cima, clique em \"Pagar com PIX\"\\n copie o código completo gerado e cole no aplicativo do banco. \\n\\n ⚠️ Qualquer dúvida ou dificuldade, é só nos avisar aqui no mesmo instante!",
      data_hora: "2026-02-06T08:00:07",
      status: "enviada"
    },
    {
      id: "5",
      cliente: "Jessica",
      whatsapp: "559491952921",
      mensagem: "Bom dia, *Jessica*. \\n\\n 📄 Sua fatura foi gerada com sucesso!* \\n\\n *DADOS DA FATURA*\\n--------------------------------\\n",
      data_hora: "2026-02-06T08:00:07",
      status: "enviada"
    },
    {
      id: "6",
      cliente: "Alice",
      whatsapp: "558881646676",
      mensagem: "Bom dia, *Alice*. \\n\\n 📄 Sua fatura foi gerada com sucesso!* \\n\\n *DADOS DA FATURA*\\n--------------------------------\\n ◆ *Vencimento:* *09/02/2026*\\n ◆ Plano Mensal: *R$ 25,00*\\n ◆ Desconto: *~R$ 0,00~*\\n ◆ Total a pagar: *R$ 25,00*\\n--------------------------------\\n\\n 💸 *Pagamento rápido em 1 clique:*\\nhttps://gestorv3.pro/techplay/central/ver_fatura?r=C6985c9b77f71262\\n\\nAbra o link de cima, clique em \"Pagar com PIX\"\\n copie o código completo gerado e cole no aplicativo do banco. \\n\\n ⚠️ Qualquer dúvida ou dificuldade, é só nos avisar aqui no mesmo instante!",
      data_hora: "2026-02-06T08:00:07",
      status: "enviada"
    },
    {
      id: "7",
      cliente: "Mara",
      whatsapp: "5583982192845",
      mensagem: "Olá, *Mara*. \\n\\n ✅ *Seu pagamento foi realizado e o seu acesso será renovado em alguns minutos!*.\\n\\nPróximo vencimento: *05/03/2026* !\\n\\nQualquer dúvida, estamos por aqui!\\n\\n *Obrigado!*",
      data_hora: "2026-02-05T22:59:28",
      status: "enviada"
    }
  ];

  const displayMensagens = mensagens.length > 0 ? mensagens : sampleMensagens;

  const filteredMensagens = displayMensagens.filter(m => {
    if (filtro === "aguardando" && m.status !== "aguardando") return false;
    if (filtro === "enviadas" && m.status !== "enviada") return false;
    if (filtro === "erro" && m.status !== "erro") return false;
    if (busca && !m.cliente.toLowerCase().includes(busca.toLowerCase()) && !m.whatsapp.includes(busca)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredMensagens.length / parseInt(entriesPerPage));
  const paginatedMensagens = filteredMensagens.slice(
    (currentPage - 1) * parseInt(entriesPerPage),
    currentPage * parseInt(entriesPerPage)
  );

  const counts = {
    todas: displayMensagens.length,
    aguardando: displayMensagens.filter(m => m.status === "aguardando").length,
    enviadas: displayMensagens.filter(m => m.status === "enviada").length,
    erro: displayMensagens.filter(m => m.status === "erro").length,
  };

  const handleForcarEnvio = () => {
    toast.success("Forçando envio das mensagens pendentes...");
  };

  const handleExcluirEnviadas = () => {
    toast.success("Mensagens enviadas excluídas!");
  };

  const handleExcluirTodas = () => {
    toast.success("Todas as mensagens excluídas!");
  };

  const handleReativar = (id: string) => {
    setReativarDialog(id);
  };

  const confirmReativar = () => {
    toast.success("Mensagem reativada com sucesso!");
    setReativarDialog(null);
  };

  const handleDelete = (id: string) => {
    toast.success("Mensagem excluída!");
  };

  const handleResend = (id: string) => {
    toast.success("Mensagem reenviada!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviada":
        return <Badge className="bg-green-600 text-white text-xs">Mensagem Enviada</Badge>;
      case "aguardando":
        return <Badge className="bg-yellow-600 text-white text-xs">Aguardando</Badge>;
      case "erro":
        return <Badge className="bg-red-600 text-white text-xs">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bom Dia, Tech Play!</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Home className="h-4 w-4" />
            <span>/</span>
            <span className="text-purple-400">Envios WhatsApp</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleForcarEnvio} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            Forçar Envio
          </Button>
          <Button onClick={handleExcluirEnviadas} className="bg-red-600 hover:bg-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Enviadas
          </Button>
          <Button onClick={handleExcluirTodas} variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Todas
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3c]">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Envios De Notificações</h2>
          <p className="text-muted-foreground text-sm mb-6">Fique por dentro das mensagens que são enviadas aos seus clientes</p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant={filtro === "todas" ? "default" : "outline"}
              onClick={() => setFiltro("todas")}
              className={filtro === "todas" ? "bg-purple-600" : "border-purple-600 text-purple-400"}
            >
              Todas ({counts.todas})
            </Button>
            <Button 
              variant={filtro === "aguardando" ? "default" : "outline"}
              onClick={() => setFiltro("aguardando")}
              className={filtro === "aguardando" ? "bg-purple-600" : "border-purple-600 text-purple-400"}
            >
              Aguardando Envio ({counts.aguardando})
            </Button>
            <Button 
              variant={filtro === "enviadas" ? "default" : "outline"}
              onClick={() => setFiltro("enviadas")}
              className={filtro === "enviadas" ? "bg-purple-600" : "border-purple-600 text-purple-400"}
            >
              Mensagens Enviadas ({counts.enviadas})
            </Button>
            <Button 
              variant={filtro === "erro" ? "default" : "outline"}
              onClick={() => setFiltro("erro")}
              className={filtro === "erro" ? "bg-red-600" : "border-red-600 text-red-400"}
            >
              Mensagens com Erro ({counts.erro})
            </Button>
            <Button 
              variant="outline"
              onClick={() => {}}
              className="border-green-600 text-green-400"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reativar Mensagens
            </Button>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Mostrar</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20 bg-[#252538] border-[#3a3a4c]">
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
                className="w-48 bg-[#252538] border-[#3a3a4c]"
                placeholder="Buscar..."
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-[#2a2a3c] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#2a2a3c] hover:bg-transparent">
                  <TableHead className="text-white">Cliente: ↕</TableHead>
                  <TableHead className="text-white">WhatsApp: ↕</TableHead>
                  <TableHead className="text-white">Mensagem:</TableHead>
                  <TableHead className="text-white">↕</TableHead>
                  <TableHead className="text-white">Data/Hora: ↓</TableHead>
                  <TableHead className="text-white">Status: ↕</TableHead>
                  <TableHead className="text-white">Ação: ↕</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMensagens.map((msg) => (
                  <TableRow key={msg.id} className="border-b border-[#2a2a3c] hover:bg-[#252538]">
                    <TableCell className="text-cyan-400 font-medium">{msg.cliente}</TableCell>
                    <TableCell className="text-white">{msg.whatsapp}</TableCell>
                    <TableCell className="text-white text-xs max-w-[400px] truncate">{msg.mensagem}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-white text-sm">
                      {format(new Date(msg.data_hora), "dd/MM/yyyy - HH:mm:ss")}
                    </TableCell>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => handleResend(msg.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-muted-foreground text-sm">
              Mostrando {((currentPage - 1) * parseInt(entriesPerPage)) + 1} a {Math.min(currentPage * parseInt(entriesPerPage), filteredMensagens.length)} de {filteredMensagens.length} entradas
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-[#3a3a4c]"
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-purple-600" : "border-[#3a3a4c]"}
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
                    className="border-[#3a3a4c]"
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
                className="border-[#3a3a4c]"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reactivate Dialog */}
      <AlertDialog open={!!reativarDialog} onOpenChange={() => setReativarDialog(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-[#2a2a3c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-center text-xl">Reativar essa mensagem?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Deseja realmente reativar essa mensagem?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center gap-4">
            <AlertDialogAction 
              onClick={confirmReativar}
              className="bg-green-600 hover:bg-green-700"
            >
              Sim, tenho certeza!
            </AlertDialogAction>
            <AlertDialogCancel className="bg-red-600 hover:bg-red-700 text-white border-none">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
