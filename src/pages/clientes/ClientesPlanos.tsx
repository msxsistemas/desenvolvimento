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
import { Pencil, Trash2, Plus, Home, Eye } from "lucide-react";
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
    <main className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-green-400">Gerenciar planos</span>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div />
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Adicionar Plano <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Main Card */}
      <section className="bg-[#1e1e2d] rounded-lg border border-[#2d2d3d]">
        {/* Card Header */}
        <div className="p-6 border-b border-[#2d2d3d] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Meus Planos</h2>
            <p className="text-slate-400 text-sm">Lista com todos os seus planos</p>
          </div>
          <button className="text-slate-400 hover:text-white">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-[#2d2d3d]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Busca</Label>
              <Input
                placeholder=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 bg-[#13131a] border-[#2d2d3d] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-[#13131a] border-[#2d2d3d] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e2d] border-[#2d2d3d]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativado">Ativado</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              Buscar
            </Button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="px-6 py-3 text-right">
          <span className="text-slate-400 text-sm">
            Mostrando {filteredPlanos.length} de {planos.length} registros.
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d2d3d] hover:bg-transparent">
                <TableHead className="text-slate-400 font-medium">ID:</TableHead>
                <TableHead className="text-slate-400 font-medium">Nome:</TableHead>
                <TableHead className="text-slate-400 font-medium">Valor:</TableHead>
                <TableHead className="text-slate-400 font-medium">Período:</TableHead>
                <TableHead className="text-slate-400 font-medium">Pacote:</TableHead>
                <TableHead className="text-slate-400 font-medium">Status:</TableHead>
                <TableHead className="text-slate-400 font-medium">Ações:</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlanos.length ? (
                filteredPlanos.map((p, index) => (
                  <TableRow key={p.id} className="border-[#2d2d3d] hover:bg-[#252536]">
                    <TableCell className="text-slate-300">{planos.length - index}</TableCell>
                    <TableCell className="text-purple-400">{p.nome}</TableCell>
                    <TableCell className="text-slate-300">
                      {typeof p.valor === "string" && p.valor.trim().startsWith("R$") ? p.valor : `R$ ${p.valor}`}
                    </TableCell>
                    <TableCell className="text-slate-300">{getPeriodo(p)}</TableCell>
                    <TableCell className="text-slate-300">Sem Pacote</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white">
                        Ativado
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(p)}
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 bg-orange-500 hover:bg-orange-600 text-white rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1e1e2d] border-[#2d2d3d] text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir plano</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Tem certeza que deseja excluir o plano "{p.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-[#2d2d3d] text-white hover:bg-[#252536]">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(p.id!)} className="bg-red-500 hover:bg-red-600 text-white">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-[#2d2d3d]">
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    Nada para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#1e1e2d] border-[#2d2d3d] text-white">
          <DialogHeader className="border-b border-[#2d2d3d] pb-4">
            <DialogTitle className="text-white text-xl">
              {editingPlano ? "Editar Plano" : "Cadastrar Novo Plano"}
            </DialogTitle>
            <p className="text-green-400 text-sm mt-1">
              Cadastre seus planos agora mesmo!
            </p>
            <div className="mt-2 text-xs space-y-1">
              <p className="text-slate-400">
                1 - O consumo de créditos para renovação nos paineis com integração é baseado no{" "}
                <span className="text-purple-400">Período do Plano do Cliente</span> configurado. Tenha bastante atenção ao configurar seus Planos
              </p>
              <p className="text-red-400">
                2 - NÃO NOS RESPONSABILIZAMOS PELOS CRÉDITOS UTILIZADOS EM SEU PAINEL, POIS O GASTO É DE ACORDO COM A QUANTIDADE DO PERÍODO CADASTRADO NOS PLANOS
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome do plano</Label>
              <Input
                placeholder="Nome do seu plano"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className="bg-[#13131a] border-[#2d2d3d] text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Valor do plano</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Valor do seu plano"
                value={formData.valor}
                onChange={(e) => handleInputChange("valor", formatCurrencyBRL(e.target.value))}
                className="bg-[#13131a] border-[#2d2d3d] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Valor da Indicação:</Label>
              <Input
                type="text"
                value={formData.valor_indicacao}
                onChange={(e) => handleInputChange("valor_indicacao", e.target.value)}
                className="bg-[#13131a] border-[#2d2d3d] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                Indicação Recorrente? <span className="text-yellow-400">(essa opção vai adicionar comissão para quem indicou todas as vezes que seu cliente renovar)</span>
              </Label>
              <Select value={formData.indicacao_recorrente} onValueChange={(value) => handleInputChange("indicacao_recorrente", value)}>
                <SelectTrigger className="bg-[#13131a] border-[#2d2d3d] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e2d] border-[#2d2d3d]">
                  <SelectItem value="desativado">Desativado</SelectItem>
                  <SelectItem value="ativado">Ativado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tipo do Painel</Label>
              <Select value={formData.tipo_painel} onValueChange={(value) => handleInputChange("tipo_painel", value)}>
                <SelectTrigger className="bg-[#13131a] border-[#2d2d3d] text-white">
                  <SelectValue placeholder="Selecionar o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e2d] border-[#2d2d3d]">
                  <SelectItem value="meses">Meses</SelectItem>
                  <SelectItem value="dias">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Quantidade de {formData.tipo_painel || "meses"}</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantidade}
                onChange={(e) => handleInputChange("quantidade", e.target.value)}
                className="bg-[#13131a] border-[#2d2d3d] text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                className="bg-[#13131a] border-[#2d2d3d] text-white min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Salvando..." : "Cadastrar"}
              </Button>
              <Button variant="outline" onClick={handleCancel} className="border-[#2d2d3d] text-white hover:bg-[#252536]">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-[#1e1e2d] border-[#2d2d3d] text-white text-center">
          <div className="flex flex-col items-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Sucesso</h2>
            <p className="text-slate-300">{successMessage}</p>
            <Button 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
