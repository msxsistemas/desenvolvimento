import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, Wifi, WifiOff, Crown, Rocket, Zap, Shield, Gauge, QrCode, LogOut } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { useZAPI } from "@/hooks/useZAPI";
import { Badge } from "@/components/ui/badge";

type WhatsAppProvider = 'evolution' | 'zapi';

// Provider selection card component
function ProviderCard({
  name,
  subtitle,
  icon: Icon,
  iconBg,
  badgeLabel,
  badgeColor,
  features,
  selected,
  onSelect,
  borderColor,
}: {
  name: string;
  subtitle: string;
  icon: any;
  iconBg: string;
  badgeLabel: string;
  badgeColor: string;
  features: string[];
  selected: boolean;
  onSelect: () => void;
  borderColor: string;
}) {
  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
        selected
          ? `${borderColor} shadow-lg shadow-primary/10`
          : 'border-border hover:border-muted-foreground/30'
      }`}
      style={{ background: 'hsl(var(--card))' }}
      onClick={onSelect}
    >
      {/* Badge */}
      <div className="absolute -top-3 right-4">
        <Badge className={`${badgeColor} text-xs font-bold px-3 py-1`}>
          {badgeLabel} <Zap className="h-3 w-3 ml-1" />
        </Badge>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-4 mt-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Select Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`w-full ${
          selected
            ? `${borderColor.replace('border-', 'bg-').replace('/60', '')} text-white`
            : 'bg-transparent border-2 border-muted-foreground/30 text-foreground hover:bg-muted'
        }`}
        variant={selected ? "default" : "outline"}
      >
        <Icon className="h-4 w-4 mr-2" />
        {selected ? `${name} Ativa` : `Selecionar ${name}`}
      </Button>
    </div>
  );
}

// Connection area component
function ConnectionArea({
  provider,
  activeHook,
}: {
  provider: WhatsAppProvider;
  activeHook: any;
}) {
  const { session, connecting, connect, disconnect, isConnected, hydrated } = activeHook;

  if (!hydrated) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando status da sessão...</p>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {/* Status badge */}
        <Badge className="bg-success/20 text-success border-success/30 mb-6 px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
          Open
        </Badge>

        {/* Connected card */}
        <div className="border-2 border-success/30 rounded-xl p-8 max-w-sm w-full text-center" style={{ background: 'hsl(var(--card))' }}>
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-9 w-9 text-success-foreground" strokeWidth={2} />
          </div>

          <h2 className="text-xl font-bold text-success mb-2">WhatsApp Conectado!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            Sua instância está ativa e funcionando perfeitamente via {provider === 'zapi' ? 'Z-API' : 'Evolution API'}.
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

          <Button
            onClick={disconnect}
            variant="destructive"
            className="mt-6"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </div>
      </div>
    );
  }

  // Disconnected / QR Code state
  return (
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
        </>
      ) : (
        <div className="w-[220px] h-[220px] bg-muted rounded-xl flex items-center justify-center">
          {connecting ? (
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <Button
              onClick={connect}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Gerar QR Code
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParearWhatsappNew() {
  const [provider, setProvider] = useState<WhatsAppProvider>(() => {
    return (localStorage.getItem('whatsapp_provider') as WhatsAppProvider) || 'evolution';
  });

  const evolution = useEvolutionAPISimple();
  const zapi = useZAPI();

  const activeHook = provider === 'zapi' ? zapi : evolution;
  const { isConnected, hydrated, checkStatus } = activeHook;

  useEffect(() => {
    document.title = "Parear WhatsApp | Gestor MSX";
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsapp_provider', provider);
  }, [provider]);

  useEffect(() => {
    if (hydrated && isConnected) {
      checkStatus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, provider]);

  return (
    <main className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Escolha sua API de Conexão</h1>
        <p className="text-muted-foreground mt-1">
          Selecione a API que deseja utilizar para conectar seu WhatsApp
        </p>
      </div>

      {/* API Ativa indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-sm text-muted-foreground">API Ativa:</span>
          <span className="font-bold text-foreground">
            {provider === 'zapi' ? 'Z-API' : 'Evolution'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkStatus(true)}
          disabled={!hydrated}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${activeHook.connecting ? 'animate-spin' : ''}`} />
          Atualizar Status
        </Button>
      </div>

      {/* Provider Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProviderCard
          name="Evolution"
          subtitle="Evolution API - Estável e confiável"
          icon={Crown}
          iconBg="bg-gradient-to-br from-amber-400 to-amber-600"
          badgeLabel="PREMIUM"
          badgeColor="bg-gradient-to-r from-cyan-500 to-blue-500"
          features={[
            "Ultra estável",
            "Performance máxima",
            "Código de Pareamento",
            "Suporte prioritário",
          ]}
          selected={provider === 'evolution'}
          onSelect={() => setProvider('evolution')}
          borderColor="border-cyan-500/60"
        />
        <ProviderCard
          name="Z-API"
          subtitle="Z-API - Completa e Poderosa"
          icon={Rocket}
          iconBg="bg-gradient-to-br from-purple-400 to-purple-600"
          badgeLabel="MEGA"
          badgeColor="bg-gradient-to-r from-purple-500 to-pink-500"
          features={[
            "Instância automática por usuário",
            "Performance Máxima",
            "Código de Pareamento",
            "Suporte Prioritário",
          ]}
          selected={provider === 'zapi'}
          onSelect={() => setProvider('zapi')}
          borderColor="border-purple-500/60"
        />
      </div>

      {/* Connection Area */}
      <Card className="border-border">
        <CardContent className="p-6">
          <ConnectionArea provider={provider} activeHook={activeHook} />
        </CardContent>
      </Card>
    </main>
  );
}
