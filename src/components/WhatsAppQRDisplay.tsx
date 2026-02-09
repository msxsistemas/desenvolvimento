import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, CheckCircle } from "lucide-react";

interface WhatsAppQRDisplayProps {
  qrCode?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  onRefresh: () => void;
  connecting: boolean;
}

export default function WhatsAppQRDisplay({ 
  qrCode, 
  status, 
  onRefresh, 
  connecting 
}: WhatsAppQRDisplayProps) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (status === 'connecting' && qrCode) {
      setCountdown(120);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onRefresh();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, qrCode, onRefresh]);

  if (status === 'connected') {
    return (
      <div className="text-center space-y-4">
        <div className="w-64 h-64 mx-auto flex items-center justify-center bg-success/10 rounded-lg border border-success/20">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-success mb-2" />
            <h3 className="text-lg font-medium text-success">WhatsApp Conectado!</h3>
            <p className="text-sm text-success/80">Pronto para enviar mensagens</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 text-center space-y-4">
        {qrCode && status === 'connecting' ? (
          <>
            <div className="w-64 h-64 mx-auto bg-foreground p-4 rounded-lg border shadow-lg">
              {qrCode.startsWith('data:image') ? (
                <img 
                  src={qrCode} 
                  alt="QR Code para conectar WhatsApp" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded text-xs font-mono break-all">
                  {qrCode}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm font-medium">Aguardando conexão...</span>
              </div>
              
              {countdown > 0 && (
                <p className="text-xs text-muted-foreground">
                  QR Code expira em {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-xs text-primary">
                <strong>⚡ Conexão 100% Real:</strong><br />
                Escaneie o QR Code com seu WhatsApp para conectar diretamente
              </p>
            </div>

            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={connecting}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
              Gerar Novo QR
            </Button>
          </>
        ) : (
          <>
            <div className="w-64 h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para gerar o QR Code
                </p>
              </div>
            </div>
            
            <Button 
              onClick={onRefresh}
              disabled={connecting}
              size="lg"
              className="flex items-center gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success-foreground"></div>
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  Conectar WhatsApp Real
                </>
              )}
            </Button>
          </>
        )}

        <div className="text-left max-w-sm space-y-2">
          <h4 className="font-medium text-sm">Como conectar:</h4>
          <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Vá em Menu → Aparelhos conectados</li>
            <li>Toque em "Conectar um aparelho"</li>
            <li>Escaneie o QR Code acima</li>
            <li>Aguarde a confirmação de conexão</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
