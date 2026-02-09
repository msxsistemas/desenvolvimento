import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Loader2, Users, Gift, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface Indicacao {
  id: string;
  nome_indicador: string;
  whatsapp_indicador: string;
  clientes_indicados: number;
  bonus_acumulado: number;
  created_at: string;
  user_id: string;
}

export default function Indicacoes() {
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndicacao, setEditingIndicacao] = useState<Indicacao | null>(null);
  const [formData, setFormData] = useState({ 
    nome_indicador: "", 
    whatsapp_indicador: "",
    clientes_indicados: 0,
    bonus_acumulado: 0
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { userId } = useCurrentUser();

  useEffect(() => {
    document.title = "Indicações | Tech Play";
  }, []);

  useEffect(() => {
    if (userId) {
      fetchIndicacoes();
    }
  }, [userId]);

  const fetchIndicacoes = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Buscar clientes que têm indicador preenchido e agrupar
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('indicador')
        .eq('user_id', userId)
        .not('indicador', 'is', null)
        .not('indicador', 'eq', '');

      if (error) throw error;

      // Agrupar por indicador
      const indicadoresMap = new Map<string, number>();
      clientes?.forEach(cliente => {
        if (cliente.indicador) {
          const count = indicadoresMap.get(cliente.indicador) || 0;
          indicadoresMap.set(cliente.indicador, count + 1);
        }
      });

      // Converter para array
      const indicacoesData: Indicacao[] = Array.from(indicadoresMap.entries()).map(([nome, count], index) => ({
        id: `ind-${index}`,
        nome_indicador: nome,
        whatsapp_indicador: '',
        clientes_indicados: count,
        bonus_acumulado: 0,
        created_at: new Date().toISOString(),
        user_id: userId
      }));

      setIndicacoes(indicacoesData);
    } catch (error) {
      console.error('Erro ao carregar indicações:', error);
      toast.error('Erro ao carregar indicações');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (indicacao: Indicacao) => {
    setEditingIndicacao(indicacao);
    setFormData({ 
      nome_indicador: indicacao.nome_indicador, 
      whatsapp_indicador: indicacao.whatsapp_indicador,
      clientes_indicados: indicacao.clientes_indicados,
      bonus_acumulado: indicacao.bonus_acumulado
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingIndicacao(null);
    setFormData({ 
      nome_indicador: "", 
      whatsapp_indicador: "",
      clientes_indicados: 0,
      bonus_acumulado: 0
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_indicador.trim()) {
      toast.error('Informe o nome do indicador');
      return;
    }

    setSaving(true);
    try {
      // Como indicações são derivadas dos clientes, apenas mostramos uma mensagem
      toast.info('Indicações são gerenciadas através do cadastro de clientes');
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const filteredIndicacoes = indicacoes.filter((i) =>
    i.nome_indicador.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIndicadores = indicacoes.length;
  const totalIndicados = indicacoes.reduce((acc, i) => acc + i.clientes_indicados, 0);
  const totalBonus = indicacoes.reduce((acc, i) => acc + i.bonus_acumulado, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Indicações</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus indicadores e recompensas</p>
        </div>
        <Button onClick={handleNew} className="bg-primary hover:bg-primary/90">
          Novo Indicador +
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Indicadores</p>
              <p className="text-2xl font-bold text-foreground">{totalIndicadores}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Indicados</p>
              <p className="text-2xl font-bold text-foreground">{totalIndicados}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Gift className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bônus Acumulado</p>
              <p className="text-2xl font-bold text-foreground">R$ {totalBonus.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Busca</Label>
            <Input
              placeholder="Buscar indicador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm("")}
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Record count */}
      <div className="text-right text-sm text-muted-foreground">
        Mostrando {filteredIndicacoes.length} de {indicacoes.length} registros.
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Indicador</TableHead>
              <TableHead className="text-center">Clientes Indicados</TableHead>
              <TableHead className="text-center">Bônus Acumulado</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIndicacoes.length ? (
              filteredIndicacoes.map((indicacao) => (
                <TableRow key={indicacao.id}>
                  <TableCell className="font-medium">{indicacao.nome_indicador}</TableCell>
                  <TableCell className="text-center">{indicacao.clientes_indicados}</TableCell>
                  <TableCell className="text-center">R$ {indicacao.bonus_acumulado.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(indicacao)}
                        className="h-8 w-8 text-primary hover:text-primary/80"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir indicador</AlertDialogTitle>
                            <AlertDialogDescription>
                              Para remover um indicador, edite os clientes associados e remova o campo de indicação.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Entendi</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum indicador encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIndicacao ? "Editar Indicador" : "Novo Indicador"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Indicador</Label>
              <Input
                value={formData.nome_indicador}
                onChange={(e) => setFormData({ ...formData, nome_indicador: e.target.value })}
                placeholder="Digite o nome do indicador"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp do Indicador</Label>
              <Input
                value={formData.whatsapp_indicador}
                onChange={(e) => setFormData({ ...formData, whatsapp_indicador: e.target.value })}
                placeholder="Ex: 5511999999999"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              💡 Dica: Indicadores são criados automaticamente quando você preenche o campo "Indicador" no cadastro de clientes.
            </p>
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
