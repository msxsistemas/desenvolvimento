import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlanos } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Plano } from "@/types/database";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ClientesPlanos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    tipo: "meses",
    quantidade: "",
    descricao: "",
    valor_indicacao: "0",
    indicacao_recorrente: "desativado",
    tipo_painel: ""
  });
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  
  const { criar, atualizar, buscar, deletar } = usePlanos();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Clientes - Planos | Gestor Tech Play";
    const carregar = async () => {
      const data = await buscar();
      setPlanos(data || []);
    };
    carregar();
  }, [buscar]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.valor.trim()) return;
    
    setLoading(true);
    try {
      if (editingPlano) {
        const atualizado = await atualizar(editingPlano.id!, formData);
        if (atualizado) {
          setPlanos((prev) => 
            prev.map((p) => (p.id === editingPlano.id ? atualizado : p))
          );
          setSuccessMessage("Plano atualizado");
          setShowSuccessDialog(true);
        }
      } else {
        const novo = await criar(formData);
        if (novo) {
          setPlanos((prev) => [novo, ...prev]);
          setSuccessMessage("Plano criado");
          setShowSuccessDialog(true);
        }
      }
      
      setIsDialogOpen(false);
      setEditingPlano(null);
      setFormData({
        nome: "",
        valor: "",
        tipo: "meses",
        quantidade: "",
        descricao: "",
        valor_indicacao: "0",
        indicacao_recorrente: "desativado",
        tipo_painel: ""
      });
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setFormData({
      nome: plano.nome || "",
      valor: plano.valor ? (plano.valor.toString().trim().startsWith("R$") ? plano.valor : formatCurrencyBRL(plano.valor.toString())) : "",
      tipo: plano.tipo || "meses",
      quantidade: plano.quantidade || "",
      descricao: plano.descricao || "",
      valor_indicacao: "0",
      indicacao_recorrente: "desativado",
      tipo_painel: ""
    });
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingPlano(null);
    setFormData({
      nome: "",
      valor: "",
      tipo: "meses",
      quantidade: "",
      descricao: "",
      valor_indicacao: "0",
      indicacao_recorrente: "desativado",
      tipo_painel: ""
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deletar(id);
      setPlanos((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Erro ao excluir plano:", error);
    }
  };

  const filteredPlanos = planos.filter((p) => 
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPeriodo = (plano: Plano) => {
    const qtd = plano.quantidade || "1";
    const tipo = plano.tipo === 'dias' ? 'Dia(s)' : 'Mês(es)';
    return `${qtd} ${tipo}`;
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meus Planos</h1>
          <p className="text-sm text-muted-foreground">Lista com todos os seus planos</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          Adicionar Plano +
        </Button>
      </header>

      {/* Search & Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{filteredPlanos.length} registro(s)</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlanos.length ? (
              filteredPlanos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.id?.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {typeof p.valor === "string" && p.valor.trim().startsWith("R$") ? p.valor : `R$ ${p.valor}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{getPeriodo(p)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
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
                            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o plano "{p.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id!)} className="bg-destructive hover:bg-destructive/90">
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
                  Nenhum plano encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlano ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input
                placeholder="Nome do seu plano"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={formData.valor}
                  onChange={(e) => handleInputChange("valor", formatCurrencyBRL(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange("quantidade", e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value) => handleInputChange("tipo", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meses">Meses</SelectItem>
                  <SelectItem value="dias">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                placeholder="Descrição do plano"
                className="min-h-[80px] resize-none"
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full border-2 border-green-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </main>
  );
}
