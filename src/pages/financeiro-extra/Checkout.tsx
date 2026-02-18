import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, QrCode, Settings, Building2, Zap, ShieldCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssas } from "@/hooks/useAssas";
import { useV3Pay } from "@/hooks/useV3Pay";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface GatewayInfo {
  id: string;
  label: string;
  configured: boolean;
}

export default function Checkout() {
  const { toast } = useToast();
  const { isConfigured: asaasConfigured } = useAssas();
  const { isConfigured: v3payConfigured } = useV3Pay();
  const { user } = useCurrentUser();
  const [pixEnabled, setPixEnabled] = useState(false);
  const [creditCardEnabled, setCreditCardEnabled] = useState(false);
  const [pixManualEnabled, setPixManualEnabled] = useState(false);
  const [pixManualKey, setPixManualKey] = useState("");
  const [gatewayAtivo, setGatewayAtivo] = useState("asaas");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [ciabraConfigured, setCiabraConfigured] = useState(false);
  const [mercadoPagoConfigured, setMercadoPagoConfigured] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadAllConfigs();
  }, [user?.id]);

  const loadAllConfigs = async () => {
    if (!user?.id) return;
    const [checkoutResult, ciabra, mp] = await Promise.all([
      supabase.from('checkout_config').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('ciabra_config').select('is_configured').eq('user_id', user.id).maybeSingle(),
      supabase.from('mercadopago_config').select('is_configured').eq('user_id', user.id).maybeSingle(),
    ]);

    setCiabraConfigured(!!(ciabra.data as any)?.is_configured);
    setMercadoPagoConfigured(!!(mp.data as any)?.is_configured);

    if (checkoutResult.data) {
      const data = checkoutResult.data;
      setPixEnabled(data.pix_enabled);
      setCreditCardEnabled(data.credit_card_enabled);
      setPixManualEnabled(data.pix_manual_enabled);
      setPixManualKey(data.pix_manual_key || "");
      setGatewayAtivo((data as any).gateway_ativo || "asaas");
    }
    setInitialLoading(false);
  };

  useEffect(() => {
    document.title = "Checkout – Pagamentos | Gestor IPTV";
  }, []);

  const gateways: GatewayInfo[] = [
    { id: "asaas", label: "Asaas", configured: asaasConfigured },
    { id: "mercadopago", label: "Mercado Pago", configured: mercadoPagoConfigured },
    { id: "ciabra", label: "Ciabra", configured: ciabraConfigured },
    { id: "v3pay", label: "V3Pay", configured: v3payConfigured },
  ];

  const configuredGateways = gateways.filter(g => g.configured);

  const handleSave = async () => {
    if (!user?.id) {
      toast({ title: "Erro", description: "Você precisa estar logado para salvar as configurações.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const configData = {
        user_id: user.id,
        pix_enabled: pixEnabled && configuredGateways.length > 0,
        credit_card_enabled: creditCardEnabled,
        pix_manual_enabled: pixManualEnabled,
        pix_manual_key: pixManualEnabled ? pixManualKey.trim() || null : null,
        gateway_ativo: gatewayAtivo,
      };

      const { error } = await supabase
        .from('checkout_config')
        .upsert(configData as any, { onConflict: 'user_id', ignoreDuplicates: false });

      if (error) {
        console.error('Erro ao salvar:', error);
        toast({ title: "Erro", description: "Erro ao salvar configurações. Tente novamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Configurações salvas", description: "As preferências do checkout foram atualizadas com sucesso." });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: "Erro", description: "Erro ao salvar configurações. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Configuração do Checkout</h1>
            <p className="text-sm text-muted-foreground">Gerencie os métodos de pagamento dos seus clientes.</p>
          </div>
        </div>
      </div>

      {/* Gateway Selection */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Gateway de Pagamento</span>
        </div>
        <CardContent className="p-5 space-y-4">
          {configuredGateways.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-5 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <Zap className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum gateway configurado</p>
                <p className="text-xs text-muted-foreground mt-1">Configure pelo menos um gateway para ativar pagamentos automáticos.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {[
                  { label: "Asaas", href: "/configuracoes/asaas" },
                  { label: "Mercado Pago", href: "/configuracoes/mercado-pago" },
                  { label: "Ciabra", href: "/configuracoes/ciabra" },
                  { label: "V3Pay", href: "/configuracoes/v3pay" },
                ].map(g => (
                  <a
                    key={g.label}
                    href={g.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-200"
                  >
                    {g.label}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gateway Ativo</label>
                <Select value={gatewayAtivo} onValueChange={setGatewayAtivo}>
                  <SelectTrigger className="w-full sm:w-56 h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredGateways.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {gateways.map((g) => (
                  <Badge
                    key={g.id}
                    variant={g.configured ? (g.id === gatewayAtivo ? "default" : "secondary") : "outline"}
                    className={`text-[11px] px-2.5 py-0.5 font-medium transition-all duration-200 ${
                      g.id === gatewayAtivo && g.configured
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : ""
                    }`}
                  >
                    {g.configured && g.id === gatewayAtivo && (
                      <ShieldCheck className="h-3 w-3 mr-1" />
                    )}
                    {g.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Métodos de Pagamento</span>
        </div>
        <CardContent className="p-5 space-y-3">
          {/* PIX Toggle */}
          <div
            className={`group rounded-xl border px-4 py-3.5 flex items-center justify-between transition-all duration-200 ${
              pixEnabled && configuredGateways.length > 0
                ? "border-success/30 bg-success/5"
                : "border-border/60 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                pixEnabled && configuredGateways.length > 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}>
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">PIX Automático</span>
                <p className="text-[11px] text-muted-foreground">Gera QR code via gateway</p>
              </div>
            </div>
            <Switch
              checked={pixEnabled}
              onCheckedChange={setPixEnabled}
              id="pix-toggle"
              disabled={configuredGateways.length === 0}
            />
          </div>

          {/* Credit Card Toggle */}
          <div
            className={`group rounded-xl border px-4 py-3.5 flex items-center justify-between transition-all duration-200 ${
              creditCardEnabled
                ? "border-primary/30 bg-primary/5"
                : "border-border/60 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                creditCardEnabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Cartão de Crédito</span>
                <p className="text-[11px] text-muted-foreground">Aceite pagamentos por cartão</p>
              </div>
            </div>
            <Switch
              checked={creditCardEnabled}
              onCheckedChange={setCreditCardEnabled}
              id="credit-card-toggle"
            />
          </div>

          {pixEnabled && configuredGateways.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <p className="text-xs text-success font-medium">
                PIX ativo via {gateways.find(g => g.id === gatewayAtivo)?.label}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-8 h-10 font-semibold shadow-sm"
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
