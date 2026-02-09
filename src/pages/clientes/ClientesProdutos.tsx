import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProdutos } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, AlertTriangle, Pencil, Trash2, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Produto } from "@/types/database";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ClientesProdutos() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    creditos: "",
    descricao: "",
    configuracoesIptv: false,
    provedorIptv: "",
    renovacaoAutomatica: false
  });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    valor: "",
    creditos: "",
    descricao: "",
    configuracoesIptv: false,
    provedorIptv: "",
    renovacaoAutomatica: false
  });
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);
  
  const { criar, buscar, atualizar, deletar } = useProdutos();

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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.valor.trim()) return;
    
    setLoading(true);
    try {
      const novo = await criar({
        nome: formData.nome,
        valor: formData.valor,
        creditos: formData.creditos,
        descricao: formData.descricao,
        configuracoes_iptv: formData.configuracoesIptv,
        provedor_iptv: formData.provedorIptv,
        renovacao_automatica: formData.renovacaoAutomatica
      });
      setSuccessMessage("Produto criado");
      setShowSuccessDialog(true);
      setProdutos((prev) => [novo, ...prev]);
      setIsDialogOpen(false);
      setFormData({
        nome: "",
        valor: "",
        creditos: "",
        descricao: "",
        configuracoesIptv: false,
        provedorIptv: "",
        renovacaoAutomatica: false
      });
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setFormData({
      nome: "",
      valor: "",
      creditos: "",
      descricao: "",
      configuracoesIptv: false,
      provedorIptv: "",
      renovacaoAutomatica: false
    });
  };

  const openEdit = (p: Produto) => {
    setEditingProduto(p);
    setEditForm({
      nome: p.nome ?? "",
      valor: typeof p.valor === "string" ? p.valor : String(p.valor ?? ""),
      creditos: p.creditos ?? "",
      descricao: p.descricao ?? "",
      configuracoesIptv: (p as any).configuracoes_iptv ?? false,
      provedorIptv: (p as any).provedor_iptv ?? "",
      renovacaoAutomatica: (p as any).renovacao_automatica ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!editingProduto?.id) return;
    setLoading(true);
    try {
      const atualizado = await atualizar(editingProduto.id as string, {
        nome: editForm.nome,
        valor: editForm.valor,
        creditos: editForm.creditos,
        descricao: editForm.descricao,
        configuracoes_iptv: editForm.configuracoesIptv as any,
        provedor_iptv: editForm.provedorIptv as any,
        renovacao_automatica: editForm.renovacaoAutomatica as any,
      });
      setProdutos(prev => prev.map(p => (p.id === atualizado.id ? atualizado : p)));
      setIsEditDialogOpen(false);
      setEditingProduto(null);
      setSuccessMessage("Produto atualizado");
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const [desativarTarget, setDesativarTarget] = useState<Produto | null>(null);

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

  const renderFormFields = (data: typeof formData, onChange: (field: string, value: string | boolean) => void) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={data.nome}
            onChange={(e) => onChange("nome", e.target.value)}
            placeholder="Nome do produto"
          />
        </div>
        <div className="space-y-2">
          <Label>Valor</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={data.valor}
            onChange={(e) => onChange("valor", formatCurrencyBRL(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Créditos</Label>
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <Input
          value={data.creditos}
          onChange={(e) => onChange("creditos", e.target.value)}
          placeholder="Quantidade de créditos"
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={data.descricao}
          onChange={(e) => onChange("descricao", e.target.value)}
          placeholder="Descrição do produto"
          className="min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="configIptv"
            checked={data.configuracoesIptv}
            onChange={(e) => onChange("configuracoesIptv", e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="configIptv" className="cursor-pointer">Configurações IPTV</Label>
        </div>

        {data.configuracoesIptv && (
          <div className="space-y-3 pl-6 border-l-2 border-border">
            <div className="space-y-2">
              <Label>Provedor IPTV</Label>
              <Select value={data.provedorIptv} onValueChange={(value) => onChange("provedorIptv", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provedor1">Provedor 1</SelectItem>
                  <SelectItem value="provedor2">Provedor 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Renovação Automática</Label>
                <p className="text-xs text-muted-foreground">Renova automaticamente no servidor IPTV</p>
              </div>
              <Switch
                checked={data.renovacaoAutomatica}
                onCheckedChange={(checked) => onChange("renovacaoAutomatica", checked)}
              />
            </div>

            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Nenhum painel IPTV configurado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

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

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          {renderFormFields(formData, handleInputChange)}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
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
              filteredProdutos.map((p) => (
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
                        onClick={() => openEdit(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(p)}
                        className={`h-8 w-8 ${(p as any).ativo !== false 
                          ? "text-muted-foreground hover:text-warning hover:bg-warning/10" 
                          : "text-muted-foreground hover:text-success hover:bg-success/10"
                        }`}
                        title={(p as any).ativo !== false ? "Desativar" : "Ativar"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {renderFormFields(editForm, handleEditChange)}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
