import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  CheckCircle, 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  LogOut,
  RotateCw,
  Trash2,
  User
} from 'lucide-react';

interface EvolutionSession {
  instanceName: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'close';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

interface EvolutionQRCodeProps {
  session: EvolutionSession | null;
  connecting: boolean;
  isConfigured: boolean;
  onConnect: () => Promise<unknown>;
  onDisconnect: () => Promise<void>;
  onRestart: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCheckStatus: () => Promise<unknown>;
}

export default function EvolutionQRCode({
  session,
  connecting,
  isConfigured,
  onConnect,
  onDisconnect,
  onRestart,
  onDelete,
  onCheckStatus,
}: EvolutionQRCodeProps) {
  const isConnected = session?.status === 'connected';
  const isConnecting = session?.status === 'connecting' || connecting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          Conexão WhatsApp
          {isConnected && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Conectado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConfigured ? (
          <div className="text-center py-8">
            <WifiOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">API não configurada</h3>
            <p className="text-sm text-muted-foreground">
              Configure sua Evolution API na aba "Configuração" para conectar o WhatsApp
            </p>
          </div>
        ) : isConnected ? (
          <div className="text-center space-y-4">
            <div className="w-48 h-48 mx-auto flex items-center justify-center bg-green-50 dark:bg-green-950 rounded-full border-4 border-green-200 dark:border-green-800">
              {session?.profilePicture ? (
                <img 
                  src={session.profilePicture} 
                  alt="Perfil" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <CheckCircle className="h-24 w-24 text-green-600" />
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
                WhatsApp Conectado!
              </h3>
              {session?.profileName && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <User className="h-4 w-4" />
                  {session.profileName}
                </p>
              )}
              {session?.phoneNumber && (
                <p className="text-sm font-medium">{session.phoneNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Instância: {session?.instanceName}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={onCheckStatus} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar Status
              </Button>
              <Button onClick={onRestart} variant="outline" size="sm">
                <RotateCw className="h-4 w-4 mr-1" />
                Reiniciar
              </Button>
              <Button onClick={onDisconnect} variant="outline" size="sm" className="text-orange-600">
                <LogOut className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
              <Button onClick={onDelete} variant="outline" size="sm" className="text-red-600">
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        ) : isConnecting && session?.qrCode ? (
          <div className="text-center space-y-4">
            <div className="w-64 h-64 mx-auto bg-white p-4 rounded-lg border shadow-lg">
              <img 
                src={session.qrCode.startsWith('data:') ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                alt="QR Code WhatsApp" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Aguardando conexão...</span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg max-w-sm mx-auto">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                Escaneie o QR Code com o WhatsApp do seu celular.<br />
                <strong>Menu → Aparelhos conectados → Conectar</strong>
              </p>
            </div>

            <Button onClick={onConnect} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Gerar Novo QR Code
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-64 h-64 mx-auto border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para gerar o QR Code
                </p>
              </div>
            </div>
            
            <Button 
              onClick={onConnect}
              disabled={connecting}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </>
              )}
            </Button>

            <div className="max-w-md mx-auto">
              <h4 className="font-medium mb-2 flex items-center gap-2 justify-center">
                <Smartphone className="h-4 w-4" />
                Como conectar:
              </h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Vá em Menu → Aparelhos conectados</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>Escaneie o QR Code que aparecerá</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
