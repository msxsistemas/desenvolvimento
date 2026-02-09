import { useState, useEffect, useRef } from "react";
import { availableVariableKeys } from "@/utils/message-variables";
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
import { Send, Loader2, Upload, X, Image, Video, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import { WhatsAppPhonePreview } from "@/components/whatsapp/WhatsAppPhonePreview";

const tiposMensagem = [
  { value: "texto", label: "Apenas Texto", icon: FileText },
  { value: "imagem", label: "Imagem com Texto", icon: Image },
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

  const availableKeys = availableVariableKeys;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (tipoMensagem === 'imagem' && !isImage) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }
    if (tipoMensagem === 'video' && !isVideo) {
      toast.error("Por favor, selecione um vídeo");
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 16MB");
      return;
    }

    setMediaFile(file);

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

      if (mediaFile) {
        setUploading(true);
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.error("Erro no upload:", uploadError);
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

      let query = supabase.from("clientes").select("*").eq("user_id", user.id);

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
          break;
      }

      const { data: clientes, error } = await query;

      if (error) throw error;

      if (!clientes || clientes.length === 0) {
        toast.warning("Nenhum cliente encontrado para este filtro");
        setSending(false);
        return;
      }

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
        status: 'pending',
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
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Envios em Massa</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens para múltiplos clientes</p>
        </div>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form Section */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Message Type */}
          <div className="space-y-2">
            <Label className="text-foreground">Tipo de mensagem</Label>
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
          </div>

          {/* Media Upload */}
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
                  <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Máximo: 16MB</p>
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
                    <img src={mediaPreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                  )}
                  
                  {tipoMensagem === 'video' && mediaPreview && (
                    <video src={mediaPreview} className="max-h-32 mx-auto rounded" controls />
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
            <Label className="text-foreground">Destinatários</Label>
            <Select value={destinatarios} onValueChange={setDestinatarios}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione os destinatários" />
              </SelectTrigger>
              <SelectContent>
                {destinatariosOptions.map((dest) => (
                  <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-foreground">Mensagem</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {availableKeys.map((key) => (
                <span 
                  key={key} 
                  className="text-primary text-xs bg-primary/10 px-2 py-1 rounded cursor-pointer hover:bg-primary/20"
                  onClick={() => setMensagem(prev => prev + key)}
                >
                  {key}
                </span>
              ))}
            </div>
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
            disabled={sending || uploading || !tipoMensagem || !destinatarios || !mensagem || (showMediaUpload && !mediaFile)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {sending || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? 'Enviando mídia...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Adicionar à Fila
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
            mediaType={tipoMensagem as 'imagem' | 'video' | 'documento' | undefined}
          />
        </div>
      </div>
    </main>
  );
}
