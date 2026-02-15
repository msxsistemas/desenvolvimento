import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, Crown, Rocket, Zap, ArrowLeft, QrCode, LogOut } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { useZAPI } from "@/hooks/useZAPI";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type WhatsAppProvider = 'evolution' | 'zapi';
type PageView = 'select' | 'connect';

function ProviderCard({
  name, subtitle, icon: Icon, iconBg, badgeLabel, badgeColor, features, onSelect, borderColor,
}: {
  name: string; subtitle: string; icon: any; iconBg: string; badgeLabel: string;
  badgeColor: string; features: string[]; onSelect: () => void; borderColor: string;
}) {
  return (
    <div
      className={`relative rounded-xl border-2 ${borderColor} p-6 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg`}
      style={{ background: 'hsl(var(--card))' }}
      onClick={onSelect}
    >
      <div className="absolute -top-3 right-4">
        <Badge className={`${badgeColor} text-xs font-bold px-3 py-1`}>
          {badgeLabel} <Zap className="h-3 w-3 ml-1" />
        </Badge>
      </div>

      <div className="flex justify-center mb-4 mt-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <ul className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`w-full ${badgeColor} text-white`}
      >
        <Icon className="h-4 w-4 mr-2" />
        Selecionar {name}
      </Button>
    </div>
  );
}

function ConnectionPage({
  provider, activeHook, onBack, switching,
}: {
  provider: WhatsAppProvider; activeHook: any; onBack: () => void; switching: boolean;
}) {
  const { session, connecting, connect, disconnect, isConnected, hydrated, checkStatus } = activeHook;
  const providerName = provider === 'zapi' ? 'Z-API' : 'Evolution API';

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={switching}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Trocar API
        </Button>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-sm text-muted-foreground">API Ativa:</span>
          <span className="font-bold text-foreground">{providerName}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => checkStatus(true)} disabled={!hydrated || switching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-8">
          {switching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Desconectando API anterior...</p>
            </div>
          ) : !hydrated ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Carregando status da sessão...</p>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Badge className="bg-success/20 text-success border-success/30 mb-6 px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                Conectado
              </Badge>

              <div className="border-2 border-success/30 rounded-xl p-8 max-w-sm w-full text-center" style={{ background: 'hsl(var(--card))' }}>
                <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-9 w-9 text-success-foreground" strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-success mb-2">WhatsApp Conectado!</h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Sua instância está ativa e funcionando perfeitamente via {providerName}.
                </p>
                {session?.phoneNumber && (
                  <p className="text-sm text-muted-foreground">
                    Número: <span className="text-foreground font-medium">{session.phoneNumber}</span>
                  </p>
                )}
                {session?.profileName && (
                  <p className="text-sm text-muted-foreground">
                    Nome: <span className="text-foreground font-medium">{session.profileName}</span>
                  </p>
                )}
                <Button onClick={disconnect} variant="destructive" className="mt-6">
                  <LogOut className="h-4 w-4 mr-2" /> Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <h2 className="text-lg font-semibold text-foreground mb-2">Conectar WhatsApp</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {session?.status === 'connecting'
                  ? 'Escaneie o QR Code com seu WhatsApp para conectar.'
                  : 'Clique para gerar o QR Code de conexão.'}
              </p>

              {session?.qrCode ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                    <img
                      src={session.qrCode.startsWith('data:') ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-[220px] h-[220px]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={connect} variant="outline" size="sm" disabled={connecting}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                      Novo QR
                    </Button>
                    <Button onClick={disconnect} variant="destructive" size="sm">
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-[220px] h-[220px] bg-muted rounded-xl flex items-center justify-center">
                  {connecting ? (
                    <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Button onClick={connect} className="bg-success hover:bg-success/90 text-success-foreground">
                      <QrCode className="h-4 w-4 mr-2" /> Gerar QR Code
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              <span className="font-medium text-success">1.</span> Aponte seu celular para o QR Code até que complete o pareamento
            </p>
            <p className="text-warning">
              <span className="font-medium">2.</span> Após o pareamento ficar ativo, aguarde a confirmação automática
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">3.</span> Se tudo ocorrer corretamente, a sessão será ativada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ParearWhatsappNew() {
  const [provider, setProvider] = useState<WhatsAppProvider | null>(() => {
    return (localStorage.getItem('whatsapp_provider') as WhatsAppProvider) || null;
  });
  const [view, setView] = useState<PageView>('select');
  const [switching, setSwitching] = useState(false);

  const evolution = useEvolutionAPISimple();
  const zapi = useZAPI();

  const activeHook = provider === 'zapi' ? zapi : evolution;

  // Auto-detect connected provider and go directly to connect view
  useEffect(() => {
    if (evolution.hydrated && zapi.hydrated) {
      if (evolution.isConnected) {
        setProvider('evolution');
        localStorage.setItem('whatsapp_provider', 'evolution');
        setView('connect');
      } else if (zapi.isConnected) {
        setProvider('zapi');
        localStorage.setItem('whatsapp_provider', 'zapi');
        setView('connect');
      }
    }
  }, [evolution.hydrated, zapi.hydrated, evolution.isConnected, zapi.isConnected]);

  useEffect(() => {
    document.title = "Parear WhatsApp | Gestor MSX";
  }, []);

  useEffect(() => {
    if (provider) localStorage.setItem('whatsapp_provider', provider);
  }, [provider]);

  const disconnectOther = useCallback(async (selectedProvider: WhatsAppProvider) => {
    const otherHook = selectedProvider === 'zapi' ? evolution : zapi;
    if (otherHook.isConnected) {
      setSwitching(true);
      try {
        await otherHook.disconnect();
        toast.success('API anterior desconectada');
      } catch (e) {
        console.error('Erro ao desconectar API anterior:', e);
      } finally {
        setSwitching(false);
      }
    }
  }, [evolution, zapi]);

  const handleSelectProvider = useCallback(async (p: WhatsAppProvider) => {
    await disconnectOther(p);
    setProvider(p);
    setView('connect');
  }, [disconnectOther]);

  const handleBack = useCallback(async () => {
    // Disconnect current provider before going back
    if (activeHook.isConnected) {
      setSwitching(true);
      try {
        await activeHook.disconnect();
        toast.success('WhatsApp desconectado');
      } catch (e) {
        console.error('Erro ao desconectar:', e);
      } finally {
        setSwitching(false);
      }
    }
    setView('select');
  }, [activeHook]);

  if (view === 'connect' && provider) {
    return (
      <main className="py-4">
        <ConnectionPage
          provider={provider}
          activeHook={activeHook}
          onBack={handleBack}
          switching={switching}
        />
      </main>
    );
  }

  return (
    <main className="space-y-6 max-w-4xl mx-auto py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Escolha sua API de Conexão</h1>
        <p className="text-muted-foreground mt-1">
          Selecione a API que deseja utilizar para conectar seu WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProviderCard
          name="Evolution"
          subtitle="API Premium - Ultra estável e rápida"
          icon={Crown}
          iconBg="bg-gradient-to-br from-amber-400 to-amber-600"
          badgeLabel="PREMIUM"
          badgeColor="bg-gradient-to-r from-cyan-500 to-blue-500"
          features={["Ultra estável", "Performance máxima", "Código de Pareamento", "Suporte prioritário"]}
          onSelect={() => handleSelectProvider('evolution')}
          borderColor="border-cyan-500/40"
        />
        <ProviderCard
          name="Z-API"
          subtitle="API Mega - Completa e Poderosa"
          icon={Rocket}
          iconBg="bg-gradient-to-br from-purple-400 to-purple-600"
          badgeLabel="MEGA"
          badgeColor="bg-gradient-to-r from-purple-500 to-pink-500"
          features={["Instância automática por usuário", "Performance Máxima", "Código de Pareamento", "Suporte Prioritário"]}
          onSelect={() => handleSelectProvider('zapi')}
          borderColor="border-purple-500/40"
        />
      </div>
    </main>
  );
}
