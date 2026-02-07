import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Upload, X, Image, Video, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import { WhatsAppPhonePreview } from "@/components/whatsapp/WhatsAppPhonePreview";

const tiposMensagem = [
  { value: "texto", label: "Apenas Texto", icon: FileText },
  { value: "imagem", label: "Imagem com Texto", icon: Image },
  { value: "video", label: "Vídeo com Texto", icon: Video },
  { value: "documento", label: "Documento", icon: FileText },
];

const destinatariosOptions = [
  { value: "clientes_ativos_servidor", label: "Clientes Ativos por Servidor" },
  { value: "clientes_vencidos_servidor", label: "Clientes Vencidos por Servidor" },
  { value: "clientes_ativos_plano", label: "Clientes Ativos Por Plano" },
  { value: "clientes_ativos", label: "Clientes Ativos" },
  { value: "clientes_inativos", label: "Clientes Inativos" },
  { value: "clientes_vencidos", label: "Clientes Vencidos" },
  { value: "clientes_vencidos_data", label: "Clientes Vencidos Data" },
  { value: "clientes_desativados", label: "Clientes Desativados" },
  { value: "por_tags", label: "Por Tags" },
  { value: "todos", label: "Para Todos" },
];

const getDestinatarioLabel = (value: string) => {
  const found = destinatariosOptions.find(d => d.value === value);
  return found ? `Para ${found.label}` : "";
};

export default function EnviosEmMassa() {
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [destinatarios, setDestinatarios] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviarWebhook, setEnviarWebhook] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useCurrentUser();
  const { isConnected } = useEvolutionAPI();

  useEffect(() => {
    document.title = "Envios em Massa | Tech Play";
  }, []);

  const availableKeys = [
    "{area_cliente}", "{credito}", "{dados_servidor}", "{desconto}", "{indicacao}", "{link_fatura}",
    "{nome_cliente}", "{nome_plano}", "{nome_servidor}", "{numero_fatura}", "{obs}", "{pix}",
    "{saudacao}", "{senha}", "{sobrenome}", "{subtotal}", "{usuario}", "{valor_plano}", 
    "{vencimento}", "{info1}", "{info2}", "{info3}"
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type based on message type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isDocument = !isImage && !isVideo;

    if (tipoMensagem === 'imagem' && !isImage) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }
    if (tipoMensagem === 'video' && !isVideo) {
      toast.error("Por favor, selecione um vídeo");
      return;
    }

    // Check file size (max 16MB for WhatsApp)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 16MB");
      return;
    }

    setMediaFile(file);

    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (isVideo) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAcceptTypes = () => {
    switch (tipoMensagem) {
      case 'imagem':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'documento':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      default:
        return '';
    }
  };

  const handleEnviar = async () => {
    if (!tipoMensagem || !destinatarios || !mensagem) {
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

    setSending(true);
    try {
      let mediaUrl = null;

      // Upload media if present
      if (mediaFile) {
        setUploading(true);
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.error("Erro no upload:", uploadError);
          // Continue without media if bucket doesn't exist
          if (!uploadError.message.includes('bucket')) {
            throw uploadError;
          }
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(fileName);
          mediaUrl = publicUrl;
        }
        setUploading(false);
      }

      // Buscar clientes baseado no filtro
      let query = supabase.from("clientes").select("*").eq("user_id", user.id);

      // Aplicar filtros
      const today = new Date().toISOString().split('T')[0];
      
      switch (destinatarios) {
        case "clientes_ativos":
          query = query.gte("data_vencimento", today);
          break;
        case "clientes_vencidos":
        case "clientes_vencidos_servidor":
        case "clientes_vencidos_data":
          query = query.lt("data_vencimento", today);
          break;
        case "clientes_inativos":
          query = query.is("data_vencimento", null);
          break;
        case "clientes_desativados":
          query = query.eq("fixo", false);
          break;
        case "clientes_ativos_servidor":
        case "clientes_ativos_plano":
          query = query.gte("data_vencimento", today);
          break;
        case "todos":
          // No filter, get all
          break;
      }

      const { data: clientes, error } = await query;

      if (error) throw error;

      if (!clientes || clientes.length === 0) {
        toast.warning("Nenhum cliente encontrado para este filtro");
        setSending(false);
        return;
      }

      // Adicionar mensagens à fila
      const mensagensParaEnviar = clientes.map(cliente => ({
        user_id: user.id,
        phone: cliente.whatsapp,
        message: mensagem
          .replace(/{nome_cliente}/g, cliente.nome || '')
          .replace(/{usuario}/g, cliente.usuario || '')
          .replace(/{senha}/g, cliente.senha || '')
          .replace(/{vencimento}/g, cliente.data_vencimento || '')
          .replace(/{nome_plano}/g, cliente.plano || '')
          .replace(/{valor_plano}/g, '')
          .replace(/{email}/g, cliente.email || '')
          .replace(/{observacao}/g, cliente.observacao || '')
          .replace(/{br}/g, '\n'),
        status: enviarWebhook ? 'webhook' : 'pending',
        session_id: 'bulk_' + Date.now(),
        sent_at: new Date().toISOString(),
        media_url: mediaUrl,
        media_type: tipoMensagem !== 'texto' ? tipoMensagem : null,
      }));

      const { error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(mensagensParaEnviar);

      if (insertError) throw insertError;

      toast.success(`${clientes.length} mensagens adicionadas à fila de envio!`);
      setMensagem("");
      removeMedia();
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao adicionar mensagens à fila");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const showMediaUpload = tipoMensagem && tipoMensagem !== 'texto';

  return (
    <div className="space-y-4">
      {/* Main Content */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1">Envios De Mensagens Em Massa</h2>
          <p className="text-muted-foreground text-sm mb-6">Faça envio de mensagens para os seus clientes!</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Form Section */}
            <div className="space-y-5">
              {/* Message Type */}
              <div className="space-y-2">
                <Label className="text-foreground">Escolha o tipo de mensagem que deseja enviar!</Label>
                <Select value={tipoMensagem} onValueChange={(value) => {
                  setTipoMensagem(value);
                  removeMedia(); // Clear media when type changes
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Clique aqui para escolher" />
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
              </div>

              {/* Media Upload - Show when type is not "texto" */}
              {showMediaUpload && (
                <div className="space-y-2">
                  <Label className="text-foreground">
                    {tipoMensagem === 'imagem' && 'Selecione uma imagem'}
                    {tipoMensagem === 'video' && 'Selecione um vídeo'}
                    {tipoMensagem === 'documento' && 'Selecione um documento'}
                  </Label>
                  
                  {!mediaFile ? (
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo: 16MB
                      </p>
                    </div>
                  ) : (
                    <div className="relative bg-secondary rounded-lg p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeMedia}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      
                      {tipoMensagem === 'imagem' && mediaPreview && (
                        <img 
                          src={mediaPreview} 
                          alt="Preview" 
                          className="max-h-32 mx-auto rounded"
                        />
                      )}
                      
                      {tipoMensagem === 'video' && mediaPreview && (
                        <video 
                          src={mediaPreview} 
                          className="max-h-32 mx-auto rounded"
                          controls
                        />
                      )}
                      
                      {tipoMensagem === 'documento' && (
                        <div className="flex items-center gap-2 justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-foreground">{mediaFile.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={getAcceptTypes()}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Recipients */}
              <div className="space-y-2">
                <Label className="text-foreground">Para quem deseja enviar a mensagem?</Label>
                <Select value={destinatarios} onValueChange={setDestinatarios}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Clique aqui para selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinatariosOptions.map((dest) => (
                      <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo Badge */}
              {destinatarios && (
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo</Label>
                  <div className="bg-[hsl(var(--brand-2))] text-white px-4 py-2 rounded-md text-sm font-medium">
                    {getDestinatarioLabel(destinatarios)}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Mensagem</Label>
                <p className="text-sm text-muted-foreground">Utilize as seguintes chaves para obter os valores:</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {availableKeys.map((key) => (
                    <span 
                      key={key} 
                      className="text-[hsl(var(--brand))] text-xs cursor-pointer hover:underline"
                      onClick={() => setMensagem(prev => prev + key)}
                    >
                      {key}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Utilize <span className="text-[hsl(var(--brand))]">{"{nome_cliente_indicado}"}</span> <span className="text-[hsl(var(--brand))]">{"{valor_indicacao}"}</span> somente na mensagem de indicação.
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Utilize <span className="text-[hsl(var(--brand))]">{"{br}"}</span> para quebra de linha.
                </p>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="bg-secondary border-border text-foreground min-h-[180px]"
                  placeholder="Digite sua mensagem aqui..."
                />
              </div>

              {/* Webhook Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-foreground">Enviar apenas por Webhook:</Label>
                  <Switch
                    checked={enviarWebhook}
                    onCheckedChange={setEnviarWebhook}
                  />
                </div>
                <p className="text-[hsl(var(--brand-2))] text-sm">
                  Caso ative essa opção as mensagens em massa não serão enviadas para a fila do whatsapp
                </p>
              </div>

              {/* Send Button */}
              <Button 
                onClick={handleEnviar}
                disabled={sending || uploading || !tipoMensagem || !destinatarios || !mensagem || (showMediaUpload && !mediaFile)}
                className="bg-[hsl(300,70%,40%)] hover:bg-[hsl(300,70%,35%)] text-white rounded-full px-6"
              >
                {sending || uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploading ? 'Enviando mídia...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Adicionar Mensagem
                  </>
                )}
              </Button>
            </div>

            {/* WhatsApp Preview */}
            <WhatsAppPhonePreview 
              message={mensagem}
              templateLabel={destinatarios ? getDestinatarioLabel(destinatarios) : undefined}
              mediaPreview={mediaPreview}
              mediaType={tipoMensagem as 'imagem' | 'video' | 'documento' | undefined}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
