import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { Badge } from "@/components/ui/badge";

export default function ParearWhatsappNew() {
  const {
    session,
    connecting,
    connect,
    disconnect,
    checkStatus,
    isConnected,
    hydrated,
  } = useEvolutionAPISimple();

  useEffect(() => {
    document.title = "Parear WhatsApp | Tech Play";
  }, []);

  // Verificar status real com a Evolution API ao abrir a página
  useEffect(() => {
    if (hydrated && isConnected) {
      checkStatus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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
                      <Button onClick={connect} className="bg-success hover:bg-success/90 text-success-foreground">
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
