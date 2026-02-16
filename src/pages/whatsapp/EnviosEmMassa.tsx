import { useState, useEffect, useRef } from "react";
import { availableVariableKeys, replaceMessageVariables, getSaudacao } from "@/utils/message-variables";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Progress } from "@/components/ui/progress";
import { Send, Loader2, Upload, X, Image, FileText, MessageSquare, Users, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { WhatsAppPhonePreview } from "@/components/whatsapp/WhatsAppPhonePreview";

const tiposMensagem = [
  { value: "texto", label: "Apenas Texto", icon: FileText },
  { value: "imagem", label: "Imagem com Texto", icon: Image },
];

const destinatariosOptions = [
  { value: "clientes_ativos_plano", label: "Clientes Ativos Por Plano" },
  { value: "clientes_ativos", label: "Clientes Ativos" },
  { value: "clientes_ativos_servidor", label: "Clientes Ativos por Servidor" },
  { value: "clientes_vencidos_servidor", label: "Clientes Vencidos por Servidor" },
  { value: "clientes_inativos", label: "Clientes Inativos" },
  { value: "clientes_vencidos", label: "Clientes Vencidos" },
  
  { value: "todos", label: "Para Todos" },
];

const getDestinatarioLabel = (value: string) => {
  const found = destinatariosOptions.find(d => d.value === value);
  return found ? `Para ${found.label}` : "";
};

export default function EnviosEmMassa() {
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [destinatarios, setDestinatarios] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0, failed: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [planos, setPlanos] = useState<{ nome: string }[]>([]);
  const [servidores, setServidores] = useState<{ id: string; nome: string }[]>([]);
  const [filtroServidor, setFiltroServidor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroTag, setFiltroTag] = useState("");
  const [clienteCount, setClienteCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useCurrentUser();
  const { isConnected, sendMessage } = useEvolutionAPISimple();

  useEffect(() => {
    document.title = "Envios em Massa | Tech Play";
  }, []);

  // Fetch planos and servidores for filters
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("planos").select("nome").eq("user_id", user.id).then(({ data }) => {
      if (data) setPlanos(data);
    });
    supabase.from("paineis_integracao").select("id, nome").eq("user_id", user.id).then(({ data }) => {
      if (data) setServidores(data);
    });
  }, [user?.id]);

  // Count clients matching current filter
  useEffect(() => {
    if (!user?.id || !destinatarios) {
      setClienteCount(null);
      return;
    }
    const fetchCount = async () => {
      let query = supabase.from("clientes").select("id", { count: 'exact', head: true }).eq("user_id", user.id);
      const today = new Date().toISOString().split('T')[0];
      switch (destinatarios) {
        case "clientes_ativos":
          query = query.eq("ativo", true).gte("data_vencimento", today);
          break;
        case "clientes_ativos_plano":
          query = query.eq("ativo", true).gte("data_vencimento", today).not("plano", "is", null);
          if (filtroPlano) query = query.eq("plano", filtroPlano);
          break;
        case "clientes_ativos_servidor":
          query = query.eq("ativo", true).gte("data_vencimento", today);
          if (filtroServidor) query = query.eq("produto", filtroServidor);
          break;
        case "clientes_vencidos_servidor":
          query = query.lt("data_vencimento", today);
          if (filtroServidor) query = query.eq("produto", filtroServidor);
          break;
        case "clientes_vencidos":
          query = query.lt("data_vencimento", today);
          break;
        case "clientes_vencidos_data":
          query = query.lt("data_vencimento", today);
          if (filtroDataInicio) query = query.gte("data_vencimento", filtroDataInicio);
          if (filtroDataFim) query = query.lte("data_vencimento", filtroDataFim);
          break;
        case "clientes_inativos":
          query = query.eq("ativo", false);
          break;
        case "clientes_desativados":
          query = query.eq("ativo", false);
          break;
        case "por_tags":
          if (filtroTag) {
            const sanitized = filtroTag.replace(/[%_\\]/g, '\\$&').slice(0, 100);
            query = query.ilike("observacao", `%${sanitized}%`);
          }
          break;
        case "todos":
          break;
      }
      const { count } = await query;
      setClienteCount(count ?? 0);
    };
    fetchCount();
  }, [user?.id, destinatarios, filtroPlano, filtroServidor, filtroDataInicio, filtroDataFim, filtroTag]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 16MB");
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Buscar valor do plano pelo nome
  const fetchValorPlano = async (planoNome: string): Promise<string> => {
    if (!planoNome || !user?.id) return "";
    try {
      const { data } = await supabase
        .from("planos")
        .select("valor")
        .eq("user_id", user.id)
        .eq("nome", planoNome)
        .maybeSingle();
      return data?.valor || "";
    } catch {
      return "";
    }
  };

  // Buscar chave PIX do usuário
  const fetchPixKey = async (): Promise<string> => {
    if (!user?.id) return "";
    try {
      const { data } = await supabase
        .from("templates_cobranca")
        .select("chave_pix")
        .eq("user_id", user.id)
        .eq("incluir_chave_pix", true)
        .limit(1)
        .maybeSingle();
      return data?.chave_pix || "";
    } catch {
      return "";
    }
  };

  const handleEnviar = async () => {
    if (!tipoMensagem || !destinatarios || !mensagem.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (tipoMensagem !== 'texto' && !mediaFile) {
      toast.error("Selecione um arquivo de mídia");
      return;
    }

    if (!user?.id) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!isConnected) {
      toast.error("WhatsApp não está conectado. Vá em Parear WhatsApp para conectar.");
      return;
    }

    setSending(true);
    setShowProgress(true);
    setProgress({ total: 0, sent: 0, failed: 0 });

    try {
      // Build client query
      let query = supabase.from("clientes").select("*").eq("user_id", user.id);
      const today = new Date().toISOString().split('T')[0];

      switch (destinatarios) {
        case "clientes_ativos":
          query = query.eq("ativo", true).gte("data_vencimento", today);
          break;
        case "clientes_ativos_plano":
          query = query.eq("ativo", true).gte("data_vencimento", today).not("plano", "is", null);
          if (filtroPlano) query = query.eq("plano", filtroPlano);
          break;
        case "clientes_ativos_servidor":
          query = query.eq("ativo", true).gte("data_vencimento", today);
          if (filtroServidor) query = query.eq("produto", filtroServidor);
          break;
        case "clientes_vencidos_servidor":
          query = query.lt("data_vencimento", today);
          if (filtroServidor) query = query.eq("produto", filtroServidor);
          break;
        case "clientes_vencidos":
          query = query.lt("data_vencimento", today);
          break;
        case "clientes_vencidos_data":
          query = query.lt("data_vencimento", today);
          if (filtroDataInicio) query = query.gte("data_vencimento", filtroDataInicio);
          if (filtroDataFim) query = query.lte("data_vencimento", filtroDataFim);
          break;
        case "clientes_inativos":
          query = query.eq("ativo", false);
          break;
        case "clientes_desativados":
          query = query.eq("ativo", false);
          break;
        case "por_tags":
          if (filtroTag) {
            const sanitized = filtroTag.replace(/[%_\\]/g, '\\$&').slice(0, 100);
            query = query.ilike("observacao", `%${sanitized}%`);
          }
          break;
        case "todos":
          break;
      }

      const { data: clientes, error } = await query;

      if (error) throw error;

      if (!clientes || clientes.length === 0) {
        toast.warning("Nenhum cliente encontrado para este filtro");
        setSending(false);
        setShowProgress(false);
        return;
      }

      // Filter clients with valid WhatsApp numbers
      const clientesComWhatsapp = clientes.filter(c => c.whatsapp && c.whatsapp.trim() !== '');

      if (clientesComWhatsapp.length === 0) {
        toast.warning("Nenhum cliente com WhatsApp válido encontrado");
        setSending(false);
        setShowProgress(false);
        return;
      }

      setProgress({ total: clientesComWhatsapp.length, sent: 0, failed: 0 });

      // Fetch PIX key once
      const pixKey = await fetchPixKey();

      // Send messages one by one with delay to avoid rate limiting
      let sentCount = 0;
      let failedCount = 0;

      for (const cliente of clientesComWhatsapp) {
        try {
          // Get plan value for this client
          const valorPlano = cliente.plano ? await fetchValorPlano(cliente.plano) : "";

          // Replace variables using the shared utility
          const mensagemProcessada = replaceMessageVariables(mensagem, {
            nome: cliente.nome,
            whatsapp: cliente.whatsapp,
            email: cliente.email || undefined,
            usuario: cliente.usuario || undefined,
            senha: cliente.senha || undefined,
            data_vencimento: cliente.data_vencimento || undefined,
            plano: cliente.plano || undefined,
            produto: cliente.produto || undefined,
            desconto: cliente.desconto || undefined,
            observacao: cliente.observacao || undefined,
            app: cliente.app || undefined,
            dispositivo: cliente.dispositivo || undefined,
            telas: cliente.telas || undefined,
            mac: cliente.mac || undefined,
          }, {
            pix: pixKey,
            valor_plano: valorPlano ? `R$ ${valorPlano}` : "",
          });

          // Normalize phone number
          let phone = cliente.whatsapp.replace(/\D/g, '');
          if (!phone.startsWith('55') && phone.length >= 10) {
            phone = '55' + phone;
          }

          // Send via Evolution API
          await sendMessage(phone, mensagemProcessada);

          // Log to whatsapp_messages table
          await supabase.from("whatsapp_messages").insert({
            user_id: user.id,
            phone: cliente.whatsapp,
            message: mensagemProcessada,
            status: 'sent',
            session_id: 'bulk_' + Date.now(),
            sent_at: new Date().toISOString(),
          });

          sentCount++;
          setProgress(prev => ({ ...prev, sent: sentCount }));

          // Delay between messages (1.5s) to avoid rate limiting
          if (sentCount < clientesComWhatsapp.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (err) {
          console.error(`Erro ao enviar para ${cliente.nome}:`, err);
          failedCount++;
          setProgress(prev => ({ ...prev, failed: failedCount }));

          // Log failed message
          await supabase.from("whatsapp_messages").insert({
            user_id: user.id,
            phone: cliente.whatsapp,
            message: mensagem,
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Erro desconhecido',
            session_id: 'bulk_' + Date.now(),
            sent_at: new Date().toISOString(),
          });
        }
      }

      if (sentCount > 0) {
        toast.success(`${sentCount} mensagens enviadas com sucesso!${failedCount > 0 ? ` (${failedCount} falharam)` : ''}`);
      } else {
        toast.error("Nenhuma mensagem foi enviada");
      }

      setMensagem("");
      removeMedia();
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao processar envio em massa");
    } finally {
      setSending(false);
    }
  };

  const showMediaUpload = tipoMensagem && tipoMensagem !== 'texto';
  const progressPercent = progress.total > 0 ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0;

  const showFilter = ['clientes_ativos_plano', 'clientes_ativos_servidor', 'clientes_vencidos_servidor', 'clientes_vencidos_data', 'por_tags'].includes(destinatarios);

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Envios De Mensagens Em Massa</h1>
          <p className="text-sm text-muted-foreground">Faça envio de mensagens para os seus clientes!</p>
        </div>
      </header>

      {/* Progress */}
      {showProgress && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Progresso do envio</span>
            <span className="text-muted-foreground">
              {progress.sent + progress.failed} / {progress.total}
              {progress.failed > 0 && <span className="text-destructive ml-2">({progress.failed} falhas)</span>}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {!sending && progress.total > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowProgress(false)} className="text-xs text-muted-foreground">
              Fechar
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form Section */}
        <div className="space-y-4">
          {/* TIPO DE MENSAGEM */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Tipo de Mensagem</Label>
            </div>
            <Select value={tipoMensagem} onValueChange={(value) => {
              setTipoMensagem(value);
              removeMedia();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposMensagem.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div className="flex items-center gap-2">
                      <tipo.icon className="h-4 w-4" />
                      {tipo.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Media Upload */}
            {showMediaUpload && (
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Selecione uma imagem</Label>
                {!mediaFile ? (
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">Máximo: 16MB</p>
                  </div>
                ) : (
                  <div className="relative bg-secondary rounded-lg p-4">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={removeMedia}>
                      <X className="h-4 w-4" />
                    </Button>
                    {mediaPreview && (
                      <img src={mediaPreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                    )}
                  </div>
                )}
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>
            )}
          </div>

          {/* PÚBLICO ALVO */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Público Alvo</Label>
            </div>
            <Select value={destinatarios} onValueChange={(val) => {
              setDestinatarios(val);
              setFiltroPlano("");
              setFiltroServidor("");
              setFiltroDataInicio("");
              setFiltroDataFim("");
              setFiltroTag("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione os destinatários" />
              </SelectTrigger>
              <SelectContent>
                {destinatariosOptions.map((dest) => (
                  <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Client count indicator */}
            {destinatarios && clienteCount !== null && clienteCount === 0 && (
              <div className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive border border-destructive/30 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4" />
                Nenhum cliente encontrado
              </div>
            )}
            {destinatarios && clienteCount !== null && clienteCount > 0 && (
              <p className="text-xs text-muted-foreground">{clienteCount} cliente(s) encontrado(s)</p>
            )}
          </div>

          {/* FILTROS */}
          {showFilter && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Filtros</Label>
              </div>

              {/* Filtro por Plano */}
              {destinatarios === 'clientes_ativos_plano' && (
                <Select value={filtroPlano} onValueChange={setFiltroPlano}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Filtro por Servidor */}
              {(destinatarios === 'clientes_ativos_servidor' || destinatarios === 'clientes_vencidos_servidor') && (
                <Select value={filtroServidor} onValueChange={setFiltroServidor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {servidores.map((s) => (
                      <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Filtro por Data */}
              {destinatarios === 'clientes_vencidos_data' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Início</Label>
                    <Input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Fim</Label>
                    <Input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Filtro por Tags */}
              {destinatarios === 'por_tags' && (
                <Input
                  placeholder="Digite a tag para filtrar..."
                  value={filtroTag}
                  onChange={(e) => setFiltroTag(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Message */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Label className="text-foreground">Mensagem</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {availableVariableKeys.map((key) => (
                <span 
                  key={key} 
                  className="text-primary text-xs bg-primary/10 px-2 py-1 rounded cursor-pointer hover:bg-primary/20"
                  onClick={() => setMensagem(prev => prev + key)}
                >
                  {key}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Use <span className="text-primary">{"{br}"}</span> para quebra de linha.
            </p>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[180px]"
              placeholder="Digite sua mensagem aqui..."
            />
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleEnviar}
            disabled={sending || uploading || !tipoMensagem || !destinatarios || !mensagem.trim() || !isConnected || (showMediaUpload && !mediaFile)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {sending || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? 'Enviando mídia...' : `Enviando... (${progress.sent}/${progress.total})`}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagens
              </>
            )}
          </Button>
        </div>

        {/* WhatsApp Preview */}
        <div className="lg:sticky lg:top-4">
          <WhatsAppPhonePreview 
            message={mensagem}
            templateLabel={destinatarios ? getDestinatarioLabel(destinatarios) : undefined}
            mediaPreview={mediaPreview}
            mediaType={tipoMensagem === 'imagem' ? 'imagem' : undefined}
          />
        </div>
      </div>
    </main>
  );
}
