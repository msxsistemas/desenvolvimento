import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Home, User, Package, Key, Smartphone, DollarSign, Bell, Users, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useClientes, usePlanos, useProdutos, useAplicativos } from "@/hooks/useDatabase";
import { format } from "date-fns";

export default function ClientesCadastro() {
  const navigate = useNavigate();
  const { criar } = useClientes();
  const { buscar: buscarPlanos } = usePlanos();
  const { buscar: buscarProdutos } = useProdutos();
  const { buscar: buscarAplicativos } = useAplicativos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [planos, setPlanos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [aplicativos, setAplicativos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [acessosAdicionais, setAcessosAdicionais] = useState<Array<{
    usuario: string;
    senha: string;
    mac: string;
    key: string;
    dispositivo: string;
  }>>([]);
  const [aplicativosAdicionais, setAplicativosAdicionais] = useState<Array<{
    app: string;
    dataVencApp: string;
  }>>([]);

  const form = useForm({
    defaultValues: {
      nome: "",
      whatsapp: "",
      aniversario: "",
      produto: "",
      plano: "",
      telas: 1,
      fatura: "Pago",
      dataVenc: "",
      fixo: false,
      usuario: "",
      senha: "",
      mac: "",
      key: "",
      dispositivo: "",
      app: "",
      dataVencApp: "",
      desconto: "0,00",
      descontoRecorrente: false,
      mensagemBoasVindas: "nao_enviar",
      ativarCobrancas: false,
      comoConheceu: "",
      indicador: "",
      observacao: "",
      lembretes: false,
      mensagem: "",
    },
  });

  useEffect(() => {
    document.title = "Adicionar Cliente | Tech Play";
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoadingData(true);
    try {
      const [planosData, produtosData, aplicativosData] = await Promise.all([
        buscarPlanos(),
        buscarProdutos(),
        buscarAplicativos(),
      ]);
      setPlanos(planosData || []);
      setProdutos(produtosData || []);
      setAplicativos(aplicativosData || []);

      // Buscar clientes para lista de indicadores
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome');
      setClientes(clientesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

  const onSubmit = form.handleSubmit(async (data) => {
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

    const whatsappFormatado = formatWhatsAppNumber(data.whatsapp);

    setLoading(true);
    try {
      const novoCliente = await criar({
        nome: data.nome,
        whatsapp: whatsappFormatado,
        email: null,
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

      // Enviar mensagem de boas-vindas se configurado
      if (novoCliente.whatsapp && data.mensagemBoasVindas !== 'nao_enviar') {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user?.id) {
            const { data: mensagensPadroes } = await supabase
              .from('mensagens_padroes')
              .select('bem_vindo')
              .eq('user_id', user.user.id)
              .maybeSingle();

            if (mensagensPadroes?.bem_vindo) {
              const plano = planos.find(p => String(p.id) === novoCliente.plano || p.nome === novoCliente.plano);
              const planoNome = plano?.nome || novoCliente.plano || '';
              const valorPlano = plano?.valor || '0,00';

              const hora = new Date().getHours();
              let saudacao = "Bom dia";
              if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
              else if (hora >= 18) saudacao = "Boa noite";

              let dataVencimento = '';
              if (novoCliente.data_vencimento) {
                try {
                  dataVencimento = format(new Date(novoCliente.data_vencimento), "dd/MM/yyyy");
                } catch {
                  dataVencimento = novoCliente.data_vencimento;
                }
              }

              let mensagemFinal = mensagensPadroes.bem_vindo
                .replace(/{saudacao}/g, saudacao)
                .replace(/{nome_cliente}/g, novoCliente.nome || '')
                .replace(/{nome}/g, novoCliente.nome || '')
                .replace(/{usuario}/g, novoCliente.usuario || '')
                .replace(/{senha}/g, novoCliente.senha || '')
                .replace(/{vencimento}/g, dataVencimento)
                .replace(/{nome_plano}/g, planoNome)
                .replace(/{valor_plano}/g, valorPlano)
                .replace(/{br}/g, '\n');

              const scheduledTime = new Date();
              scheduledTime.setSeconds(scheduledTime.getSeconds() + 30);

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

      toast({
        title: "Sucesso",
        description: "Cliente cadastrado com sucesso!",
      });
      
      navigate("/clientes");
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  });

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom Dia" : hora < 18 ? "Boa Tarde" : "Boa Noite";

  const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{title}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{saudacao}, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Home className="h-4 w-4" />
          <span>/</span>
          <span className="text-[hsl(var(--brand-2))]">Adicionar cliente</span>
        </div>
      </div>

      {/* Card do Formulário */}
      <Card className="bg-card border border-border/30">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Cadastrar Novo Cliente</h2>

          <form onSubmit={onSubmit} className="space-y-3">
            
            {/* Seção: Dados Pessoais */}
            <SectionHeader icon={User} title="Dados Pessoais" color="text-cyan-400" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Nome completo do cliente" 
                  className="bg-background border-border"
                  {...form.register("nome")}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">WhatsApp <span className="text-destructive">*</span></Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                    +55
                  </span>
                  <Input 
                    placeholder="11999999999" 
                    className="bg-background border-border rounded-l-none"
                    {...form.register("whatsapp")}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.startsWith('55')) {
                        value = value.substring(2);
                      }
                      form.setValue("whatsapp", value);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data de Aniversário</Label>
                <Input 
                  type="date"
                  className="bg-background border-border [&::-webkit-calendar-picker-indicator]:hidden"
                  {...form.register("aniversario")}
                />
              </div>
            </div>

            {/* Seção: Plano e Produto */}
            <SectionHeader icon={Package} title="Plano e Produto" color="text-cyan-400" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Produto <span className="text-destructive">*</span></Label>
                <Select 
                  value={form.watch("produto")} 
                  onValueChange={(v) => form.setValue("produto", v)} 
                  disabled={loadingData}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Plano <span className="text-destructive">*</span></Label>
                <Select 
                  value={form.watch("plano")} 
                  onValueChange={(v) => form.setValue("plano", v)} 
                  disabled={loadingData}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantidade de Telas</Label>
                <Input 
                  type="number"
                  min={1}
                  className="bg-background border-border"
                  {...form.register("telas", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status da Fatura</Label>
                <Select 
                  value={form.watch("fatura")} 
                  onValueChange={(v) => form.setValue("fatura", v)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data de Vencimento <span className="text-destructive">*</span></Label>
                <Input 
                  type="date"
                  className="bg-background border-border [&::-webkit-calendar-picker-indicator]:hidden"
                  {...form.register("dataVenc")}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Switch
                  checked={form.watch("fixo")}
                  onCheckedChange={(checked) => form.setValue("fixo", checked)}
                />
                <Label className="text-sm">Vencimento Fixo <span className="text-muted-foreground">(mesmo dia do mês)</span></Label>
              </div>
            </div>

            {/* Seção: Credenciais de Acesso */}
            <SectionHeader icon={Key} title="Credenciais de Acesso" color="text-cyan-400" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Usuário</Label>
                <Input 
                  placeholder="Nome de usuário no painel" 
                  className="bg-background border-border"
                  {...form.register("usuario")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Senha</Label>
                <Input 
                  placeholder="Senha de acesso" 
                  className="bg-background border-border"
                  {...form.register("senha")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">MAC Address / Email</Label>
                <Input 
                  placeholder="Ex: 00:1A:2B:3C:4D:5E ou email@clouddy.com" 
                  className="bg-background border-border"
                  {...form.register("mac")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Key / OTP</Label>
                <Input 
                  placeholder="Chave de ativação ou OTP" 
                  className="bg-background border-border"
                  {...form.register("key")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Dispositivos</Label>
                <Input 
                  placeholder="Ex: Smart TV, TV Box, Celular..." 
                  className="bg-background border-border"
                  {...form.register("dispositivo")}
                />
              </div>
            </div>

            {/* Campos de Aplicativo (sem header) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Aplicativo</Label>
                <Select 
                  value={form.watch("app")} 
                  onValueChange={(v) => form.setValue("app", v)} 
                  disabled={loadingData}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o aplicativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {aplicativos.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Vencimento do App</Label>
                <Input 
                  type="date"
                  className="bg-background border-border [&::-webkit-calendar-picker-indicator]:hidden"
                  {...form.register("dataVencApp")}
                />
              </div>
            </div>

            {/* Campos Financeiro (sem header) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Desconto (R$)</Label>
                <Input 
                  placeholder="R$ 0,00" 
                  className="bg-background border-border"
                  {...form.register("desconto")}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Switch
                  checked={form.watch("descontoRecorrente")}
                  onCheckedChange={(checked) => form.setValue("descontoRecorrente", checked)}
                />
                <Label className="text-sm">Desconto Recorrente</Label>
              </div>
            </div>

            {/* Collapsible: Acessos Adicionais */}
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium">Acessos Adicionais</span>
                  <span className="text-xs text-muted-foreground">(Opcional)</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {acessosAdicionais.map((acesso, index) => (
                  <div key={index} className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Credenciais de Acesso</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setAcessosAdicionais(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Usuário</Label>
                        <Input 
                          placeholder="Nome de usuário no painel" 
                          className="bg-background border-border"
                          value={acesso.usuario}
                          onChange={(e) => {
                            setAcessosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, usuario: e.target.value } : a
                            ));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Senha</Label>
                        <Input 
                          placeholder="Senha de acesso" 
                          className="bg-background border-border"
                          value={acesso.senha}
                          onChange={(e) => {
                            setAcessosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, senha: e.target.value } : a
                            ));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">MAC Address / Email</Label>
                        <Input 
                          placeholder="Ex: 00:1A:2B:3C:4D:5E ou email@clouddy.com" 
                          className="bg-background border-border"
                          value={acesso.mac}
                          onChange={(e) => {
                            setAcessosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, mac: e.target.value } : a
                            ));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Key / OTP</Label>
                        <Input 
                          placeholder="Chave de ativação ou OTP" 
                          className="bg-background border-border"
                          value={acesso.key}
                          onChange={(e) => {
                            setAcessosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, key: e.target.value } : a
                            ));
                          }}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">Dispositivos</Label>
                        <Input 
                          placeholder="Ex: Smart TV, TV Box, Celular..." 
                          className="bg-background border-border"
                          value={acesso.dispositivo}
                          onChange={(e) => {
                            setAcessosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, dispositivo: e.target.value } : a
                            ));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => {
                    setAcessosAdicionais(prev => [...prev, {
                      usuario: "",
                      senha: "",
                      mac: "",
                      key: "",
                      dispositivo: ""
                    }]);
                  }}
                >
                  + Adicionar Acesso
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible: Aplicativos Adicionais */}
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium">Aplicativos Adicionais</span>
                  <span className="text-xs text-muted-foreground">(Opcional)</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {aplicativosAdicionais.map((appItem, index) => (
                  <div key={index} className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Aplicativo {index + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setAplicativosAdicionais(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Aplicativo</Label>
                        <Select 
                          value={appItem.app} 
                          onValueChange={(v) => {
                            setAplicativosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, app: v } : a
                            ));
                          }}
                          disabled={loadingData}
                        >
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Selecione o aplicativo" />
                          </SelectTrigger>
                          <SelectContent>
                            {aplicativos.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Vencimento do App</Label>
                        <Input 
                          type="date"
                          className="bg-background border-border [&::-webkit-calendar-picker-indicator]:hidden"
                          value={appItem.dataVencApp}
                          onChange={(e) => {
                            setAplicativosAdicionais(prev => prev.map((a, i) => 
                              i === index ? { ...a, dataVencApp: e.target.value } : a
                            ));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => {
                    setAplicativosAdicionais(prev => [...prev, {
                      app: "",
                      dataVencApp: ""
                    }]);
                  }}
                >
                  + Adicionar Aplicativo
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Seção: Captação e Observações */}
            <SectionHeader icon={Users} title="Captação e Observações" color="text-purple-400" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Como conheceu?</Label>
                <Select 
                  value={form.watch("comoConheceu")} 
                  onValueChange={(v) => form.setValue("comoConheceu", v)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente Indicador</Label>
                <Select 
                  value={form.watch("indicador")} 
                  onValueChange={(v) => form.setValue("indicador", v)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Observações</Label>
                <Textarea 
                  placeholder="Anotações internas sobre o cliente..." 
                  className="bg-background border-border min-h-[100px]"
                  {...form.register("observacao")}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/clientes")}
                className="border-border"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? "Salvando..." : "Salvar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
