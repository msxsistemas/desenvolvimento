import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home } from "lucide-react";
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
  const [tipoNumero, setTipoNumero] = useState("whatsapp");

  const form = useForm({
    defaultValues: {
      nome: "",
      sobrenome: "",
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
    const nomeCompleto = data.sobrenome ? `${data.nome} ${data.sobrenome}` : data.nome;

    setLoading(true);
    try {
      const novoCliente = await criar({
        nome: nomeCompleto,
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

      // Enviar mensagem de boas-vindas se o cliente tiver WhatsApp
      if (novoCliente.whatsapp) {
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
                .replace(/{email}/g, novoCliente.email || '')
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
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">Cadastrar Novo Cliente</h2>
          <p className="text-sm text-muted-foreground mb-6">Cadastre seu cliente agora mesmo!</p>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Servidor */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Servidor</Label>
              <Select 
                value={form.watch("produto")} 
                onValueChange={(v) => form.setValue("produto", v)} 
                disabled={loadingData}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o servidor" />
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

            {/* Nome */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome</Label>
              <Input 
                placeholder="Nome do seu cliente" 
                className="bg-background border-border"
                {...form.register("nome")}
              />
            </div>

            {/* Sobrenome */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sobrenome</Label>
              <Input 
                placeholder="Sobrenome do seu cliente" 
                className="bg-background border-border"
                {...form.register("sobrenome")}
              />
            </div>

            {/* Tipo de número */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Qual tipo de numero deseja cadastrar?</Label>
              <Select value={tipoNumero} onValueChange={setTipoNumero}>
                <SelectTrigger className="w-48 h-8 bg-[hsl(200,70%,50%)] text-white border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">WhatsApp</Label>
              <Input 
                placeholder="(00) 00000-0000" 
                className="bg-background border-border"
                {...form.register("whatsapp")}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.startsWith('55') && value.length > 11) {
                    value = value.substring(2);
                  }
                  form.setValue("whatsapp", value);
                }}
              />
            </div>

            {/* Usuário */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Usuario</Label>
              <Input 
                placeholder="Username do cliente" 
                className="bg-background border-border"
                {...form.register("usuario")}
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Senha</Label>
              <Input 
                placeholder="Senha do cliente" 
                className="bg-background border-border"
                type="password"
                {...form.register("senha")}
              />
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de vencimento:</Label>
              <Input 
                type="date"
                placeholder="dd/mm/aaaa"
                className="bg-background border-border"
                {...form.register("dataVenc")}
              />
            </div>

            {/* Plano */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Plano</Label>
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

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email (opcional)</Label>
              <Input 
                type="email"
                placeholder="email@exemplo.com" 
                className="bg-background border-border"
                {...form.register("email")}
              />
            </div>

            {/* Aplicativo */}
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

            {/* Data vencimento app */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data vencimento app</Label>
              <Input 
                type="date"
                className="bg-background border-border"
                {...form.register("dataVencApp")}
              />
            </div>

            {/* Telas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Telas</Label>
              <Input 
                type="number"
                min={1}
                className="bg-background border-border"
                {...form.register("telas", { valueAsNumber: true })}
              />
            </div>

            {/* Mac */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mac</Label>
              <Input 
                placeholder="Mac opcional" 
                className="bg-background border-border"
                {...form.register("mac")}
              />
            </div>

            {/* Dispositivo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dispositivo</Label>
              <Input 
                placeholder="Dispositivo opcional" 
                className="bg-background border-border"
                {...form.register("dispositivo")}
              />
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observação</Label>
              <Textarea 
                placeholder="Observação opcional" 
                className="bg-background border-border"
                {...form.register("observacao")}
              />
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
                {loading ? "Salvando..." : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
