import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, AlertCircle, Settings, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useClientes } from "@/hooks/useDatabase";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import EvolutionAPIConfig from "@/components/EvolutionAPIConfig";
import EvolutionQRCode from "@/components/EvolutionQRCode";

export default function ParearWhatsapp() {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do sistema.");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);

  const {
    config,
    session,
    loading,
    connecting,
    saveConfig,
    testConnection,
    connectInstance,
    checkStatus,
    sendMessage,
    disconnect,
    restartInstance,
    deleteInstance,
    isConnected,
    isConfigured,
  } = useEvolutionAPI();

  const { buscar: buscarClientes } = useClientes();

  // Verificar status da conexão ao carregar
  useEffect(() => {
    if (isConfigured) {
      checkStatus();
    }
  }, [isConfigured]);

  // SEO
  useEffect(() => {
    document.title = "WhatsApp - Evolution API | Gestor Tech Play";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Conecte seu WhatsApp usando Evolution API para envio automático de mensagens.");
    if (!metaDesc.parentElement) document.head.appendChild(metaDesc);
  }, []);

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    setSendingTest(true);
    try {
      await sendMessage(testPhone, testMessage);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendToAllClients = async () => {
    try {
      const clientes = await buscarClientes();
      if (!clientes?.length) {
        toast.error("Nenhum cliente encontrado");
        return;
      }

      const clientesComWhatsapp = clientes.filter(c => c.whatsapp);
      
      if (!clientesComWhatsapp.length) {
        toast.error("Nenhum cliente com WhatsApp cadastrado");
        return;
      }

      setSendingBulk(true);
      let enviados = 0;
      let erros = 0;

      for (const cliente of clientesComWhatsapp) {
        try {
          const mensagemPersonalizada = testMessage.replace("{nome}", cliente.nome);
          await sendMessage(cliente.whatsapp, mensagemPersonalizada);
          enviados++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Erro ao enviar para ${cliente.nome}:`, error);
          erros++;
        }
      }
      
      toast.success(`${enviados} mensagens enviadas! ${erros > 0 ? `(${erros} erros)` : ''}`);
    } catch (error) {
      toast.error("Erro ao enviar mensagens");
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-green-600" />
          WhatsApp - Evolution API
        </h1>
        <p className="text-muted-foreground">
          Conecte seu WhatsApp usando a Evolution API para envio automático de mensagens
        </p>
      </header>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conexão
            {isConnected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 ml-1">
                Online
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <EvolutionAPIConfig
            currentConfig={config}
            onSave={saveConfig}
            onTest={testConnection}
          />
        </TabsContent>

        <TabsContent value="qrcode">
          <EvolutionQRCode
            session={session}
            connecting={connecting}
            isConfigured={isConfigured}
            onConnect={connectInstance}
            onDisconnect={disconnect}
            onRestart={restartInstance}
            onDelete={deleteInstance}
            onCheckStatus={checkStatus}
          />
        </TabsContent>

        <TabsContent value="send">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Enviar Mensagem de Teste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-phone">Telefone (com código do país)</Label>
                    <Input
                      id="test-phone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="5511999999999"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 5511999999999 (Brasil)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Status da Conexão</Label>
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      {isConnected ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">WhatsApp Conectado</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-700">Não conectado</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-message">Mensagem</Label>
                  <Textarea
                    id="test-message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={4}
                    placeholder="Digite sua mensagem..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{nome}"} para personalizar com o nome do cliente
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleSendTest}
                    disabled={sendingTest || !isConnected || loading || !testPhone}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingTest ? 'Enviando...' : 'Enviar Teste'}
                  </Button>

                  <Button 
                    onClick={handleSendToAllClients}
                    disabled={sendingBulk || !isConnected || loading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingBulk ? 'Enviando...' : 'Enviar para Todos os Clientes'}
                  </Button>
                </div>

                {!isConnected && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Conecte seu WhatsApp na aba "Conexão" antes de enviar mensagens
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas para Envio em Massa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Evite enviar muitas mensagens em curto período para não ser bloqueado</p>
                <p>• O sistema adiciona um intervalo de 2 segundos entre cada mensagem</p>
                <p>• Use mensagens personalizadas com {"{nome}"} para melhor engajamento</p>
                <p>• Certifique-se de que os números estão no formato correto (55 + DDD + número)</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
