
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useClientes, usePlanos, useProdutos, useAplicativos, useTemplatesCobranca } from "@/hooks/useDatabase";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Plus, Send, RefreshCw, Power, Copy, Bell, Loader2 } from "lucide-react";
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
  const navigate = useNavigate();
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
  const { sendMessage, session: whatsappSession, loading: sendingMessage } = useEvolutionAPI();
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
  
  // Estados para WhatsApp e toggle
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [clienteParaWhatsapp, setClienteParaWhatsapp] = useState<Cliente | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>("");
  const [whatsappMensagem, setWhatsappMensagem] = useState<string>("");
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [clienteParaToggle, setClienteParaToggle] = useState<Cliente | null>(null);
  const [notificandoId, setNotificandoId] = useState<string | null>(null);
  const [templatesVencimento, setTemplatesVencimento] = useState<any[]>([]);

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
    if ((cliente as any).ativo === false) {
      return { status: 'Inativo', variant: 'secondary' as const, bgColor: 'bg-muted' };
    }

    if (!cliente.data_vencimento) {
      return { status: 'Sem data', variant: 'secondary' as const, bgColor: 'bg-muted' };
    }

    const dataVencimento = new Date(cliente.data_vencimento);
    const agora = new Date();

    if (dataVencimento < agora) {
      return { status: 'Vencido', variant: 'destructive' as const, bgColor: 'bg-destructive' };
    }

    return { status: 'Ativo', variant: 'default' as const, bgColor: 'bg-muted' };
  };

  // Contagem de clientes por produto/servidor com ID para filtragem
  const produtosContagem = useMemo(() => {
    const contagem: Record<string, { nome: string; id: string; count: number }> = {};
    clientes.forEach(cliente => {
      if (cliente.produto) {
        const nome = getProdutoNome(cliente.produto);
        if (!contagem[cliente.produto]) {
          contagem[cliente.produto] = { nome, id: cliente.produto, count: 0 };
        }
        contagem[cliente.produto].count += 1;
      }
    });
    return Object.values(contagem);
  }, [clientes, produtos]);

  // Função para filtrar por servidor ao clicar no badge
  const handleFiltrarPorServidor = (produtoId: string) => {
    const currentValue = filtros.watch("produto");
    if (currentValue === produtoId) {
      // Se já está filtrado por esse servidor, remove o filtro
      filtros.setValue("produto", "");
    } else {
      filtros.setValue("produto", produtoId);
    }
  };

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
    // Navegar para a página de edição com o ID do cliente
    navigate(`/clientes/editar/${cliente.id}`);
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

  // Função para abrir diálogo de WhatsApp
  const handleEnviarWhatsApp = (cliente: Cliente) => {
    if (!cliente || !cliente.whatsapp) return;
    setClienteParaWhatsapp(cliente);
    setWhatsappTemplate("");
    setWhatsappMensagem("");
    setWhatsappDialogOpen(true);
  };

  // Função para obter mensagem final do template (não preenche a textarea)
  const getMensagemDoTemplate = (templateId: string): string => {
    if (!templateId || !clienteParaWhatsapp) return "";

    const template = templates.find(t => t.id === templateId);
    if (!template) return "";

    const sanitizeNumber = (val: any) => {
      if (val === null || val === undefined) return 0;
      const cleaned = String(val).replace(/[^0-9,.-]/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const normalize = (s: any) => String(s ?? '').trim().toLowerCase();

    const findPlano = () => {
      const cliVal = clienteParaWhatsapp.plano;
      let p = planos.find(pl => String(pl.id) === String(cliVal));
      if (p) return p;
      p = planos.find(pl => normalize(pl.nome) === normalize(cliVal));
      if (p) return p;
      p = planos.find(pl => normalize(pl.nome).includes(normalize(cliVal)) || normalize(cliVal).includes(normalize(pl.nome)));
      return p;
    };

    const plano = findPlano();
    const planoNome = plano?.nome || clienteParaWhatsapp.plano || "N/A";
    const valorPlano = sanitizeNumber(plano?.valor);

    const hora = new Date().getHours();
    let saudacao = "Bom dia";
    if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
    else if (hora >= 18) saudacao = "Boa noite";

    let dataVencimento = "N/A";
    if (clienteParaWhatsapp.data_vencimento) {
      try {
        dataVencimento = format(new Date(clienteParaWhatsapp.data_vencimento), "dd/MM/yyyy");
      } catch {
        dataVencimento = String(clienteParaWhatsapp.data_vencimento);
      }
    }

    const desconto = sanitizeNumber(clienteParaWhatsapp.desconto);
    const total = Math.max(0, valorPlano - desconto);

    let mensagemFinal = template.mensagem || "";
    
    const f2 = (n: number) => n.toFixed(2);
    const normalizeKey = (s: any) => String(s ?? "").toLowerCase().replace(/[\s_-]/g, "");

    const map: Record<string, string> = {
      saudacao,
      nome: clienteParaWhatsapp.nome || "",
      cliente: clienteParaWhatsapp.nome || "",
      nomecliente: clienteParaWhatsapp.nome || "",
      plano: planoNome,
      valor: f2(valorPlano),
      valorplano: f2(valorPlano),
      desconto: f2(desconto),
      total: f2(total),
      vencimento: dataVencimento,
      datavencimento: dataVencimento,
      usuario: clienteParaWhatsapp.usuario || clienteParaWhatsapp.email || "",
      senha: clienteParaWhatsapp.senha || "",
    };

    mensagemFinal = mensagemFinal.replace(/\{([^{}]+)\}/g, (full, key) => {
      const k = normalizeKey(key);
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : full;
    });

    return mensagemFinal;
  };

  // Função para confirmar envio de WhatsApp
  const confirmarEnvioWhatsApp = async () => {
    // Validar: deve ter template OU mensagem, não ambos
    const temTemplate = !!whatsappTemplate;
    const temMensagem = !!whatsappMensagem.trim();

    if (temTemplate && temMensagem) {
      toast({
        title: "Erro",
        description: "Escolha apenas template OU digite uma mensagem, não ambos",
        variant: "destructive",
      });
      return;
    }

    if (!temTemplate && !temMensagem) {
      toast({
        title: "Erro",
        description: "Escolha um template ou digite uma mensagem",
        variant: "destructive",
      });
      return;
    }

    if (!clienteParaWhatsapp?.whatsapp) {
      toast({
        title: "Erro",
        description: "Cliente sem número de WhatsApp",
        variant: "destructive",
      });
      return;
    }

    // Determinar mensagem final
    const mensagemFinal = temTemplate 
      ? getMensagemDoTemplate(whatsappTemplate) 
      : whatsappMensagem;

    if (!mensagemFinal.trim()) {
      toast({
        title: "Erro",
        description: "Mensagem vazia",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage(clienteParaWhatsapp.whatsapp, mensagemFinal);
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
      setWhatsappDialogOpen(false);
      setClienteParaWhatsapp(null);
      setWhatsappTemplate("");
      setWhatsappMensagem("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
        variant: "destructive",
      });
    }
  };

  // Função para abrir diálogo de toggle ativo/inativo
  const handleToggleAtivo = async (cliente: Cliente) => {
    if (!cliente || !cliente.id) return;
    
    const isActive = (cliente as any).ativo !== false;
    
    // Se está ativo e vai desativar, pede confirmação
    if (isActive) {
      setClienteParaToggle(cliente);
      setToggleDialogOpen(true);
      return;
    }
    
    // Se está inativo, ativa direto sem confirmação
    await executarToggleCliente(cliente);
  };

  // Função para executar o toggle diretamente
  const executarToggleCliente = async (cliente: Cliente) => {
    if (!cliente?.id) return;
    
    try {
      const novoStatus = !(cliente as any).ativo;
      
      const { error } = await supabase
        .from('clientes')
        .update({ ativo: novoStatus })
        .eq('id', cliente.id);

      if (error) {
        console.error('Erro ao alterar status:', error);
        toast({
          title: "Erro",
          description: "Erro ao alterar status do cliente",
          variant: "destructive",
        });
        return;
      }

      // Atualizar lista local
      setClientes(prev => prev.map(c => 
        c.id === cliente.id 
          ? { ...c, ativo: novoStatus } as any
          : c
      ));

      toast({
        title: "Sucesso",
        description: `Cliente ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`,
      });

    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do cliente",
        variant: "destructive",
      });
    }
  };

  // Função para confirmar toggle ativo/inativo (desativar)
  const confirmarToggleAtivo = async () => {
    if (!clienteParaToggle?.id) return;
    await executarToggleCliente(clienteParaToggle);
    setToggleDialogOpen(false);
    setClienteParaToggle(null);
  };

  // Função para notificar vencimento do cliente
  const handleNotificarVencimento = async (cliente: Cliente) => {
    if (!cliente || !cliente.id) return;
    
    setNotificandoId(cliente.id);

    try {
      // Determinar tipo de notificação com base no status
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let tipoNotificacao = "proximo_vencer";
      if (cliente.data_vencimento) {
        const dataVenc = new Date(cliente.data_vencimento);
        dataVenc.setHours(0, 0, 0, 0);
        
        if (dataVenc < hoje) {
          tipoNotificacao = "vencido";
        } else if (dataVenc.getTime() === hoje.getTime()) {
          tipoNotificacao = "vence_hoje";
        }
      }

      // Buscar mensagem da tabela mensagens_padroes
      const { data: mensagensData } = await supabase
        .from("mensagens_padroes")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      const mensagemKey: Record<string, string> = {
        vencido: "vencido",
        vence_hoje: "vence_hoje",
        proximo_vencer: "proximo_vencer",
      };

      const key = mensagemKey[tipoNotificacao];
      const mensagemTemplate = mensagensData?.[key as keyof typeof mensagensData] as string | null;

      if (!mensagemTemplate) {
        toast({
          title: "Erro",
          description: `Mensagem "${key}" não configurada. Configure em Gerenciar Mensagens.`,
          variant: "destructive",
        });
        setNotificandoId(null);
        return;
      }

      // Processar mensagem com variáveis
      const getSaudacao = () => {
        const hora = new Date().getHours();
        if (hora < 12) return "Bom dia";
        if (hora < 18) return "Boa tarde";
        return "Boa noite";
      };

      const planoNome = cliente.plano ? getPlanoNome(cliente.plano) : "";
      const vencimento = cliente.data_vencimento
        ? new Date(cliente.data_vencimento).toLocaleDateString("pt-BR")
        : "";

      const mensagemProcessada = mensagemTemplate
        .replace(/{nome_cliente}/g, cliente.nome)
        .replace(/{usuario}/g, cliente.usuario || "")
        .replace(/{vencimento}/g, vencimento)
        .replace(/{plano}/g, planoNome)
        .replace(/{saudacao}/g, getSaudacao())
        .replace(/{br}/g, "\n");

      // Obter user_id atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        setNotificandoId(null);
        return;
      }

      // Inserir na fila de mensagens
      const { error } = await supabase.from("whatsapp_messages").insert({
        user_id: user.id,
        phone: cliente.whatsapp,
        message: mensagemProcessada,
        session_id: `user_${user.id}`,
        status: "pending",
        scheduled_for: new Date(Date.now() + 5000).toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Notificação enviada para ${cliente.nome}!`,
      });
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar notificação de vencimento",
        variant: "destructive",
      });
    } finally {
      setNotificandoId(null);
    }
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
      captacao: "",
    },
  });

  // Lista de indicadores únicos para o filtro de captação
  const indicadoresUnicos = useMemo(() => {
    const indicadores = new Set<string>();
    clientes.forEach(cliente => {
      if (cliente.indicador && cliente.indicador.trim() !== '') {
        indicadores.add(cliente.indicador.trim());
      }
    });
    return Array.from(indicadores).sort();
  }, [clientes]);

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
        const isInactive = (cliente as any).ativo === false;

        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);

        const dataVenc = cliente.data_vencimento ? new Date(cliente.data_vencimento) : null;

        switch (filtrosValues.status) {
          case "inativo":
            if (!isInactive) return false;
            break;
          case "ativo":
            if (isInactive) return false;
            if (!dataVenc || dataVenc < inicioHoje) return false;
            break;
          case "vencido":
            if (isInactive) return false;
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

      if (filtrosValues.captacao && filtrosValues.captacao !== "todos") {
        if (cliente.indicador !== filtrosValues.captacao) return false;
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

  // Função para formatar o número de WhatsApp com +55
  const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove tudo que não for número
    let cleaned = phone.replace(/\D/g, '');
    // Se não começar com 55, adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

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

    // Formatar o número de WhatsApp com +55
    const whatsappFormatado = formatWhatsAppNumber(data.whatsapp);
    
    setLoading(true);
    try {
      if (isEditing && editingCliente) {
        const clienteAtualizado = await editar(editingCliente.id, {
          nome: data.nome,
          whatsapp: whatsappFormatado,
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
          whatsapp: whatsappFormatado,
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
        
        // Enviar mensagem de boas-vindas se o cliente tiver WhatsApp
        if (novoCliente.whatsapp) {
          try {
            // Buscar mensagem de boas-vindas
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
              const { data: mensagensPadroes } = await supabase
                .from('mensagens_padroes')
                .select('bem_vindo')
                .eq('user_id', user.user.id)
                .single();
              
              if (mensagensPadroes?.bem_vindo) {
                // Buscar dados do plano para substituição de variáveis
                const plano = planos.find(p => String(p.id) === novoCliente.plano || p.nome === novoCliente.plano);
                const planoNome = plano?.nome || novoCliente.plano || '';
                const valorPlano = plano?.valor || '0,00';
                
                // Gerar saudação baseada no horário
                const hora = new Date().getHours();
                let saudacao = "Bom dia";
                if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
                else if (hora >= 18) saudacao = "Boa noite";

                // Formatar data de vencimento
                let dataVencimento = '';
                if (novoCliente.data_vencimento) {
                  try {
                    dataVencimento = format(new Date(novoCliente.data_vencimento), "dd/MM/yyyy");
                  } catch {
                    dataVencimento = novoCliente.data_vencimento;
                  }
                }
                
                // Substituir variáveis na mensagem
                let mensagemFinal = mensagensPadroes.bem_vindo
                  .replace(/{saudacao}/g, saudacao)
                  .replace(/{nome_cliente}/g, novoCliente.nome || '')
                  .replace(/{nome}/g, novoCliente.nome || '')
                  .replace(/{usuario}/g, novoCliente.usuario || '')
                  .replace(/{senha}/g, novoCliente.senha || '')
                  .replace(/{vencimento}/g, dataVencimento)
                  .replace(/{nome_plano}/g, planoNome)
                  .replace(/{valor_plano}/g, valorPlano)
                  .replace(/{email}/g, novoCliente.email || '')
                  .replace(/{br}/g, '\n');
                
                // Agendar envio para 30 segundos após a criação
                const scheduledTime = new Date();
                scheduledTime.setSeconds(scheduledTime.getSeconds() + 30);
                
                // Adicionar à fila de mensagens com agendamento
                await supabase.from('whatsapp_messages').insert({
                  user_id: user.user.id,
                  phone: novoCliente.whatsapp,
                  message: mensagemFinal,
                  status: 'scheduled',
                  session_id: 'welcome_' + Date.now(),
                  sent_at: new Date().toISOString(),
                  scheduled_for: scheduledTime.toISOString(),
                } as any);
                
                toast({
                  title: "Mensagem de boas-vindas",
                  description: "Mensagem agendada para envio em 30 segundos",
                });
              }
            }
          } catch (welcomeError) {
            console.error("Erro ao enviar mensagem de boas-vindas:", welcomeError);
          }
        }
        
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
          onClick={() => navigate("/clientes/cadastro")}
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
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Data Vencimento Inicial, Data Vencimento Final, Captação */}
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
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">Captação</Label>
            <Select onValueChange={(v) => filtros.setValue("captacao", v)} value={filtros.watch("captacao") || "todos"}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline"
              onClick={() => filtros.reset({
                dataInicial: "",
                dataFinal: "",
                status: "",
                plano: "",
                produto: "",
                search: "",
                captacao: "",
              })}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Badges de Servidores com Contagem - Clicáveis */}
      {produtosContagem.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {produtosContagem.map((produto) => {
            const isActive = filtros.watch("produto") === produto.id;
            return (
              <Badge 
                key={produto.id} 
                variant="outline" 
                className={`px-3 py-1 cursor-pointer transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
                onClick={() => handleFiltrarPorServidor(produto.id)}
              >
                {produto.nome} ({produto.count})
              </Badge>
            );
          })}
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
              <TableHead className="font-medium">Nome do Cliente:</TableHead>
              <TableHead className="font-medium">Usuário:</TableHead>
              <TableHead className="font-medium">Vencimento:</TableHead>
              <TableHead className="font-medium">Status:</TableHead>
              <TableHead className="font-medium">Plano:</TableHead>
              <TableHead className="font-medium">Servidor:</TableHead>
              <TableHead className="font-medium text-right">Ações:</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingClientes ? (
              <TableRow>
               <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">Carregando clientes...</span>
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">Nenhum cliente encontrado</span>
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados
                .filter(cliente => cliente && cliente.id)
                .map((cliente) => {
                  const { status } = getClienteStatus(cliente);
                  const formattedPhone = cliente.whatsapp ? `+${cliente.whatsapp}` : '-';
                  return (
                    <TableRow 
                      key={cliente.id} 
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => handleEditCliente(cliente)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.nome}</span>
                          <div className="flex items-center gap-1">
                            {cliente.whatsapp && (
                              <svg 
                                viewBox="0 0 24 24" 
                                className="h-3.5 w-3.5 text-green-500 fill-current"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            )}
                            <span className="text-xs text-muted-foreground">{formattedPhone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{cliente.usuario || '-'}</span>
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
                          className={status === 'Inativo'
                            ? 'bg-transparent border-amber-500 text-amber-500'
                            : status === 'Vencido' 
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCliente(cliente);
                            }}
                            title="Editar cliente"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenovarPlano(cliente);
                            }}
                            title="Renovar plano"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificarVencimento(cliente);
                            }}
                            disabled={notificandoId === cliente.id}
                            title="Notificar vencimento"
                          >
                            {notificandoId === cliente.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnviarWhatsApp(cliente);
                            }}
                            title="Enviar WhatsApp"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${(cliente as any).ativo === false ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAtivo(cliente);
                            }}
                            title={(cliente as any).ativo === false ? "Ativar cliente" : "Desativar cliente"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCliente(cliente.id!);
                            }}
                            title="Excluir cliente"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
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
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground text-sm">
                    +55
                  </span>
                  <Input 
                    id="whatsapp" 
                    placeholder="83999999999" 
                    className="rounded-l-none"
                    {...form.register("whatsapp")}
                    onChange={(e) => {
                      // Remove tudo que não for número
                      let value = e.target.value.replace(/\D/g, '');
                      // Remove o 55 do início se o usuário digitar
                      if (value.startsWith('55') && value.length > 11) {
                        value = value.substring(2);
                      }
                      form.setValue("whatsapp", value);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Digite apenas DDD + número (ex: 83999999999)</p>
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

      {/* Modal de WhatsApp com templates */}
      <Dialog open={whatsappDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setWhatsappDialogOpen(false);
          setClienteParaWhatsapp(null);
          setWhatsappTemplate("");
          setWhatsappMensagem("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Enviando para: <span className="font-medium text-foreground">{clienteParaWhatsapp?.nome}</span>
            </div>

            <div className="space-y-2">
              <Label>Escolha um template (opcional)</Label>
              <Select 
                value={whatsappTemplate} 
                onValueChange={(value) => {
                  setWhatsappTemplate(value);
                }}
                disabled={!!whatsappMensagem.trim()}
              >
                <SelectTrigger className={whatsappMensagem.trim() ? "opacity-50" : ""}>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {whatsappMensagem.trim() && (
                <p className="text-xs text-muted-foreground">Limpe a mensagem para escolher outro template</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Digite sua mensagem ou selecione um template acima..."
                value={whatsappMensagem}
                onChange={(e) => {
                  setWhatsappMensagem(e.target.value);
                  // Limpar template se digitar mensagem
                  if (e.target.value.trim()) setWhatsappTemplate("");
                }}
                className="min-h-[120px] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setWhatsappDialogOpen(false);
                  setClienteParaWhatsapp(null);
                  setWhatsappTemplate("");
                  setWhatsappMensagem("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarEnvioWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={sendingMessage || (!whatsappTemplate && !whatsappMensagem.trim())}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingMessage ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar ativar/desativar cliente */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(clienteParaToggle as any)?.ativo === false ? "Ativar" : "Desativar"} cliente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Deseja {(clienteParaToggle as any)?.ativo === false ? "ativar" : "desativar"} o cliente "{clienteParaToggle?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-border hover:bg-muted"
              onClick={() => {
                setToggleDialogOpen(false);
                setClienteParaToggle(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarToggleAtivo}
              className={(clienteParaToggle as any)?.ativo === false 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }
            >
              {(clienteParaToggle as any)?.ativo === false ? "Ativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
