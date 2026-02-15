import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, Wifi, WifiOff, Settings } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { useZAPI } from "@/hooks/useZAPI";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ZAPIConfig from "@/components/ZAPIConfig";

type WhatsAppProvider = 'evolution' | 'zapi';

export default function ParearWhatsappNew() {
  const [provider, setProvider] = useState<WhatsAppProvider>(() => {
    return (localStorage.getItem('whatsapp_provider') as WhatsAppProvider) || 'evolution';
  });
  const [showConfig, setShowConfig] = useState(false);

  const evolution = useEvolutionAPISimple();
  const zapi = useZAPI();

  // Use the active provider's data
  const activeHook = provider === 'zapi' ? zapi : evolution;
  const { session, connecting, connect, disconnect, checkStatus, isConnected, hydrated } = activeHook;

  useEffect(() => {
    document.title = "Parear WhatsApp | Tech Play";
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsapp_provider', provider);
  }, [provider]);

  // Check real status on page open
  useEffect(() => {
    if (hydrated && isConnected) {
      checkStatus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, provider]);

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Parear WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Conecte seu WhatsApp para envio automático de mensagens</p>
        </div>
        <div className="flex items-center gap-2">
          {hydrated && (
            <Badge variant={isConnected ? "default" : session?.status === 'connecting' ? "outline" : "secondary"} className={isConnected ? "bg-success text-success-foreground" : session?.status === 'connecting' ? "border-warning text-warning" : ""}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Conectado
                </>
              ) : session?.status === 'connecting' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Conectando
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Desconectado
                </>
              )}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => checkStatus(true)}
            disabled={!hydrated}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Provider Selector */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Tabs value={provider} onValueChange={(v) => setProvider(v as WhatsAppProvider)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">Provedor WhatsApp</h3>
              {provider === 'zapi' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showConfig ? 'Ocultar Config' : 'Configurar Z-API'}
                </Button>
              )}
            </div>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evolution">Evolution API</TabsTrigger>
              <TabsTrigger value="zapi">Z-API</TabsTrigger>
            </TabsList>

            <TabsContent value="zapi">
              {showConfig && (
                <div className="mt-4">
                  <ZAPIConfig
                    onSave={zapi.saveConfig}
                    currentConfig={zapi.config}
                  />
                </div>
              )}
              {!zapi.isConfigured && !zapi.configLoading && !showConfig && (
                <div className="mt-4 p-4 bg-warning/10 rounded-lg text-center">
                  <p className="text-sm text-warning mb-2">Z-API não configurada</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfig(true)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar agora
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              <span className="font-medium text-success">1.</span> Aponte seu celular para o QR Code até que complete o pareamento
            </p>
            <p className="text-warning">
              <span className="font-medium">2.</span> Após o pareamento ficar ativo em seu aparelho celular, aguarde a confirmação automática
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">3.</span> Se tudo ocorrer corretamente, a sessão será ativada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* QR Code / Connection Status */}
      <Card className="border-border">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            {!hydrated ? (
              <>
                <p className="text-muted-foreground mb-6">Carregando status da sessão...</p>
                <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
              </>
            ) : isConnected ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Sessão Ativa</h2>
                  <Badge variant="outline" className="mb-2">
                    {provider === 'zapi' ? 'Z-API' : 'Evolution API'}
                  </Badge>
                  {session?.phoneNumber && (
                    <p className="text-sm text-muted-foreground">
                      Número: <span className="text-foreground">{session.phoneNumber}</span>
                    </p>
                  )}
                  {session?.profileName && (
                    <p className="text-sm text-muted-foreground">
                      Nome: <span className="text-foreground">{session.profileName}</span>
                    </p>
                  )}
                </div>
                
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center">
                    <CheckCircle className="w-14 h-14 text-success-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse opacity-50" />
                </div>
                
                <Button 
                  onClick={disconnect}
                  variant="destructive"
                  size="sm"
                >
                  <WifiOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-2">Conectar WhatsApp</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {session?.status === 'connecting' ? 'Escaneie o QR Code para conectar.' : 'Clique para gerar o QR Code de conexão.'}
                </p>
                
                {session?.qrCode ? (
                  <div className="bg-white p-4 rounded-lg mb-6">
                    <img 
                      src={session.qrCode.startsWith('data:') ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-[200px] h-[200px]"
                    />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center mb-6">
                    {connecting ? (
                      <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Button
                        onClick={connect}
                        className="bg-success hover:bg-success/90 text-success-foreground"
                        disabled={provider === 'zapi' && !zapi.isConfigured}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        Conectar
                      </Button>
                    )}
                  </div>
                )}
                
                {session?.qrCode && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={connect}
                      variant="outline"
                      size="sm"
                      disabled={connecting}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                      Novo QR
                    </Button>
                    <Button 
                      onClick={disconnect}
                      variant="destructive"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
