import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import QRCode from "react-qr-code";

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
        <h1 className="text-2xl font-bold text-foreground">Parear WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">Conecte seu WhatsApp para enviar mensagens</p>
      </div>

      {/* Instructions Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-green-500 mb-4">Parear WhatsApp</h2>
          <p className="text-foreground mb-1">Aponte seu celular para o QR Code até que complete o pareamento</p>
          <p className="text-orange-400 text-sm mb-1">Após o pareamento ficar ativo em seu aparelho celular, aguarde a confirmação</p>
          <p className="text-muted-foreground text-sm">Se tudo ocorreu de forma correta irá aparecer que a sessão está ativa.</p>
        </CardContent>
      </Card>

      {/* QR Code / Connection Status Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Conexão WhatsApp</h2>
        
        {isConnected ? (
          <>
            <p className="text-muted-foreground mb-6">Sessão conectada</p>
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
              <div className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-24 h-24 text-white" strokeWidth={1.5} />
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
              {session?.status === 'connecting' ? 'Escaneie o QR Code' : 'Clique em conectar para gerar o QR Code'}
            </p>
            
            {session?.qrCode ? (
              <div className="bg-white p-4 rounded-lg">
                <QRCode value={session.qrCode} size={200} />
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
    </div>
  );
}
