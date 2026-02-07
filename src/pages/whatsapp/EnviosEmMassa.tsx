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
import { Home } from "lucide-react";
import { toast } from "sonner";
import { useClientes } from "@/hooks/useDatabase";

export default function EnviosEmMassa() {
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [destinatarios, setDestinatarios] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviarWebhook, setEnviarWebhook] = useState(false);
  const [sending, setSending] = useState(false);

  const { buscar: buscarClientes } = useClientes();

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

    setSending(true);
    try {
      // Implement bulk sending logic here
      toast.success("Mensagens adicionadas à fila de envio!");
    } catch (error) {
      toast.error("Erro ao enviar mensagens");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bom Dia, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Home className="h-4 w-4" />
          <span>/</span>
          <span className="text-purple-400">Envios em Massa</span>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3c]">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Envios De Mensagens Em Massa</h2>
          <p className="text-muted-foreground text-sm mb-6">Faça envio de mensagens para os seus clientes!</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-6">
              {/* Message Type */}
              <div className="space-y-2">
                <Label className="text-white">Escolha o tipo de mensagem que deseja enviar!</Label>
                <Select value={tipoMensagem} onValueChange={setTipoMensagem}>
                  <SelectTrigger className="bg-[#252538] border-[#3a3a4c] text-white">
                    <SelectValue placeholder="Clique aqui para escolher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informativo">Informativo</SelectItem>
                    <SelectItem value="promocional">Promocional</SelectItem>
                    <SelectItem value="cobranca">Cobrança</SelectItem>
                    <SelectItem value="aviso">Aviso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label className="text-white">Para quem deseja enviar a mensagem?</Label>
                <Select value={destinatarios} onValueChange={setDestinatarios}>
                  <SelectTrigger className="bg-[#252538] border-[#3a3a4c] text-white">
                    <SelectValue placeholder="Clique aqui para selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Clientes</SelectItem>
                    <SelectItem value="ativos">Clientes Ativos</SelectItem>
                    <SelectItem value="vencidos">Clientes Vencidos</SelectItem>
                    <SelectItem value="vence_hoje">Vence Hoje</SelectItem>
                    <SelectItem value="vence_amanha">Vence Amanhã</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-white font-semibold">Mensagem</Label>
                <p className="text-sm text-muted-foreground">Utilize as seguintes chaves para obter os valores:</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {availableKeys.map((key) => (
                    <span key={key} className="text-orange-400 text-xs">{key}</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Utilize <span className="text-orange-400">{"{nome_cliente_indicado}"}</span> <span className="text-orange-400">{"{valor_indicacao}"}</span> somente na mensagem de indicação.
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Utilize <span className="text-orange-400">{"{br}"}</span> para quebra de linha.
                </p>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[150px]"
                  placeholder="Digite sua mensagem aqui..."
                />
              </div>

              {/* Webhook Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-white">Enviar apenas por Webhook:</Label>
                  <Switch
                    checked={enviarWebhook}
                    onCheckedChange={setEnviarWebhook}
                  />
                </div>
                <p className="text-cyan-400 text-sm">
                  Caso ative essa opção as mensagens em massa não serão enviadas para a fila do whatsapp
                </p>
              </div>

              {/* Send Button */}
              <Button 
                onClick={handleEnviar}
                disabled={sending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {sending ? "Enviando..." : "Adicionar Mensagem"}
              </Button>
            </div>

            {/* WhatsApp Preview */}
            <div className="flex justify-center">
              <div className="w-[280px] bg-[#111b21] rounded-2xl overflow-hidden shadow-xl">
                {/* Phone Header */}
                <div className="bg-[#202c33] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs">TIM</span>
                    <span className="text-white text-xs">📶</span>
                  </div>
                  <span className="text-white text-xs">20:00</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs">📡</span>
                    <span className="text-white text-xs">🔋 22%</span>
                  </div>
                </div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-[#2a3942]">
                  <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🅖</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-medium">GESTORv3</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#8696a0]">
                    <span>📹</span>
                    <span>📞</span>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="h-[400px] bg-[#0b141a] p-4 overflow-y-auto" 
                     style={{ backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FABGxAg0lKKvmAAAAAElFTkSuQmCC')", backgroundRepeat: "repeat" }}>
                  {mensagem && (
                    <div className="bg-[#005c4b] rounded-lg p-3 max-w-[90%] ml-auto">
                      <p className="text-white text-xs whitespace-pre-wrap">{mensagem}</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-2">
                  <span className="text-[#8696a0]">+</span>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <span className="text-[#8696a0] text-sm">Message</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <span>🔄</span>
                    <span>📷</span>
                    <span>🎤</span>
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
