
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useClientes, usePlanos, useProdutos, useAplicativos, useTemplatesCobranca } from "@/hooks/useDatabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Edit, Trash, Plus, Send, RefreshCw, Copy } from "lucide-react";
import { format } from "date-fns";
import type { Cliente } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";


export default function ClientesListCreate() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados para dados dos selects
  const [planos, setPlanos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [aplicativos, setAplicativos] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const { criar, buscar, editar, deletar } = useClientes();
  const { buscar: buscarPlanos } = usePlanos();
  const { buscar: buscarProdutos } = useProdutos();
  const { buscar: buscarAplicativos } = useAplicativos();
  const { buscar: buscarTemplates } = useTemplatesCobranca();
  const { dismiss, toast } = useToast();
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  
  // Estados para renovação
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [clienteParaRenovar, setClienteParaRenovar] = useState<Cliente | null>(null);
  
  // Estados para templates e mensagens
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [clienteParaMensagem, setClienteParaMensagem] = useState<Cliente | null>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");
  const [mensagemGerada, setMensagemGerada] = useState("");

  // Funções auxiliares para obter nomes
  const getProdutoNome = (produtoId: string) => {
    if (!produtoId) return 'N/A';
    const produto = produtos.find(p => String(p.id) === produtoId);
    return produto?.nome || produtoId;
  };

  const getPlanoNome = (planoId: string) => {
    if (!planoId) return 'N/A';
    const plano = planos.find(p => String(p.id) === planoId);
    return plano?.nome || planoId;
  };

  const getAplicativoNome = (appId: string) => {
    if (!appId) return 'N/A';
    const app = aplicativos.find(a => String(a.id) === appId);
    return app?.nome || appId;
  };

  // Função para determinar o status do cliente
  const getClienteStatus = (cliente: Cliente) => {
    if (!cliente.data_vencimento) {
      return { status: 'Sem data', variant: 'secondary' as const, bgColor: 'bg-gray-500' };
    }

    const dataVencimento = new Date(cliente.data_vencimento);
    const agora = new Date();
    
    if (dataVencimento < agora) {
      return { status: 'Vencido', variant: 'destructive' as const, bgColor: 'bg-destructive' };
    } else {
      return { status: 'Ativo', variant: 'default' as const, bgColor: 'bg-green-500' };
    }
  };

  // Contagem de clientes por produto/servidor
  const produtosContagem = useMemo(() => {
    const contagem: Record<string, number> = {};
    clientes.forEach(cliente => {
      if (cliente.produto) {
        const nome = getProdutoNome(cliente.produto);
        contagem[nome] = (contagem[nome] || 0) + 1;
      }
    });
    return Object.entries(contagem);
  }, [clientes, produtos]);

  // Função para abrir diálogo de renovação
  const handleRenovarPlano = async (cliente: Cliente) => {
    if (!cliente || !cliente.id) return;
    setClienteParaRenovar(cliente);
    setRenovarDialogOpen(true);
  };

  // Função para executar renovação
  const executarRenovacao = async (incluirIntegracao: boolean) => {
    if (!clienteParaRenovar || !clienteParaRenovar.id) return;
    
    try {
      // Buscar dados do plano para calcular nova data de vencimento
      const plano = planos.find(p => String(p.id) === clienteParaRenovar.plano || p.nome === clienteParaRenovar.plano);
      if (!plano) {
        toast({
          title: "Erro",
          description: "Plano não encontrado",
          variant: "destructive",
        });
        return;
      }

      // Calcular nova data de vencimento
      const dataAtualVencimento = clienteParaRenovar.data_vencimento 
        ? new Date(clienteParaRenovar.data_vencimento) 
        : new Date();
      
      const hoje = new Date();
      const baseData = dataAtualVencimento > hoje ? dataAtualVencimento : hoje;
      
      let novaDataVencimento = new Date(baseData);
      const qtd = parseInt(String(plano.quantidade || 0)) || 0;
      
      if (plano.tipo === "dias") {
        novaDataVencimento.setDate(novaDataVencimento.getDate() + qtd);
      } else if (plano.tipo === "meses") {
        novaDataVencimento.setMonth(novaDataVencimento.getMonth() + qtd);
      } else if (plano.tipo === "anos") {
        novaDataVencimento.setFullYear(novaDataVencimento.getFullYear() + qtd);
      }

      const year = novaDataVencimento.getFullYear();
      const month = String(novaDataVencimento.getMonth() + 1).padStart(2, '0');
      const day = String(novaDataVencimento.getDate()).padStart(2, '0');
      const dataVencimentoBrasilia = `${year}-${month}-${day}T23:59:59-03:00`;

      const updateData: any = { 
        data_vencimento: dataVencimentoBrasilia
      };
      
      if (incluirIntegracao) {
        updateData.data_venc_app = `${year}-${month}-${day}T23:59:59-03:00`;
      }

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', clienteParaRenovar.id);

      if (error) {
        console.error('Erro ao renovar plano:', error);
        toast({
          title: "Erro",
          description: "Erro ao renovar plano",
          variant: "destructive",
        });
        return;
      }

      carregarClientes();
      
      const mensagem = `Plano renovado até ${novaDataVencimento.toLocaleDateString('pt-BR')}`;
      
      toast({
        title: "Sucesso",
        description: mensagem,
      });

      setRenovarDialogOpen(false);
      setClienteParaRenovar(null);

    } catch (error) {
      console.error('Erro ao renovar plano:', error);
      toast({
        title: "Erro",
        description: "Erro ao renovar plano",
        variant: "destructive",
      });
    }
  };

  // Funções para editar e deletar
  const handleEditCliente = (cliente: Cliente) => {
    if (!cliente || !cliente.id) return;
    
    setEditingCliente(cliente);
    setIsEditing(true);
    
    form.reset({
      nome: cliente.nome || "",
      whatsapp: cliente.whatsapp || "",
      email: cliente.email || "",
      dataVenc: cliente.data_vencimento ? cliente.data_vencimento.slice(0, 10) : "",
      fixo: cliente.fixo || false,
      usuario: cliente.usuario || "",
      senha: cliente.senha || "",
      produto: cliente.produto || "",
      plano: cliente.plano || "",
      app: cliente.app || "",
      dataVencApp: cliente.data_venc_app || "",
      telas: cliente.telas || 1,
      mac: cliente.mac || "",
      dispositivo: cliente.dispositivo || "",
      fatura: cliente.fatura || "Pago",
      key: cliente.key || "",
      mensagem: cliente.mensagem || "",
      lembretes: cliente.lembretes || false,
      indicador: cliente.indicador || "",
      desconto: cliente.desconto || "0,00",
      descontoRecorrente: cliente.desconto_recorrente || false,
      aniversario: cliente.aniversario || "",
      observacao: cliente.observacao || "",
    });
    
    setIsModalOpen(true);
    setOpen(true);
  };

  const handleDeleteCliente = (clienteId: string) => {
    if (!clienteId) return;
    const target = clientes.find(c => c && c.id === clienteId) || null;
    setDeleteTarget(target);
  };

  const confirmDeleteCliente = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deletar(deleteTarget.id);
      setClientes(prev => prev.filter(c => c.id !== deleteTarget.id));
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const resetModal = () => {
    setEditingCliente(null);
    setIsEditing(false);
    form.reset({
      nome: "",
      whatsapp: "",
      email: "",
      dataVenc: "",
      fixo: false,
      usuario: "",
      senha: "",
      produto: "",
      plano: "",
      app: "",
      dataVencApp: "",
      telas: 1,
      mac: "",
      dispositivo: "",
      fatura: "Pago",
      key: "",
      mensagem: "",
      lembretes: false,
      indicador: "",
      desconto: "0,00",
      descontoRecorrente: false,
      aniversario: "",
      observacao: "",
    });
  };

  // Função para abrir diálogo de templates
  const handleCopiarMensagem = (cliente: Cliente) => {
    setClienteParaMensagem(cliente);
    setTemplateSelecionado("");
    setMensagemGerada("");
    setTemplateDialogOpen(true);
  };

  // Função para gerar mensagem com dados do cliente
  const gerarMensagemComCliente = () => {
    if (!templateSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um template",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === templateSelecionado);
    if (!template || !clienteParaMensagem) return;

    const sanitizeNumber = (val: any) => {
      if (val === null || val === undefined) return 0;
      const cleaned = String(val).replace(/[^0-9,.-]/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const normalize = (s: any) => String(s ?? '').trim().toLowerCase();

    const findPlano = () => {
      const cliVal = clienteParaMensagem.plano;
      let p = planos.find(pl => String(pl.id) === String(cliVal));
      if (p) return p;
      p = planos.find(pl => normalize(pl.nome) === normalize(cliVal));
      if (p) return p;
      p = planos.find(pl => normalize(pl.nome).includes(normalize(cliVal)) || normalize(cliVal).includes(normalize(pl.nome)));
      return p;
    };

    const plano = findPlano();
    const planoNome = plano?.nome || clienteParaMensagem.plano || "N/A";
    const valorPlano = sanitizeNumber(plano?.valor);

    const hora = new Date().getHours();
    let saudacao = "Bom dia";
    if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
    else if (hora >= 18) saudacao = "Boa noite";

    let dataVencimento = "N/A";
    if (clienteParaMensagem.data_vencimento) {
      try {
        dataVencimento = format(new Date(clienteParaMensagem.data_vencimento), "dd/MM/yyyy");
      } catch {
        dataVencimento = clienteParaMensagem.data_vencimento;
      }
    }

    const desconto = sanitizeNumber(clienteParaMensagem.desconto);
    const total = Math.max(0, valorPlano - desconto);

    let mensagemFinal = template.mensagem || "";
    
    const f2 = (n: number) => n.toFixed(2);
    const normalizeKey = (s: any) => String(s ?? "").toLowerCase().replace(/[\s_-]/g, "");

    const map: Record<string, string> = {
      saudacao,
      nome: clienteParaMensagem.nome || "",
      cliente: clienteParaMensagem.nome || "",
      nomecliente: clienteParaMensagem.nome || "",
      plano: planoNome,
      valor: f2(valorPlano),
      valorplano: f2(valorPlano),
      desconto: f2(desconto),
      total: f2(total),
      vencimento: dataVencimento,
      datavencimento: dataVencimento,
      usuario: clienteParaMensagem.usuario || clienteParaMensagem.email || "",
      senha: clienteParaMensagem.senha || "",
    };

    mensagemFinal = mensagemFinal.replace(/\{([^{}]+)\}/g, (full, key) => {
      const k = normalizeKey(key);
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : full;
    });

    setMensagemGerada(mensagemFinal);
  };

  const copiarMensagemGerada = () => {
    if (!mensagemGerada) {
      toast({
        title: "Erro",
        description: "Gere a mensagem primeiro",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(mensagemGerada);
    toast({
      title: "Sucesso",
      description: "Mensagem copiada!",
    });
  };

  useEffect(() => {
    document.title = "Clientes - Listar/Criar | Gestor Tech Play";
    carregarClientes();
    carregarDadosSelects();
  }, []);

  const carregarClientes = async () => {
    setLoadingClientes(true);
    try {
      const data = await buscar();
      const clientesValidos = (data || []).filter(cliente => cliente && cliente.id);
      setClientes(clientesValidos);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const carregarDadosSelects = async () => {
    setLoadingData(true);
    try {
      const [planosData, produtosData, aplicativosData, templatesData] = await Promise.all([
        buscarPlanos(),
        buscarProdutos(),
        buscarAplicativos(),
        buscarTemplates(),
      ]);
      setPlanos(planosData || []);
      setProdutos(produtosData || []);
      setAplicativos(aplicativosData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados dos selects:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtros
  const filtros = useForm({
    defaultValues: {
      dataInicial: "",
      dataFinal: "",
      status: "",
      plano: "",
      produto: "",
      search: "",
    },
  });

  const handleBuscar = () => {
    // Filtros são aplicados automaticamente via useMemo
  };

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    const filtrosValues = filtros.watch();
    
    return clientes.filter((cliente) => {
      if (!cliente || !cliente.id) return false;

      if (filtrosValues.search) {
        const searchTerm = filtrosValues.search.toLowerCase();
        const matches = 
          cliente.nome?.toLowerCase().includes(searchTerm) ||
          cliente.whatsapp?.toLowerCase().includes(searchTerm) ||
          cliente.email?.toLowerCase().includes(searchTerm) ||
          cliente.usuario?.toLowerCase().includes(searchTerm);
        if (!matches) return false;
      }

      if (filtrosValues.dataInicial && cliente.data_vencimento) {
        const dataVenc = new Date(cliente.data_vencimento);
        const dataInicial = new Date(filtrosValues.dataInicial);
        if (dataVenc < dataInicial) return false;
      }

      if (filtrosValues.dataFinal && cliente.data_vencimento) {
        const dataVenc = new Date(cliente.data_vencimento);
        const dataFinal = new Date(filtrosValues.dataFinal);
        if (dataVenc > dataFinal) return false;
      }

      if (filtrosValues.status && filtrosValues.status !== "todos") {
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);
        
        const dataVenc = cliente.data_vencimento ? new Date(cliente.data_vencimento) : null;
        
        switch (filtrosValues.status) {
          case "ativo":
            if (!dataVenc || dataVenc < inicioHoje) return false;
            break;
          case "vencido":
            if (!dataVenc || dataVenc >= inicioHoje) return false;
            break;
        }
      }

      if (filtrosValues.plano && filtrosValues.plano !== "todos") {
        if (cliente.plano !== filtrosValues.plano) return false;
      }

      if (filtrosValues.produto && filtrosValues.produto !== "todos") {
        if (cliente.produto !== filtrosValues.produto) return false;
      }

      return true;
    });
  }, [clientes, filtros.watch()]);

  // Formulário Novo Cliente
  const form = useForm({
    defaultValues: {
      nome: "",
      whatsapp: "",
      email: "",
      dataVenc: "",
      fixo: false,
      usuario: "",
      senha: "",
      produto: "",
      plano: "",
      app: "",
      dataVencApp: "",
      telas: 1,
      mac: "",
      dispositivo: "",
      fatura: "Pago",
      key: "",
      mensagem: "",
      lembretes: false,
      indicador: "",
      desconto: "0,00",
      descontoRecorrente: false,
      aniversario: "",
      observacao: "",
    },
  });

  const onSubmitNovoCliente = form.handleSubmit(async (data) => {
    dismiss();
    
    if (!data.nome || data.nome.trim() === '') {
      toast({
        title: "Erro",
        description: "O campo Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.dataVenc) {
      toast({
        title: "Erro",
        description: "O campo Data de Vencimento é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.plano) {
      toast({
        title: "Erro",
        description: "O campo Plano é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      if (isEditing && editingCliente) {
        const clienteAtualizado = await editar(editingCliente.id, {
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
           data_vencimento: data.dataVenc ? new Date(data.dataVenc + 'T23:59:59.999Z').toISOString() : null,
          fixo: data.fixo,
          usuario: data.usuario,
          senha: data.senha,
          produto: data.produto,
          plano: data.plano,
          app: data.app,
          data_venc_app: data.dataVencApp ? new Date(data.dataVencApp + 'T23:59:59.999Z').toISOString() : null,
          telas: data.telas,
          mac: data.mac,
          dispositivo: data.dispositivo,
          fatura: data.fatura,
          key: data.key,
          mensagem: data.mensagem,
          lembretes: data.lembretes,
          indicador: data.indicador,
          desconto: data.desconto,
          desconto_recorrente: data.descontoRecorrente,
          aniversario: data.aniversario,
          observacao: data.observacao
        });
        setClientes(prev => prev.map(c => c.id === editingCliente.id ? clienteAtualizado : c));
        setSuccessMessage("Cliente atualizado");
        setShowSuccessDialog(true);
      } else {
        const novoCliente = await criar({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
          data_vencimento: data.dataVenc ? new Date(data.dataVenc + 'T23:59:59.999Z').toISOString() : null,
          fixo: data.fixo,
          usuario: data.usuario,
          senha: data.senha,
          produto: data.produto,
          plano: data.plano,
          app: data.app,
          data_venc_app: data.dataVencApp ? new Date(data.dataVencApp + 'T23:59:59.999Z').toISOString() : null,
          telas: data.telas,
          mac: data.mac,
          dispositivo: data.dispositivo,
          fatura: data.fatura,
          key: data.key,
          mensagem: data.mensagem,
          lembretes: data.lembretes,
          indicador: data.indicador,
          desconto: data.desconto,
          desconto_recorrente: data.descontoRecorrente,
          aniversario: data.aniversario,
          observacao: data.observacao
        });
        setClientes(prev => [novoCliente, ...prev]);
        setSuccessMessage("Cliente criado");
        setShowSuccessDialog(true);
      }
      resetModal();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meus Clientes</h1>
          <p className="text-sm text-muted-foreground">Lista com todos os seus clientes</p>
        </div>
        <Button 
          onClick={() => { resetModal(); setOpen(true); }}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          Adicionar Cliente +
        </Button>
      </div>

      {/* Seção de Filtros */}
      <div className="bg-card rounded-lg border border-border/50 p-6 space-y-4">
        {/* Linha 1: Busca, Servidor, Planos, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Busca</Label>
            <Input 
              placeholder="" 
              {...filtros.register("search")}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Servidor</Label>
            <Select onValueChange={(v) => filtros.setValue("produto", v)} disabled={loadingData}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtos.map((produto) => (
                  <SelectItem key={produto.id} value={String(produto.id)}>
                    {produto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Planos</Label>
            <Select onValueChange={(v) => filtros.setValue("plano", v)} disabled={loadingData}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {planos.map((plano) => (
                  <SelectItem key={plano.id} value={String(plano.id)}>
                    {plano.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Status</Label>
            <Select onValueChange={(v) => filtros.setValue("status", v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Data Vencimento Inicial, Data Vencimento Final */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Data Vencimento Inicial</Label>
            <Input 
              type="date"
              placeholder="dd/mm/aaaa"
              {...filtros.register("dataInicial")}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Data Vencimento Final</Label>
            <Input 
              type="date"
              placeholder="dd/mm/aaaa"
              {...filtros.register("dataFinal")}
              className="bg-background"
            />
          </div>
        </div>

        {/* Botão Buscar */}
        <div>
          <Button 
            onClick={handleBuscar}
            className="bg-pink-600 hover:bg-pink-700 text-white px-8"
          >
            Buscar
          </Button>
        </div>
      </div>

      {/* Badges de Servidores com Contagem */}
      {produtosContagem.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {produtosContagem.map(([nome, count]) => (
            <Badge 
              key={nome} 
              variant="outline" 
              className="bg-card border-border text-foreground px-3 py-1"
            >
              {nome} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Info de registros */}
      <div className="flex justify-end">
        <span className="text-sm text-muted-foreground">
          Mostrando {clientesFiltrados.length} de {clientes.length} registros.
        </span>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10"></TableHead>
              <TableHead className="font-medium">Nome do Cliente:</TableHead>
              <TableHead className="font-medium">Saldo:</TableHead>
              <TableHead className="font-medium">Gerou Teste:</TableHead>
              <TableHead className="font-medium">Vencimento:</TableHead>
              <TableHead className="font-medium">Status:</TableHead>
              <TableHead className="font-medium">Plano:</TableHead>
              <TableHead className="font-medium">Servidor:</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingClientes ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <span className="text-muted-foreground">Carregando clientes...</span>
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <span className="text-muted-foreground">Nenhum cliente encontrado</span>
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados
                .filter(cliente => cliente && cliente.id)
                .map((cliente) => {
                  const { status } = getClienteStatus(cliente);
                  return (
                    <TableRow 
                      key={cliente.id} 
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => handleEditCliente(cliente)}
                    >
                      <TableCell>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cliente.nome}</span>
                          {cliente.whatsapp && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500">
                              <MessageSquare className="h-3 w-3 text-white" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-500 font-medium">R$ 0,00</span>
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500">
                          <MessageSquare className="h-3 w-3 text-white" />
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted border-muted-foreground/30 text-muted-foreground">
                          Não
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.data_vencimento 
                          ? format(new Date(cliente.data_vencimento), "dd/MM/yyyy")
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={status === 'Vencido' 
                            ? 'bg-transparent border-yellow-500 text-yellow-500' 
                            : status === 'Ativo'
                            ? 'bg-transparent border-green-500 text-green-500'
                            : 'bg-transparent border-muted-foreground text-muted-foreground'
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPlanoNome(cliente.plano)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-card border-border">
                          {getProdutoNome(cliente.produto)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Criar/Editar Cliente */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmitNovoCliente} className="space-y-6">
            {/* Bloco 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome <span className="text-destructive">*</span></Label>
                <Input id="nome" placeholder="Nome" {...form.register("nome")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Whatsapp</Label>
                <Input id="whatsapp" placeholder="WhatsApp" {...form.register("whatsapp")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="email opcional" type="email" {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVenc">Data vencimento <span className="text-destructive">*</span></Label>
                <Input id="dataVenc" type="date" {...form.register("dataVenc")} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox id="fixo" checked={form.watch("fixo")} onCheckedChange={(v) => form.setValue("fixo", Boolean(v))} />
                <div className="space-y-1">
                  <Label htmlFor="fixo">Data de vencimento fixa</Label>
                  <p className="text-xs text-muted-foreground">
                    mesmo o cliente estando vencido a data será renovada no mesmo dia dos próximos meses
                    <br />
                    <span className="text-primary">Essa opção só é válida para planos mensais</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário</Label>
                <Input id="usuario" placeholder="usuario opcional" {...form.register("usuario")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" placeholder="senha opcional" type="password" {...form.register("senha")} />
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={form.watch("produto")} onValueChange={(v) => form.setValue("produto", v)} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Carregando produtos..." : "Selecione um produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.length === 0 && !loadingData ? (
                      <SelectItem value="no-products" disabled>
                        Nenhum produto cadastrado
                      </SelectItem>
                    ) : (
                      produtos.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select value={form.watch("plano")} onValueChange={(v) => form.setValue("plano", v)} disabled={loadingData} required>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Carregando planos..." : "Selecione um plano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.length === 0 && !loadingData ? (
                      <SelectItem value="no-plans" disabled>
                        Nenhum plano cadastrado
                      </SelectItem>
                    ) : (
                      planos.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aplicativo</Label>
                <Select value={form.watch("app")} onValueChange={(v) => form.setValue("app", v)} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Carregando aplicativos..." : "Selecione um aplicativo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {aplicativos.length === 0 && !loadingData ? (
                      <SelectItem value="no-apps" disabled>
                        Nenhum aplicativo cadastrado
                      </SelectItem>
                    ) : (
                      aplicativos.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVencApp">Data vencimento app</Label>
                <Input id="dataVencApp" type="date" {...form.register("dataVencApp")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telas">Telas</Label>
                <Input id="telas" type="number" min={1} {...form.register("telas", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mac">Mac</Label>
                <Input id="mac" placeholder="Mac opcional" {...form.register("mac")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispositivo">Dispositivos</Label>
                <Input id="dispositivo" placeholder="Dispositivo opcional" {...form.register("dispositivo")} />
              </div>
              <div className="space-y-2">
                <Label>Fatura</Label>
                <Select defaultValue="Pago" onValueChange={(v) => form.setValue("fatura", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bloco 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key ou otp</Label>
                <Input id="key" placeholder="Key ou otp opcional" {...form.register("key")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mensagem">Mensagem</Label>
                <Input id="mensagem" placeholder="Se deseja enviar uma mensagem" {...form.register("mensagem")} />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox id="lembretes" checked={form.watch("lembretes")} onCheckedChange={(v) => form.setValue("lembretes", Boolean(v))} />
                <Label htmlFor="lembretes">Ativar lembretes</Label>
              </div>
              <div className="space-y-2">
                <Label>Cliente indicador</Label>
                <Select value={form.watch("indicador")} onValueChange={(v) => form.setValue("indicador", v)} disabled={loadingClientes}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClientes ? "Carregando clientes..." : "Selecione o indicador"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desconto">Desconto</Label>
                <Input id="desconto" placeholder="R$ 0,00" {...form.register("desconto")} />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox id="descontoRecorrente" checked={form.watch("descontoRecorrente")} onCheckedChange={(v) => form.setValue("descontoRecorrente", Boolean(v))} />
                <Label htmlFor="descontoRecorrente">Desconto recorrente</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aniversario">Aniversário</Label>
                <Input id="aniversario" type="date" {...form.register("aniversario")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea id="observacao" placeholder="Observação opcional" {...form.register("observacao")} />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={resetModal}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading} className="bg-primary">
                {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground text-center">
          <div className="flex flex-col items-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Sucesso</h2>
            <p className="text-muted-foreground">{successMessage}</p>
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-cyan-500 hover:bg-cyan-600 text-white px-8">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar Exclusão do Cliente */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCliente} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar Renovação do Plano */}
      <AlertDialog open={renovarDialogOpen} onOpenChange={setRenovarDialogOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Renovar plano</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Confirma a renovação do plano do cliente "{clienteParaRenovar?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              className="border-border hover:bg-muted"
              onClick={() => {
                setRenovarDialogOpen(false);
                setClienteParaRenovar(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={() => executarRenovacao(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Renovar Plano
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Templates e Mensagem */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar mensagem para {clienteParaMensagem?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Selecione o template</Label>
              <Select value={templateSelecionado} onValueChange={setTemplateSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={gerarMensagemComCliente}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              Gerar mensagem
            </Button>

            {mensagemGerada && (
              <div className="space-y-2">
                <Label>Mensagem gerada</Label>
                <Textarea
                  value={mensagemGerada}
                  readOnly
                  rows={10}
                  className="bg-muted"
                />
                <Button 
                  onClick={copiarMensagemGerada}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar mensagem
                </Button>
              </div>
            )}

            <div className="pt-2 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Variáveis disponíveis nos templates:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{"{saudacao}"} - Saudação baseada no horário (Bom dia, Boa tarde, Boa noite)</li>
                <li>{"{nome}"}, {"{cliente}"} ou {"{nome_cliente}"} - Nome do cliente</li>
                <li>{"{usuario}"} - Usuário do cliente</li>
                <li>{"{senha}"} - Senha do cliente</li>
                <li>{"{plano}"} - Nome do plano</li>
                <li>{"{valor}"} ou {"{valor_plano}"} - Valor do plano</li>
                <li>{"{desconto}"} - Desconto aplicado</li>
                <li>{"{total}"} - Total após desconto (valor - desconto)</li>
                <li>{"{vencimento}"} ou {"{data_vencimento}"} - Data de vencimento</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
