import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import QRCode from "react-qr-code";

export default function ParearWhatsappNew() {
  const {
    session,
    connecting,
    isConfigured,
    connectInstance,
    checkStatus,
    disconnect,
    deleteInstance,
    isConnected,
  } = useEvolutionAPI();

  const [showingQR, setShowingQR] = useState(false);

  useEffect(() => {
    document.title = "Parear WhatsApp | Tech Play";
    if (isConfigured) {
      checkStatus();
    }
  }, [isConfigured]);

  const handleConnect = async () => {
    setShowingQR(true);
    await connectInstance();
  };

  const handleDisconnect = async () => {
    try {
      await deleteInstance();
      setShowingQR(false);
      toast.success("Sessão excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir sessão");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bom Dia, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>/</span>
          <span className="text-purple-400">WhatsApp</span>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3c]">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-green-400 mb-4">Parear WhatsApp</h2>
          <p className="text-white mb-1">Aponte seu celular para o QR Code até que complete o pareamento</p>
          <p className="text-orange-400 text-sm mb-1">Após o pareamento ficar ativo em seu aparelho celular, clique no botão Fechar</p>
          <p className="text-muted-foreground text-sm">Se tudo ocorreu de forma correta irá aparecer que a sessão está ativa.</p>
        </CardContent>
      </Card>

      {/* QR Code / Connection Status Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Nova Api WhatsApp GestorV3</h2>
        
        {isConnected ? (
          <>
            <p className="text-muted-foreground mb-6">Sessão já conectada.</p>
            <div className="relative">
              <div className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-24 h-24 text-white" strokeWidth={1.5} />
              </div>
              {/* Animated ring */}
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
