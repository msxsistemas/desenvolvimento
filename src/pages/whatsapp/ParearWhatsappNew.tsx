import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, RefreshCw, Settings, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import QRCode from "react-qr-code";

export default function ParearWhatsappNew() {
  const {
    config,
    session,
    connecting,
    isConfigured,
    connectInstance,
    checkStatus,
    disconnect,
    deleteInstance,
    saveConfig,
    testConnection,
    isConnected,
  } = useEvolutionAPI();

  const [showConfig, setShowConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configForm, setConfigForm] = useState({
    apiUrl: "",
    apiKey: "",
    instanceName: "",
  });
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    document.title = "Parear WhatsApp | Tech Play";
    if (isConfigured) {
      checkStatus();
      setConfigForm({
        apiUrl: config?.apiUrl || "",
        apiKey: config?.apiKey || "",
        instanceName: config?.instanceName || "",
      });
    }
  }, [isConfigured, config]);

  const handleConnect = async () => {
    if (!isConfigured) {
      toast.error("Configure a Evolution API primeiro");
      setShowConfig(true);
      return;
    }
    await connectInstance();
  };

  const handleDisconnect = async () => {
    try {
      await deleteInstance();
      toast.success("Sessão excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir sessão");
    }
  };

  const handleSaveConfig = async () => {
    if (!configForm.apiUrl || !configForm.apiKey || !configForm.instanceName) {
      toast.error("Preencha todos os campos");
      return;
    }
    const success = await saveConfig(configForm);
    if (success) {
      setShowConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!configForm.apiUrl || !configForm.apiKey) {
      toast.error("Preencha URL e API Key para testar");
      return;
    }
    setTestingConnection(true);
    await testConnection(configForm);
    setTestingConnection(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parear WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure e conecte seu WhatsApp</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowConfig(!showConfig)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {showConfig ? "Ocultar Config" : "Configurar API"}
        </Button>
      </div>

      {/* Configuration Form */}
      {showConfig && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Configuração Evolution API</h2>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input
                  id="apiUrl"
                  placeholder="https://sua-evolution-api.com"
                  value={configForm.apiUrl}
                  onChange={(e) => setConfigForm({ ...configForm, apiUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="Sua chave de API"
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância</Label>
                <Input
                  id="instanceName"
                  placeholder="minha-instancia"
                  value={configForm.instanceName}
                  onChange={(e) => setConfigForm({ ...configForm, instanceName: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  "Testar Conexão"
                )}
              </Button>
              <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700">
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-green-500 mb-4">Parear WhatsApp</h2>
          <p className="text-foreground mb-1">Aponte seu celular para o QR Code até que complete o pareamento</p>
          <p className="text-orange-400 text-sm mb-1">Após o pareamento ficar ativo em seu aparelho celular, clique no botão Fechar</p>
          <p className="text-muted-foreground text-sm">Se tudo ocorreu de forma correta irá aparecer que a sessão está ativa.</p>
        </CardContent>
      </Card>

      {/* QR Code / Connection Status Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Nova Api WhatsApp GestorV3</h2>
        
        {isConnected ? (
          <>
            <p className="text-muted-foreground mb-6">Sessão já conectada.</p>
            <div className="relative">
              <div className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-24 h-24 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse opacity-50" />
            </div>
            <Button 
              onClick={handleDisconnect}
              className="mt-8 bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Excluir Sessão
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">Use o QR Code para conectar.</p>
            {session?.qrCode ? (
              <div className="bg-white p-4 rounded-lg">
                <QRCode value={session.qrCode} size={200} />
              </div>
            ) : (
              <div className="w-[200px] h-[200px] bg-white rounded-lg flex items-center justify-center">
                {connecting ? (
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                ) : (
                  <Button onClick={handleConnect} variant="outline">
                    Gerar QR Code
                  </Button>
                )}
              </div>
            )}
            {session?.qrCode && (
              <Button 
                onClick={handleDisconnect}
                className="mt-8 bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Excluir Sessão
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
