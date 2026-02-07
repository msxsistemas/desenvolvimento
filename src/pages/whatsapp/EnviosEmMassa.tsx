import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home, Video, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";

const tiposMensagem = [
  { value: "texto", label: "Apenas Texto" },
  { value: "imagem", label: "Imagem com Texto" },
  { value: "video", label: "Vídeo com Texto" },
  { value: "documento", label: "Documento" },
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
  const { user } = useCurrentUser();
  const { sendMessage, isConnected } = useEvolutionAPI();

  useEffect(() => {
    document.title = "Envios em Massa | Tech Play";
  }, []);

  const availableKeys = [
    "{area_cliente}", "{credito}", "{dados_servidor}", "{desconto}", "{indicacao}", "{link_fatura}",
    "{nome_cliente}", "{nome_plano}", "{nome_servidor}", "{numero_fatura}", "{obs}", "{pix}",
    "{saudacao}", "{senha}", "{sobrenome}", "{subtotal}", "{usuario}", "{valor_plano}", 
    "{vencimento}", "{info1}", "{info2}", "{info3}"
  ];

  const handleEnviar = async () => {
    if (!tipoMensagem || !destinatarios || !mensagem) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!user?.id) {
      toast.error("Você precisa estar logado");
      return;
    }

    setSending(true);
    try {
      // Buscar clientes baseado no filtro
      let query = supabase.from("clientes").select("*").eq("user_id", user.id);

      // Aplicar filtros
      const today = new Date().toISOString().split('T')[0];
      
      switch (destinatarios) {
        case "clientes_ativos":
          query = query.gte("data_vencimento", today);
          break;
        case "clientes_vencidos":
          query = query.lt("data_vencimento", today);
          break;
        case "clientes_inativos":
          query = query.is("data_vencimento", null);
          break;
        // Add more filters as needed
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
          .replace(/{br}/g, '\n'),
        status: enviarWebhook ? 'webhook' : 'pending',
        session_id: 'bulk_' + Date.now(),
        sent_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(mensagensParaEnviar);

      if (insertError) throw insertError;

      toast.success(`${clientes.length} mensagens adicionadas à fila de envio!`);
      setMensagem("");
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao adicionar mensagens à fila");
    } finally {
      setSending(false);
    }
  };

  // Render preview with formatting
  const renderPreview = () => {
    const sampleData: Record<string, string> = {
      "{saudacao}": "Bom dia",
      "{nome_cliente}": "Fulano",
      "{vencimento}": "10/10/2025",
      "{nome_plano}": "Plano Completo: R$ 40,00",
      "{desconto}": "R$ 5,00",
      "{subtotal}": "R$ 35,00",
      "{link_fatura}": "https://gestorv3.com.br/fatura",
      "{area_cliente}": "https://gestorv3.com.br/central",
      "{usuario}": "usuario123",
      "{senha}": "****",
      "{pix}": "pix@techplay.com",
      "{valor_plano}": "R$ 40,00",
    };

    let preview = mensagem || "Digite sua mensagem...";
    
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    preview = preview.replace(/{br}/g, '\n');
    
    return preview;
  };

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
                <Select value={tipoMensagem} onValueChange={setTipoMensagem}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Clique aqui para escolher" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposMensagem.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    <span key={key} className="text-[hsl(var(--brand))] text-xs">{key}</span>
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
                disabled={sending || !tipoMensagem || !destinatarios || !mensagem}
                className="bg-[hsl(300,70%,40%)] hover:bg-[hsl(300,70%,35%)] text-white rounded-full px-6"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
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
            <div className="flex justify-center lg:sticky lg:top-6 self-start h-fit">
              <div className="w-[320px] bg-[#111b21] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#2a3942]">
                {/* Phone Notch */}
                <div className="bg-black h-7 flex items-center justify-center">
                  <div className="w-24 h-5 bg-black rounded-b-2xl"></div>
                </div>
                
                {/* Phone Status Bar */}
                <div className="bg-[#1f2c34] px-5 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[11px] font-semibold">TIM</span>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 17h2v4H2v-4zm4-5h2v9H6v-9zm4-4h2v13h-2V8zm4-4h2v17h-2V4zm4-2h2v19h-2V2z"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">20:00</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.95 3 3 5.95 3 9c0 2.13 1.5 4 3.68 5.03L5 21l4.22-2.63C10.13 18.45 11.05 18.5 12 18.5c5.05 0 9-2.45 9-5.5S17.05 3 12 3z"/>
                    </svg>
                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="4" y="8" width="14" height="8" rx="1" fill="currentColor"/>
                      <rect x="20" y="9" width="2" height="6" rx="1" fill="currentColor"/>
                    </svg>
                    <span className="text-white text-[11px] font-semibold">22%</span>
                  </div>
                </div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8696a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-[15px]">GESTORv3</p>
                    <p className="text-[#8696a0] text-xs">online</p>
                  </div>
                  <div className="flex items-center gap-5 text-[#8696a0]">
                    <Video className="w-5 h-5" />
                    <Phone className="w-5 h-5" />
                  </div>
                </div>

                {/* Chat Area */}
                <div 
                  className="h-[350px] bg-[#0b141a] p-4 overflow-y-auto" 
                  style={{ 
                    backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23182229\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" 
                  }}
                >
                  {mensagem ? (
                    <div className="bg-[#005c4b] rounded-lg p-3 max-w-[90%] ml-auto shadow-lg relative">
                      <div className="absolute -right-1 top-0 w-3 h-3 bg-[#005c4b]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                      <p className="text-white text-[13px] whitespace-pre-wrap leading-relaxed">
                        {renderPreview().split('\n').map((line, index) => {
                          const processedLine = line.split(/\*([^*]+)\*/g).map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          );
                          return (
                            <span key={index}>
                              {processedLine}
                              {index < renderPreview().split('\n').length - 1 && <br />}
                            </span>
                          );
                        })}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-[#8696a0]">20:00</span>
                        <svg className="w-4 h-4 text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[#8696a0] text-sm mt-20">
                      Digite uma mensagem para visualizar o preview
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-2">
                  <span className="text-[#8696a0] text-xl">+</span>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <span className="text-[#8696a0] text-sm">Mensagem</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#8696a0]">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3.2"/>
                      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                    </svg>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
