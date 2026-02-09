import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, TrendingUp, TrendingDown, Pencil, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { toast } from "sonner";

export default function Financeiro() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  const [mostrarValores, setMostrarValores] = useState(true);
  const [filtroDataInicio, setFiltroDataInicio] = useState(format(inicioMes, 'yyyy-MM-dd'));
  const [filtroDataFim, setFiltroDataFim] = useState(format(fimMes, 'yyyy-MM-dd'));
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const { entradas, saidas, lucros, transacoes, loading, error, salvarTransacao, editarTransacao, excluirTransacao } = useFinanceiro();

  // Estado para o modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState<any>(null);
  const [formData, setFormData] = useState({
    valor: "",
    tipo: "entrada" as "entrada" | "saida",
    descricao: ""
  });

  // Estado para o diálogo de confirmação
  const [dialogoExclusaoAberto, setDialogoExclusaoAberto] = useState(false);
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<any>(null);

  // SEO
  useEffect(() => {
    document.title = "Financeiro | Gestor Tech Play";
  }, []);

  const formatarValor = (valor: number) => {
    if (!mostrarValores) return "•••••";
    return new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "BRL" 
    }).format(valor);
  };

  // Filtrar transações baseado nos filtros aplicados
  const transacoesFiltradas = useMemo(() => {
    if (!filtroDataInicio && !filtroDataFim && filtroTipo === "todos" && !termoPesquisa) {
      return transacoes;
    }
    
    return transacoes.filter(transacao => {
      // Filtro por data
      if (filtroDataInicio || filtroDataFim) {
        const dataStr = transacao.data.split(',')[0].trim();
        const [dia, mes, ano] = dataStr.split('/');
        const dataTransacao = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        
        if (filtroDataInicio && dataTransacao < filtroDataInicio) return false;
        if (filtroDataFim && dataTransacao > filtroDataFim) return false;
      }
      
      // Filtro por tipo
      if (filtroTipo !== "todos" && transacao.tipo !== filtroTipo) return false;
      
      // Filtro por pesquisa
      if (termoPesquisa) {
        const termo = termoPesquisa.toLowerCase();
        const match = (
          transacao.cliente.toLowerCase().includes(termo) ||
          transacao.detalheValor.toLowerCase().includes(termo) ||
          transacao.detalheTitulo.toLowerCase().includes(termo)
        );
        if (!match) return false;
      }
      
      return true;
    });
  }, [transacoes, filtroDataInicio, filtroDataFim, filtroTipo, termoPesquisa]);

  // Calcular métricas filtradas
  const metricasFiltradas = useMemo(() => {
    const entradas = transacoesFiltradas
      .filter(t => t.tipo === 'entrada')
      .reduce((acc, t) => acc + t.valor, 0);
    
    const saidas = transacoesFiltradas
      .filter(t => t.tipo === 'saida')
      .reduce((acc, t) => acc + t.valor, 0);
    
    return {
      entradas,
      saidas,
      lucros: entradas - saidas
    };
  }, [transacoesFiltradas]);

  const handleLimparFiltros = () => {
    setFiltroDataInicio(format(inicioMes, 'yyyy-MM-dd'));
    setFiltroDataFim(format(fimMes, 'yyyy-MM-dd'));
    setFiltroTipo("todos");
    setTermoPesquisa("");
  };

  // Funções do modal
  const abrirModalNovo = () => {
    setModoEdicao(false);
    setTransacaoEditando(null);
    setFormData({ valor: "", tipo: "entrada", descricao: "" });
    setModalAberto(true);
  };

  const abrirModalEdicao = (transacao: any) => {
    if (!transacao.isCustom) {
      toast.error("Só é possível editar transações customizadas");
      return;
    }

    setModoEdicao(true);
    setTransacaoEditando(transacao);
    setFormData({
      valor: transacao.valor.toString(),
      tipo: transacao.tipo,
      descricao: transacao.descricao || `${transacao.cliente}\n${transacao.detalheTitulo}: ${transacao.detalheValor}`
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setTransacaoEditando(null);
    setFormData({ valor: "", tipo: "entrada", descricao: "" });
  };

  const handleSalvar = async () => {
    if (!formData.valor || !formData.descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const valorStr = formData.valor.replace(/[R$\s]/g, '').replace(',', '.');
      const valor = parseFloat(valorStr);

      if (isNaN(valor) || valor <= 0) {
        toast.error("Valor inválido");
        return;
      }

      const novaTransacao = {
        valor,
        tipo: formData.tipo,
        descricao: formData.descricao,
      };

      if (modoEdicao && transacaoEditando && transacaoEditando.isCustom) {
        await editarTransacao(transacaoEditando.id, novaTransacao);
        toast.success("Transação editada com sucesso!");
      } else {
        await salvarTransacao(novaTransacao);
        toast.success("Nova transação criada com sucesso!");
      }
      
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast.error("Erro ao salvar transação");
    }
  };

  const abrirDialogoExclusao = (transacao: any) => {
    if (!transacao.isCustom) {
      toast.error("Só é possível excluir transações customizadas");
      return;
    }

    setTransacaoParaExcluir(transacao);
    setDialogoExclusaoAberto(true);
  };

  const fecharDialogoExclusao = () => {
    setDialogoExclusaoAberto(false);
    setTransacaoParaExcluir(null);
  };

  const confirmarExclusao = async () => {
    if (!transacaoParaExcluir) return;

    try {
      await excluirTransacao(transacaoParaExcluir.id);
      toast.success("Transação excluída com sucesso!");
      fecharDialogoExclusao();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast.error("Erro ao excluir transação");
    }
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão geral de lucros, entradas e saídas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMostrarValores(!mostrarValores)}
            title={mostrarValores ? "Ocultar valores" : "Mostrar valores"}
          >
            {mostrarValores ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button onClick={abrirModalNovo} className="bg-primary hover:bg-primary/90">
            Nova Transação +
          </Button>
        </div>
      </header>

      {/* Cards de métricas */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-success/20 p-2.5">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.lucros)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/20 p-2.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.entradas)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-destructive/20 p-2.5">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.saidas)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/20 p-2.5">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proj. Semanal</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.lucros * 4)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/20 p-2.5">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proj. Mensal</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.lucros)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/20 p-2.5">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proj. Anual</p>
              <p className="text-lg font-bold text-foreground">
                {loading ? "..." : formatarValor(metricasFiltradas.lucros * 12)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Busca</Label>
            <Input
              placeholder="Buscar..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Início</Label>
            <Input 
              type="date" 
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fim</Label>
            <Input 
              type="date" 
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={handleLimparFiltros}>
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Record count */}
      <div className="text-right text-sm text-muted-foreground">
        Mostrando {transacoesFiltradas.length} de {transacoes.length} transações.
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : transacoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              transacoesFiltradas.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {transacoesFiltradas.length - index}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="font-medium">{r.cliente}</span>
                      <p className="text-sm text-muted-foreground">
                        {r.detalheTitulo}: {r.detalheValor}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={r.tipo === "entrada" 
                        ? "border-success/50 bg-success/10 text-success" 
                        : "border-destructive/50 bg-destructive/10 text-destructive"
                      }
                    >
                      {r.tipo === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={r.tipo === "entrada" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                      }
                    >
                      {formatarValor(r.valor)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.data}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirModalEdicao(r)}
                        className="h-8 w-8 text-primary hover:text-primary/80"
                        disabled={!r.isCustom}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirDialogoExclusao(r)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        disabled={!r.isCustom}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Edição/Criação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value: "entrada" | "saida") => setFormData(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Nome do cliente&#10;Plano: Mensal"
                rows={4}
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                className="resize-none"
              />
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={dialogoExclusaoAberto} onOpenChange={setDialogoExclusaoAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={fecharDialogoExclusao}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusao}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
