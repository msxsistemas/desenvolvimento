import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProdutos } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Produto } from "@/types/database";

export default function ClientesProdutos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);
  const [desativarTarget, setDesativarTarget] = useState<Produto | null>(null);
  
  const { buscar, atualizar, deletar } = useProdutos();

  useEffect(() => {
    document.title = "Clientes - Produtos | Gestor Tech Play";
  }, []);

  useEffect(() => {
    const carregar = async () => {
      const data = await buscar();
      setProdutos(data || []);
    };
    carregar();
  }, [buscar]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true);
    try {
      await deletar(deleteTarget.id as string);
      setProdutos(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMessage("Produto excluído");
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (produto: Produto) => {
    const isActive = (produto as any).ativo !== false;
    if (isActive) {
      setDesativarTarget(produto);
      return;
    }
    await executarToggle(produto);
  };

  const executarToggle = async (produto: Produto) => {
    const isActive = (produto as any).ativo !== false;
    try {
      const atualizado = await atualizar(produto.id as string, { ativo: !isActive } as any);
      if (atualizado) {
        setProdutos((prev) => prev.map((p) => (p.id === produto.id ? atualizado : p)));
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

  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch = p.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || 
      (statusFilter === "ativo" && (p as any).ativo !== false) || 
      (statusFilter === "inativo" && (p as any).ativo === false);
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meus Produtos</h1>
          <p className="text-sm text-muted-foreground">Lista com todos os seus produtos</p>
        </div>
        <Button 
          onClick={() => navigate("/produtos/cadastro")}
          className="bg-primary hover:bg-primary/90"
        >
          Adicionar Produto +
        </Button>
      </header>

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
        Mostrando {filteredProdutos.length} de {produtos.length} registros.
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProdutos.length ? (
              filteredProdutos.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {filteredProdutos.length - index}
                  </TableCell>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {typeof p.valor === "string" && p.valor.trim().startsWith("R$") ? p.valor : `R$ ${p.valor}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.creditos || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={(p as any).ativo !== false 
                        ? "border-success/50 bg-success/10 text-success" 
                        : "border-warning/50 bg-warning/10 text-warning"
                      }
                    >
                      {(p as any).ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/produtos/editar/${p.id}`)}
                        className="h-8 w-8 text-primary hover:text-primary/80"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(p)}
                        className="h-8 w-8 text-warning hover:text-warning/80"
                        title={(p as any).ativo !== false ? "Desativar" : "Ativar"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(p)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogTitle>Desativar produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o produto "{desativarTarget?.nome}"?
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
