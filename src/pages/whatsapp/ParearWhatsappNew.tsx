import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";

export default function ParearWhatsappNew() {
  const {
    session,
    connecting,
    connect,
    disconnect,
    checkStatus,
    isConnected,
  } = useEvolutionAPISimple();

  useEffect(() => {
    document.title = "Parear WhatsApp | Tech Play";
    checkStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bom Dia, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>/</span>
          <span className="text-purple-400">WhatsApp</span>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-green-500 mb-3">Parear WhatsApp</h2>
          <p className="text-foreground text-sm mb-1">Aponte seu celular para o QR Code até que complete o pareamento</p>
          <p className="text-orange-400 text-sm mb-1">Após o pareamento ficar ativo em seu aparelho celular, aguarde a confirmação automática</p>
          <p className="text-muted-foreground text-sm">Se tudo ocorrer corretamente, a sessão será ativada automaticamente.</p>
        </CardContent>
      </Card>

      {/* QR Code / Connection Status Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Api WhatsApp</h2>
            
            {isConnected ? (
              <>
                <p className="text-muted-foreground mb-6">Sessão já conectada.</p>
                {session?.phoneNumber && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Número: {session.phoneNumber}
                  </p>
                )}
                {session?.profileName && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Nome: {session.profileName}
                  </p>
                )}
                <div className="relative">
                  <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-20 h-20 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse opacity-50" />
                </div>
                <Button 
                  onClick={disconnect}
                  className="mt-8 bg-destructive hover:bg-destructive/90"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  {session?.status === 'connecting' ? 'Escaneie o QR Code para conectar.' : 'Use o QR Code para conectar.'}
                </p>
                
                {session?.qrCode ? (
                  <div className="bg-white p-4 rounded-lg">
                    <img 
                      src={session.qrCode.startsWith('data:') ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-[200px] h-[200px]"
                    />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center">
                    {connecting ? (
                      <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Button onClick={connect} className="bg-green-600 hover:bg-green-700">
                        Conectar WhatsApp
                      </Button>
                    )}
                  </div>
                )}
                
                {session?.qrCode && (
                  <div className="flex gap-3 mt-8">
                    <Button 
                      onClick={connect}
                      variant="outline"
                      disabled={connecting}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                      Gerar Novo QR
                    </Button>
                    <Button 
                      onClick={disconnect}
                      variant="destructive"
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
    </div>
  );
}
