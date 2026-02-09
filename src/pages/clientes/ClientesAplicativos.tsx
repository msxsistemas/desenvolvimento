import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Aplicativo } from "@/types/database";
import { useAplicativos } from "@/hooks/useDatabase";

export default function ClientesAplicativos() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [formData, setFormData] = useState({
    nome: "",
    descricao: ""
  });
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<Aplicativo[]>([]);
  const [editingApp, setEditingApp] = useState<Aplicativo | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  const { criar, atualizar, buscar, deletar } = useAplicativos();

  useEffect(() => {
    document.title = "Clientes - Aplicativos | Gestor Tech Play";
  }, []);

  useEffect(() => {
    const carregar = async () => {
      const data = await buscar();
      setApps(data || []);
    };
    carregar();
  }, [buscar]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) return;
    
    setLoading(true);
    try {
      if (editingApp) {
        const atualizado = await atualizar(editingApp.id!, formData);
        if (atualizado) {
          setApps((prev) => prev.map(app => app.id === editingApp.id ? atualizado : app));
          setSuccessMessage("Aplicativo atualizado");
          setShowSuccessDialog(true);
        }
      } else {
        const novo = await criar(formData);
        if (novo) {
          setApps((prev) => [novo, ...prev]);
          setSuccessMessage("Aplicativo criado");
          setShowSuccessDialog(true);
        }
      }
      
      setIsDialogOpen(false);
      setEditingApp(null);
      setFormData({ nome: "", descricao: "" });
    } catch (error) {
      console.error("Erro ao salvar aplicativo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: Aplicativo) => {
    setEditingApp(app);
    setFormData({
      nome: app.nome || "",
      descricao: app.descricao || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (app: Aplicativo) => {
    try {
      await deletar(app.id!);
      setApps((prev) => prev.filter(a => a.id !== app.id));
      setSuccessMessage("Aplicativo excluído");
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Erro ao excluir aplicativo:", error);
    }
  };

  const [desativarTarget, setDesativarTarget] = useState<Aplicativo | null>(null);

  const handleToggleAtivo = async (app: Aplicativo) => {
    const isActive = (app as any).ativo !== false;
    
    if (isActive) {
      setDesativarTarget(app);
      return;
    }
    
    await executarToggle(app);
  };

  const executarToggle = async (app: Aplicativo) => {
    const isActive = (app as any).ativo !== false;
    try {
      const atualizado = await atualizar(app.id!, { ativo: !isActive } as any);
      if (atualizado) {
        setApps((prev) => prev.map((a) => (a.id === app.id ? atualizado : a)));
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const confirmarDesativar = async () => {
    if (!desativarTarget) return;
    await executarToggle(desativarTarget);
    setDesativarTarget(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setFormData({ nome: "", descricao: "" });
    setEditingApp(null);
  };

  const filteredApps = apps.filter((a) => {
    const matchesSearch = a.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || 
      (statusFilter === "ativo" && (a as any).ativo !== false) || 
      (statusFilter === "inativo" && (a as any).ativo === false);
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meus Aplicativos</h1>
          <p className="text-sm text-muted-foreground">Lista com todos os seus aplicativos</p>
        </div>
        <Button 
          onClick={() => navigate("/aplicativos/cadastro")}
          className="bg-primary hover:bg-primary/90"
        >
          Adicionar Aplicativo +
        </Button>
      </header>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingApp ? "Editar Aplicativo" : "Novo Aplicativo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Nome do aplicativo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                placeholder="Descrição do aplicativo"
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Busca</Label>
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(""); setStatusFilter("todos"); }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Record count */}
      <div className="text-right text-sm text-muted-foreground">
        Mostrando {filteredApps.length} de {apps.length} registros.
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApps.length ? (
              filteredApps.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.id?.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{a.descricao || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={(a as any).ativo !== false 
                        ? "border-success/50 bg-success/10 text-success" 
                        : "border-warning/50 bg-warning/10 text-warning"
                      }
                    >
                      {(a as any).ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(a)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(a)}
                        className={`h-8 w-8 ${(a as any).ativo !== false 
                          ? "text-muted-foreground hover:text-warning hover:bg-warning/10" 
                          : "text-muted-foreground hover:text-success hover:bg-success/10"
                        }`}
                        title={(a as any).ativo !== false ? "Desativar" : "Ativar"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir aplicativo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{a.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(a)} 
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum aplicativo encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full border-2 border-success flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium">{successMessage}</p>
            <Button onClick={() => setShowSuccessDialog(false)} size="sm">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Desativar Confirmation Dialog */}
      <AlertDialog open={!!desativarTarget} onOpenChange={() => setDesativarTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar aplicativo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o aplicativo "{desativarTarget?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarDesativar} className="bg-warning hover:bg-warning/90 text-warning-foreground">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
