import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Home, Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface Campanha {
  id: string;
  nome: string;
  mensagem: string;
  destinatarios: string;
  status: "ativa" | "pausada" | "finalizada";
  enviadas: number;
  total: number;
  criada_em: string;
}

export default function GerenciarCampanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({
    nome: "",
    mensagem: "",
    destinatarios: "todos",
  });

  useEffect(() => {
    document.title = "Gerenciar Campanhas | Tech Play";
    // Load sample data
    setCampanhas([
      {
        id: "1",
        nome: "Promoção de Natal",
        mensagem: "Olá {nome_cliente}! Aproveite nossa promoção de Natal...",
        destinatarios: "todos",
        status: "ativa",
        enviadas: 150,
        total: 500,
        criada_em: "2026-01-15",
      },
      {
        id: "2",
        nome: "Aviso de Manutenção",
        mensagem: "Prezado cliente, informamos que haverá manutenção...",
        destinatarios: "ativos",
        status: "finalizada",
        enviadas: 300,
        total: 300,
        criada_em: "2026-01-10",
      },
    ]);
  }, []);

  const handleCriarCampanha = () => {
    if (!novaCampanha.nome || !novaCampanha.mensagem) {
      toast.error("Preencha todos os campos");
      return;
    }

    const campanha: Campanha = {
      id: Date.now().toString(),
      nome: novaCampanha.nome,
      mensagem: novaCampanha.mensagem,
      destinatarios: novaCampanha.destinatarios,
      status: "pausada",
      enviadas: 0,
      total: 100,
      criada_em: new Date().toISOString().split("T")[0],
    };

    setCampanhas([campanha, ...campanhas]);
    setNovaCampanha({ nome: "", mensagem: "", destinatarios: "todos" });
    setDialogOpen(false);
    toast.success("Campanha criada com sucesso!");
  };

  const handleToggleStatus = (id: string) => {
    setCampanhas(campanhas.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === "ativa" ? "pausada" : "ativa" };
      }
      return c;
    }));
    toast.success("Status da campanha atualizado!");
  };

  const handleDelete = (id: string) => {
    setCampanhas(campanhas.filter(c => c.id !== id));
    toast.success("Campanha excluída!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-600">Ativa</Badge>;
      case "pausada":
        return <Badge className="bg-yellow-600">Pausada</Badge>;
      case "finalizada":
        return <Badge className="bg-gray-600">Finalizada</Badge>;
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
            <span className="text-purple-400">Gerenciar Campanhas</span>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a2e] border-[#2a2a3c]">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Nome da Campanha</Label>
                <Input
                  value={novaCampanha.nome}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                  className="bg-[#252538] border-[#3a3a4c]"
                  placeholder="Ex: Promoção de Verão"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Mensagem</Label>
                <Textarea
                  value={novaCampanha.mensagem}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, mensagem: e.target.value })}
                  className="bg-[#252538] border-[#3a3a4c] min-h-[100px]"
                  placeholder="Digite a mensagem da campanha..."
                />
              </div>
              <Button onClick={handleCriarCampanha} className="w-full bg-purple-600 hover:bg-purple-700">
                Criar Campanha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3c]">
        <CardHeader>
          <CardTitle className="text-white">Suas Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#2a2a3c]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#2a2a3c] hover:bg-transparent">
                  <TableHead className="text-white">Nome</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Progresso</TableHead>
                  <TableHead className="text-white">Criada em</TableHead>
                  <TableHead className="text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhas.map((campanha) => (
                  <TableRow key={campanha.id} className="border-b border-[#2a2a3c] hover:bg-[#252538]">
                    <TableCell className="text-white font-medium">{campanha.nome}</TableCell>
                    <TableCell>{getStatusBadge(campanha.status)}</TableCell>
                    <TableCell className="text-white">
                      {campanha.enviadas}/{campanha.total} ({Math.round((campanha.enviadas / campanha.total) * 100)}%)
                    </TableCell>
                    <TableCell className="text-white">{campanha.criada_em}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleToggleStatus(campanha.id)}
                          disabled={campanha.status === "finalizada"}
                        >
                          {campanha.status === "ativa" ? (
                            <Pause className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <Play className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-400"
                          onClick={() => handleDelete(campanha.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
